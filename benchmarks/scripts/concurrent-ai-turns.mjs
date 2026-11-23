// Node >=18; one real chat session per round; local benchmark server ONLY.
// Deterministically reverse model completion order via the existing mock gate.
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000/api';
const token = process.env.BENCHMARK_TOKEN || '';
const repeats = Number(process.env.REPEATS || '2');
const modeNames = (process.env.MODES || 'add-add,add-clear').split(',').map(x => x.trim());
const modes = new Set(['add-add','add-clear']);
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/?$/.test(base)) throw Error('Use only local API');
if (token.length < 16 || !Number.isInteger(repeats) || repeats < 1 || repeats > 100 ||
    !modeNames.length || modeNames.some(x=>!modes.has(x))) throw Error('BENCHMARK_TOKEN / REPEATS 1..100 / MODES invalid');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const stamp = new Date().toISOString().replace(/[-:]/g,'').replace('T','-').replace('Z','').replace('.','-');
const dir = path.resolve('benchmarks/results'); fs.mkdirSync(dir,{recursive:true});
const requests=[], rounds=[];
const csv = rows => {
    if (!rows.length) return '';
    const columns=[...new Set(rows.flatMap(Object.keys))];
    const escape=v=>'"'+String(v ?? '').replaceAll('"','""')+'"';
    return [columns.map(escape).join(','),...rows.map(r=>columns.map(k=>escape(r[k])).join(','))].join('\r\n')+'\r\n';
};
async function request(label,method,endpoint,body,control,mode,round) {
    const start=performance.now(); let status=0, data=null, error='';
    try {
        const resp=await fetch(base+endpoint,{
            method,
            headers:{...(body===undefined?{}:{'content-type':'application/json'}),
                ...(control?{'x-benchmark-token':token}:{})},
            body: body===undefined?undefined:JSON.stringify(body),
            signal:AbortSignal.timeout(45000),
        });
        status=resp.status;
        const t=await resp.text();
        try{data=JSON.parse(t);}catch{data={raw:t.slice(0,300)};}
    } catch(e){error=String(e);}
    const elapsedMs=Math.round((performance.now()-start)*100)/100;
    requests.push({runId:stamp,mode,round,label,status,elapsedMs,error,
        aiStatus:data?.status??'', businessCode:data?.error?.code??''});
    return {status,data,error,elapsedMs};
}
function ensure(x,msg){if(!x)throw Error(msg);}
async function waitForGate(id,mode,round){
    for(let i=0;i<200;i++){
        const r=await request('gate_poll','GET',`/__benchmark/mock/gates/${id}`,undefined,true,mode,round);
        if(r.data?.state==='waiting')return;
        if(r.data?.state==='expired')throw Error('Gate expired');
        await sleep(25);
    }
    throw Error('First AI never reached normalization gate');
}
const count = payload => (payload?.items ?? []).reduce((total,i)=>total+Number(i.quantity||0),0);
async function run(mode,round){
    const record={runId:stamp,mode,round,setupOK:false,firstGateWaiting:false,
        firstHTTP:0,firstStatus:'',overlapHTTP:0,overlapBusinessCode:'',
        overlapLatencyMs:null,retryHTTP:0,retryStatus:'',
        beforeQuantity:null,atOverlapQuantity:null,afterFirstQuantity:null,afterQuantity:null,
        revisionDelta:null,expectedFinalQuantity:mode==='add-add'?2:0,
        overlapRejected:false,unchangedDuringOverlap:false,historyUnchangedDuringOverlap:false,
        sequentialRetrySucceeded:false,historyHasBoth:false,semanticOrderMatches:false,
        correct:false,error:''};
    let gateId=null,firstPromise=null,firstSettled=false;
    try {
        const created=await request('create_cart','POST','/carts',{},false,mode,round);
        const cartId=created.data?.cart?.id, sessionId=created.data?.chatSessionId;
        ensure(created.status===201&&cartId&&sessionId,'Cart create failed');
        record.setupOK=true;
        const initial=await request('initial_cart','GET',`/carts/${cartId}`,undefined,false,mode,round);
        ensure(initial.status===200&&initial.data?.cart?.status==='active','Initial cart invalid');
        const beforeRev=initial.data.cart.revision;
        record.beforeQuantity=count(initial.data);
        ensure(record.beforeQuantity===0,'Initial cart must be empty');
        const armed=await request('arm_gate','POST','/__benchmark/mock/gates',{stage:'normalization'},true,mode,round);
        gateId=armed.data?.gateId; ensure(armed.status===201&&gateId,'Unable to arm mock');
        firstPromise=request('turn_A_add','POST',`/ordering/sessions/${sessionId}/turn`,
            {userMessage:'Add one beef sandwich'},false,mode,round);
        await waitForGate(gateId,mode,round);
        record.firstGateWaiting=true;
        const secondMessage=mode==='add-clear'?'Clear cart':'Add one beef sandwich';
        const overlapping=await request('turn_B_overlapping','POST',
            `/ordering/sessions/${sessionId}/turn`,{userMessage:secondMessage},false,mode,round);
        record.overlapHTTP=overlapping.status;
        record.overlapBusinessCode=String(overlapping.data?.error?.code??'');
        record.overlapLatencyMs=overlapping.elapsedMs;
        record.overlapRejected=record.overlapHTTP===409 && record.overlapBusinessCode==='TURN_IN_PROGRESS';
        const during=await request('cart_during_A','GET',`/carts/${cartId}`,undefined,false,mode,round);
        record.atOverlapQuantity=count(during.data);
        record.unchangedDuringOverlap=during.status===200&&record.atOverlapQuantity===0&&during.data?.cart?.revision===beforeRev;
        const earlyHistory=await request('history_during_A','GET',`/chat/sessions/${sessionId}/messages`,undefined,false,mode,round);
        record.historyUnchangedDuringOverlap=earlyHistory.status===200&&
            (earlyHistory.data?.messages??[]).filter(m=>m.role==='user').length===0;
        // A's mock must be released BEFORE the accepted retry of B.
        const release=await request('release_gate','POST',`/__benchmark/mock/gates/${gateId}/release`,{},true,mode,round);
        ensure(release.status===200,'Unable to release first turn');
        const first=await firstPromise;
        firstSettled=true;
        record.firstHTTP=first.status;record.firstStatus=first.data?.status??'';
        const afterFirst=await request('cart_after_A','GET',`/carts/${cartId}`,undefined,false,mode,round);
        record.afterFirstQuantity=count(afterFirst.data);
        // Only after A finishes, retry B as Mobile App would do when the UI is unlocked.
        const retry=await request('turn_B_sequential_retry','POST',
            `/ordering/sessions/${sessionId}/turn`,{userMessage:secondMessage},false,mode,round);
        record.retryHTTP=retry.status;record.retryStatus=retry.data?.status??'';
        record.sequentialRetrySucceeded=retry.status===200&&retry.data?.status==='success';
        const final=await request('final_cart','GET',`/carts/${cartId}`,undefined,false,mode,round);
        record.afterQuantity=count(final.data);
        record.revisionDelta=final.data?.cart?.revision-beforeRev;
        record.semanticOrderMatches=record.afterQuantity===record.expectedFinalQuantity;
        const history=await request('chat_history','GET',`/chat/sessions/${sessionId}/messages`,undefined,false,mode,round);
        const messages=history.data?.messages??[];
        record.historyHasBoth=history.status===200&&messages.filter(m=>m.role==='user').length===2&&
            messages.filter(m=>m.role==='assistant').length===2;
        record.correct=record.overlapRejected&&record.unchangedDuringOverlap&&
            record.historyUnchangedDuringOverlap&&record.firstHTTP===200&&
            record.firstStatus==='success'&&record.afterFirstQuantity===1&&
            record.sequentialRetrySucceeded&&record.semanticOrderMatches&&
            record.revisionDelta===2&&final.data?.cart?.status==='active'&&record.historyHasBoth;
    } catch(e){record.error=String(e);}
    finally {
        if(gateId){try{await request('cleanup_release','POST',`/__benchmark/mock/gates/${gateId}/release`,{},true,mode,round);}catch{}}
        if(firstPromise&&!firstSettled){try{await Promise.race([firstPromise,sleep(1000)]);}catch{}}
        rounds.push(record);
        console.log(`${mode} #${round}: ${record.correct?'PASS':'FAIL'} overlap=${record.overlapHTTP}/${record.overlapBusinessCode} retry=${record.retryHTTP}/${record.retryStatus} qty=${record.afterQuantity} revDelta=${record.revisionDelta} history=${record.historyHasBoth} ${record.error}`);
    }
}
try {
    for(const mode of modeNames)for(let i=1;i<=repeats;i++)await run(mode,i);
} finally {
    const roundsPath=path.join(dir,`concurrent-ai-turns-${stamp}-rounds.csv`);
    const requestsPath=path.join(dir,`concurrent-ai-turns-${stamp}-requests.csv`);
    fs.writeFileSync(roundsPath,csv(rounds)); fs.writeFileSync(requestsPath,csv(requests));
    console.log(`Rounds CSV: ${roundsPath}`); console.log(`Requests CSV: ${requestsPath}`);
}
if(rounds.some(r=>!r.correct))process.exitCode=1;
