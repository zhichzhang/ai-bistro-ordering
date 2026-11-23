// Node.js >= 18. Local-only benchmark: real Express/PostgreSQL, existing mock LLM.
// Every kiosk owns its own cart and chat session; turns are sequential within a kiosk.
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const base = (process.env.BASE_URL || 'http://127.0.0.1:3000/api').replace(/\/$/, '');
const levels = (process.env.LEVELS || '5,10,20,50,100').split(',').map(x => Number(x.trim()));
const repeats = Number(process.env.REPEATS || 3);
const warmups = Number(process.env.WARMUPS || 3);
const timeout = Number(process.env.REQUEST_TIMEOUT_MS || 90000);
const pauseMs = Number(process.env.PAUSE_MS || 1500);
const message = process.env.AI_MESSAGE || 'Add one beef sandwich';
const output = path.resolve('benchmarks/results/performance-baseline');
const safe = /^http:\/\/(127\.0\.0\.1|localhost):\d+\/api$/.test(base);
if (!safe) throw Error('Safety: BASE_URL must be a local loopback URL ending in /api.');
if (!levels.length || levels.some(x => !Number.isInteger(x) || x < 1 || x > 100) ||
    !Number.isInteger(repeats) || repeats < 1 || repeats > 20 ||
    !Number.isInteger(warmups) || warmups < 0 || warmups > 20 ||
    !Number.isInteger(timeout) || timeout < 1000 || timeout > 180000 ||
    !Number.isInteger(pauseMs) || pauseMs < 0 || pauseMs > 60000 ||
    !message || message.length > 2000) throw Error('Invalid benchmark settings.');

const runId = new Date().toISOString().replace(/[-:]/g,'').replace('T','-').replace('Z','').replace('.','-');
const requestRows = [], kioskRows = [], roundRows = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const ms = v => Math.round(v * 100) / 100;
const quantity = data => (data?.items || []).reduce((n,i) => n + Number(i.quantity || 0),0);
const percentile = (values,p) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a,b)=>a-b);
    return ms(sorted[Math.max(0, Math.ceil(p*sorted.length)-1)]);
};
const mean = values => values.length ? ms(values.reduce((a,b)=>a+b,0)/values.length) : null;
const csv = rows => {
    if (!rows.length) return '';
    const keys = [...new Set(rows.flatMap(Object.keys))];
    const escape = value => '"'+String(value ?? '').replaceAll('"','""')+'"';
    return [keys.map(escape).join(','), ...rows.map(row=>keys.map(key=>escape(row[key])).join(','))].join('\r\n')+'\r\n';
};
function save() {
    fs.mkdirSync(output,{recursive:true});
    const files = {
        rounds: path.join(output,`multi-kiosk-${runId}-rounds.csv`),
        kiosks: path.join(output,`multi-kiosk-${runId}-kiosks.csv`),
        requests: path.join(output,`multi-kiosk-${runId}-requests.csv`),
    };
    fs.writeFileSync(files.rounds,csv(roundRows));
    fs.writeFileSync(files.kiosks,csv(kioskRows));
    fs.writeFileSync(files.requests,csv(requestRows));
    console.log(`Rounds CSV: ${files.rounds}`);
    console.log(`Kiosks CSV: ${files.kiosks}`);
    console.log(`Requests CSV: ${files.requests}`);
}

