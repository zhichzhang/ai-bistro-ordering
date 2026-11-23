// Node >=18. Controlled single-server race probe, using real Express/Prisma and mock model.
// No dependency install required; writes CSV at benchmarks/results/.
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000/api';
const token = process.env.BENCHMARK_TOKEN || '';
const itemId = process.env.MENU_ITEM_ID || 'sandwich_beef';
const repeats = Number(process.env.REPEATS || 2);
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/?$/.test(base)) throw Error('Only local API is allowed');
if (token.length < 16 || !Number.isInteger(repeats) || repeats < 1 || repeats > 100) throw Error('Set BENCHMARK_TOKEN and REPEATS 1..100');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const allRequests = [];
const allRounds = [];
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T','-').replace('Z','').replace('.','-');
const dir = path.resolve('benchmarks/results');
fs.mkdirSync(dir, { recursive: true });

async function request(name, method, endpoint, body = undefined, control = false, round = 0) {
    const start = performance.now();
    let status = 0, response = null, error = '';
    try {
        const r = await fetch(base + endpoint, {
            method, headers: { ...(body === undefined ? {} : {'content-type':'application/json'}),
                ...(control ? {'x-benchmark-token':token} : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(45000),
        });
        status = r.status;
        const text = await r.text();
        try { response = JSON.parse(text); } catch { response = {raw:text.slice(0,500)}; }
    } catch(e) { error = String(e); }
    const elapsedMs = Math.round((performance.now()-start)*100)/100;
    allRequests.push({runId:stamp,round,name,status,elapsedMs,error,businessCode: response?.error?.code || '',
        aiStatus:response?.status || ''});
    return {status,body:response,error,elapsedMs};
}
function ensure(condition, message) { if(!condition) throw Error(message); }
function summary(cart) {
    return { status:cart?.cart?.status, revision:cart?.cart?.revision,
        quantity:cart?.items?.reduce((total,i)=>total+i.quantity,0),
        items: JSON.stringify((cart?.items || []).map(i=>({id:i.id,quantity:i.quantity,menu_item_id:i.menu_item_id})).sort((a,b)=>a.id.localeCompare(b.id))) };
}
async function waitForGate(id,round) {
    for(let i=0;i<200;i++) {
        const s = await request('gate_status','GET',`/__benchmark/mock/gates/${id}`,undefined,true,round);
        if(s.body?.state === 'waiting') return;
        if(s.body?.state === 'expired') throw Error('Mock gate expired');
        await sleep(25);
    }
    throw Error('AI did not reach Mock normalization within 5 seconds');
}
function toCSV(rows) {
    if(!rows.length) return '';
    const keys = [...new Set(rows.flatMap(Object.keys))];
    const esc = value => `"${String(value ?? '').replaceAll('"','""')}"`;
    return [keys.map(esc).join(','), ...rows.map(row=>keys.map(k=>esc(row[k])).join(','))].join('\r\n')+'\r\n';
}
async function round(index) {
    const row = {runId:stamp,round:index,correct:false,setupError:'', aiHttpStatus:0,aiStatus:'',checkoutStatus:0,
        cartStatus:'',beforeRevision:null,afterRevision:null,deltaRevision:null,
        beforeQuantity:null,afterQuantity:null,gateWaiting:false,cartUnchanged:false,assistantMessage:''};
    let gateId = null, aiPromise = null;
    try {
        const created = await request('create_cart','POST','/carts',{},false,index);
        const cartId = created.body?.cart?.id, sessionId = created.body?.chatSessionId;
        ensure(created.status===201 && cartId && sessionId,'Cart setup failed');
        const add = await request('seed_cart','POST',`/carts/${cartId}/items`,{menuItemId:itemId,quantity:2,modifiers:{}},false,index);
        ensure(add.status===201,'Seed item failed: '+add.status);
        const before = summary((await request('before_cart','GET',`/carts/${cartId}`,undefined,false,index)).body);
        row.beforeRevision=before.revision; row.beforeQuantity=before.quantity;
        ensure(before.status==='active' && before.quantity===2,'Unexpected initial cart');
        const armed = await request('arm_gate','POST','/__benchmark/mock/gates',{stage:'normalization'},true,index);
        gateId=armed.body?.gateId;
        ensure(armed.status===201 && gateId,'Cannot arm mock gate');
        aiPromise = request('ai_turn','POST',`/ordering/sessions/${sessionId}/turn`,{userMessage:'Add one beef sandwich'},false,index);
        await waitForGate(gateId,index);
        row.gateWaiting=true;
        const checkout = await request('checkout','POST',`/carts/${cartId}/checkout`,{},false,index);
        row.checkoutStatus=checkout.status;
        ensure(checkout.status===200 && checkout.body?.success===true,'Checkout failed: '+checkout.status);
        const afterCheckout = summary((await request('after_checkout','GET',`/carts/${cartId}`,undefined,false,index)).body);
        ensure(afterCheckout.status==='submitted','Cart not submitted after checkout');
        const released = await request('release_gate','POST',`/__benchmark/mock/gates/${gateId}/release`,{},true,index);
        ensure(released.status===200,'Cannot release gate');
        const ai = await aiPromise;
        row.aiHttpStatus=ai.status; row.aiStatus=ai.body?.status || '';
        row.assistantMessage=ai.body?.assistantMessage || '';
        const final = summary((await request('final_cart','GET',`/carts/${cartId}`,undefined,false,index)).body);
        row.cartStatus=final.status; row.afterRevision=final.revision; row.deltaRevision=final.revision-before.revision;
        row.afterQuantity=final.quantity;
        row.cartUnchanged=final.status===afterCheckout.status && final.revision===afterCheckout.revision &&
            final.quantity===afterCheckout.quantity && final.items===afterCheckout.items;
        row.correct=ai.status===200 && ai.body?.status==='error' && row.cartUnchanged &&
            final.revision===before.revision+1 && final.quantity===before.quantity &&
            !/successfully added|added 1 beef/i.test(row.assistantMessage);
        if(!row.correct) row.setupError='AI execution was not rejected or cart changed';
    } catch(e) { row.setupError=String(e); }
    finally {
        if(gateId) { try { await request('cleanup_release','POST',`/__benchmark/mock/gates/${gateId}/release`,{},true,index); } catch {} }
        if(aiPromise) { try { await Promise.race([aiPromise,sleep(1000)]); } catch {} }
        allRounds.push(row);
        console.log(`Round ${index}: ${row.correct?'PASS':'FAIL'} checkout=${row.checkoutStatus} ai=${row.aiStatus} qty=${row.afterQuantity} revisionDelta=${row.deltaRevision} ${row.setupError}`);
    }
}
try {
    for(let i=1;i<=repeats;i++) await round(i);
} finally {
    const rfile=path.join(dir,`ai-checkout-race-${stamp}-rounds.csv`);
    const qfile=path.join(dir,`ai-checkout-race-${stamp}-requests.csv`);
    fs.writeFileSync(rfile,toCSV(allRounds));
    fs.writeFileSync(qfile,toCSV(allRequests));
    console.log(`Rounds CSV: ${rfile}`);
    console.log(`Requests CSV: ${qfile}`);
}
if(allRounds.some(r=>!r.correct)) process.exitCode=1;
