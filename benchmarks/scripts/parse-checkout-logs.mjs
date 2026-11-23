import fs from 'node:fs';

const [input, roundOutput, requestOutput] = process.argv.slice(2);
if (!input || !roundOutput || !requestOutput) {
  console.error('Usage: node parse-checkout-logs.mjs <console.log> <rounds.csv> <requests.csv>');
  process.exit(2);
}

const roundFields = [
  'runId', 'startedAt', 'level', 'repeat', 'cartId', 'setupError', 'sent',
  'successful', 'rejected', 'serverErrors', 'duplicateSuccesses',
  'uniqueOrders', 'uniqueNextCarts', 'uniqueNextSessions', 'statusCounts',
  'beforeRevision', 'afterRevision', 'deltaRevision', 'cartStatus',
  'batchElapsedMs', 'correct',
];
const requestFields = [
  'runId', 'startedAt', 'level', 'repeat', 'cartId', 'attempt', 'status',
  'accepted', 'durationMs', 'waitingMs', 'errorCode', 'error',
  'orderId', 'nextCartId', 'nextSessionId',
];
const rounds = [];
const requests = [];
const contents = fs.readFileSync(input, 'utf8');
for (const line of contents.split(/\r?\n/)) {
  for (const [marker, target] of [['BENCH_ROUND|', rounds], ['BENCH_REQUEST|', requests]]) {
    const index = line.indexOf(marker);
    if (index === -1) continue;
    const fragment = line.slice(index + marker.length);
    const start = fragment.indexOf('{');
    const end = fragment.lastIndexOf('}');
    if (start < 0 || end < start) {
      console.error('Skipping malformed structured log:', line.slice(0, 120));
      continue;
    }
    try { target.push(JSON.parse(fragment.slice(start, end + 1))); }
    catch (e) { console.error('Skipping unparsable log:', e.message); }
  }
}

function cell(value) {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function writeCsv(path, fields, records) {
  const csv = [fields.join(','), ...records.map((r) => fields.map((field) => cell(r[field])).join(','))].join('\r\n') + '\r\n';
  fs.writeFileSync(path, csv, 'utf8');
}
writeCsv(roundOutput, roundFields, rounds);
writeCsv(requestOutput, requestFields, requests);
console.log(`CSV written: ${rounds.length} rounds → ${roundOutput}`);
console.log(`CSV written: ${requests.length} checkout attempts → ${requestOutput}`);
if (rounds.length === 0) {
  console.error('No BENCH_ROUND entries found. Check the k6 console output and script setup.');
  process.exit(1);
}