async function request(ctx, label, method, endpoint, body) {
    const started = performance.now();
    let status = 0, data = null, error = '';
    try {
        const res = await fetch(base+endpoint, {
            method,
            headers: body === undefined ? {} : {'content-type':'application/json'},
            body:body === undefined ? undefined : JSON.stringify(body),
            signal:AbortSignal.timeout(timeout),
        });
        status=res.status;
        const content=await res.text();
        try {data=JSON.parse(content);} catch {data={raw:content.slice(0,160)};}
    } catch(e) {error=String(e);}
    const elapsedMs=ms(performance.now()-started);
    if (!ctx.warmup) requestRows.push({runId,level:ctx.level,repeat:ctx.repeat,kiosk:ctx.kiosk,
        label,status,elapsedMs,error,aiStatus:data?.status ?? '',businessCode:data?.error?.code ?? ''});
    return {status,data,error,elapsedMs};
}
function expect(ok, description, response) {
    if (!ok) throw Error(`${description}; HTTP ${response?.status ?? 'n/a'} ${response?.data?.error?.code ?? response?.error ?? ''}`);
}
async function kiosk(level,repeat,index,warmup=false) {
    const ctx={level,repeat,kiosk:index,warmup};
    const started=performance.now();
    const result={runId,level,repeat,kiosk:index,success:false,failedStage:'',error:'',
        cartId:'',sessionId:'',finalQuantity:'',cartStatus:'',revision:'',orderId:'',elapsedMs:0};
    let stage='create_cart';
    try {
        const created=await request(ctx,stage,'POST','/carts',{});
        const cartId=created.data?.cart?.id, sessionId=created.data?.chatSessionId;
        expect(created.status===201 && cartId && sessionId,'Cart/session creation failed',created);
        result.cartId=cartId;result.sessionId=sessionId;
        for(let turn=1; turn<=2; turn++) {
            stage=`ai_turn_${turn}`;
            const ai=await request(ctx,stage,'POST',`/ordering/sessions/${encodeURIComponent(sessionId)}/turn`,{userMessage:message});
            expect(ai.status===200 && ai.data?.status==='success',`${stage} failed`,ai);
        }
        stage='cart_precheckout';
        const before=await request(ctx,stage,'GET',`/carts/${encodeURIComponent(cartId)}`);
        expect(before.status===200 && before.data?.cart?.status==='active' && quantity(before.data)===2,
            'Cart must contain two added items before checkout',before);
        stage='checkout';
        const checked=await request(ctx,stage,'POST',`/carts/${encodeURIComponent(cartId)}/checkout`,{});
        expect(checked.status===200 && checked.data?.success===true && checked.data?.orderId,
            'Checkout failed or missing orderId',checked);
        result.orderId=checked.data.orderId;
        stage='cart_postcheckout';
        const after=await request(ctx,stage,'GET',`/carts/${encodeURIComponent(cartId)}`);
        expect(after.status===200 && after.data?.cart?.status==='submitted' && quantity(after.data)===2,
            'Submitted cart state or quantity invalid',after);
        result.finalQuantity=quantity(after.data);
        result.cartStatus=after.data.cart.status;
        result.revision=after.data.cart.revision;
        result.success=true;
    } catch(e) {result.failedStage=stage;result.error=String(e);}
    result.elapsedMs=ms(performance.now()-started);
    if(!warmup) kioskRows.push(result);
    return result;
}
async function wave(level,repeat,warmup=false) {
    const start=performance.now();
    const results=await Promise.all(Array.from({length:level},(_,i)=>kiosk(level,repeat,i+1,warmup)));
    const elapsedMs=ms(performance.now()-start);
    const successes=results.filter(r=>r.success).length;
    if(warmup) {console.log(`Warmup: ${successes}/${level} successful`);return results;}
    const reqs=requestRows.filter(r=>r.level===level&&r.repeat===repeat);
    const durations=results.map(r=>r.elapsedMs);
    const turnTimes=reqs.filter(r=>r.label.startsWith('ai_turn_')).map(r=>r.elapsedMs);
    const checkoutTimes=reqs.filter(r=>r.label==='checkout').map(r=>r.elapsedMs);
    const errors=reqs.filter(r=>r.status>=500 || r.status===0).length;
    const row={runId,level,repeat,attemptedKiosks:level,successfulOrders:successes,failedOrders:level-successes,
        successRate:ms(100*successes/level),batchElapsedMs:elapsedMs,completedOrdersPerSec:ms(successes/(elapsedMs/1000)),
        requestCount:reqs.length,http5xxOrTransportErrors:errors,
        kioskP50Ms:percentile(durations,.5),kioskP95Ms:percentile(durations,.95),kioskP99Ms:percentile(durations,.99),
        aiP50Ms:percentile(turnTimes,.5),aiP95Ms:percentile(turnTimes,.95),aiP99Ms:percentile(turnTimes,.99),
        checkoutP50Ms:percentile(checkoutTimes,.5),checkoutP95Ms:percentile(checkoutTimes,.95),checkoutP99Ms:percentile(checkoutTimes,.99),
        meanKioskMs:mean(durations),
        stageFailures:JSON.stringify(results.filter(r=>!r.success).map(r=>({kiosk:r.kiosk,stage:r.failedStage,error:r.error.slice(0,150)})))};
    roundRows.push(row);
    console.log(`Kiosks=${level} round=${repeat}: ${successes}/${level} orders, ${elapsedMs}ms wave, ${row.completedOrdersPerSec} orders/s, AI P95=${row.aiP95Ms}ms, checkout P95=${row.checkoutP95Ms}ms`);
    return results;
}

let failed=false;
try {
    for(let i=0;i<warmups;i++) {
        const w=await wave(1,-(i+1),true);
        if(!w[0].success) throw Error(`Warmup failed at ${w[0].failedStage}: ${w[0].error}; check mock mode, database, menu fixture and local server`);
    }
    for(const level of levels) {
        for(let repeat=1;repeat<=repeats;repeat++) {
            const results=await wave(level,repeat);
            if(results.some(r=>!r.success)) failed=true;
            if(pauseMs>0 && (repeat<repeats || level!==levels[levels.length-1])) await sleep(pauseMs);
        }
    }
} catch(e) {failed=true;console.error('Benchmark aborted:',String(e));}
finally {save();}
if(failed) process.exitCode=1;
