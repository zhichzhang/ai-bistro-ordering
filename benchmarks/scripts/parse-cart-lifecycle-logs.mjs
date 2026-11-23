import fs from 'node:fs';
const [source, roundsPath, requestsPath] = process.argv.slice(2);
if (!source || !roundsPath || !requestsPath) {
  console.error('Usage: node parse-cart-lifecycle-logs.mjs input.log rounds.csv requests.csv');
  process.exit(2);
}
const roundKeys = ['runId','startedAt','kind','repeat','cartId','setupError','checkoutStatus','mutationStatus','mutationAccepted','checkoutAccepted','lateChecked','lateStatus','lateBusinessCode','lateStateUnchanged','batchElapsedMs','beforeRevision','afterRevision','deltaRevision','finalStatus','finalQuantity','raceCorrect','lateCorrect','correct'];
const requestKeys = ['runId','startedAt','kind','repeat','cartId','name','status','durationMs','waitingMs','businessCode','error','orderId','nextCartId','nextSessionId'];
const rounds = [], requests = [];
for (const line of fs.readFileSync(source,'utf8').split(/\r?\n/)) {
  for (const [prefix, collection] of [['RACE_ROUND|',rounds],['RACE_REQUEST|',requests]]) {
    const idx = line.indexOf(prefix);
    if (idx < 0) continue;
    const s = line.indexOf('{', idx + prefix.length), e = line.lastIndexOf('}');
    if (s < 0 || e < s) continue;
    try { collection.push(JSON.parse(line.slice(s,e+1))); }
    catch (err) { console.error('Bad structured log:', err.message); process.exitCode = 1; }
  }
}
function escapeCsv(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /[,"\r\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s;
}
function write(path, keys, rows) {
  fs.writeFileSync(path, [keys.join(','), ...rows.map(row => keys.map(k=>escapeCsv(row[k])).join(','))].join('\r\n')+'\r\n');
}
write(roundsPath,roundKeys,rounds);
write(requestsPath,requestKeys,requests);
console.log(`Wrote ${rounds.length} lifecycle rounds: ${roundsPath}`);
console.log(`Wrote ${requests.length} HTTP request details: ${requestsPath}`);
if (rounds.length === 0) process.exitCode = 1;
