import http from 'k6/http';
import { check } from 'k6';

// Local-only, deterministic cart lifecycle correctness probe. No LLM calls.
const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const ITEM = __ENV.MENU_ITEM_ID || 'sandwich_beef';
const REPEATS = Number(__ENV.REPEATS || 10);
const MODES = (__ENV.MODES || 'add,update,clear').split(',').map(s => s.trim());
const JSON_PARAMS = { headers: { 'Content-Type': 'application/json' }, timeout: '15s' };
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/.test(BASE)) throw Error('Safety: localhost /api only');
if (!Number.isInteger(REPEATS) || REPEATS < 1 || REPEATS > 100) throw Error('REPEATS must be 1..100');
if (MODES.length === 0 || MODES.some(s => !['add','update','clear'].includes(s)) || new Set(MODES).size !== MODES.length) throw Error('MODES must be unique add,update,clear values');
if (REPEATS * MODES.length > 300) throw Error('Safety limit: 300 rounds');
export const options = {
  batch: 2, batchPerHost: 2,
  scenarios: { cart_lifecycle_race: { executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: '10m' } },
  thresholds: { checks: ['rate==1'] },
};
function parsed(r) { try { return r.json(); } catch (_) { return null; } }
function log(type, data) { console.log(`RACE_${type}|${JSON.stringify(data)}`); }
function reqRecord(data, name, res) {
  const body = parsed(res);
  log('REQUEST', { ...data, name, status: res.status, durationMs: res.timings?.duration ?? null,
    waitingMs: res.timings?.waiting ?? null, error: res.error || '',
    businessCode: body?.error?.code || '', orderId: body?.orderId || '',
    nextCartId: body?.nextCart?.cart?.id || '', nextSessionId: body?.nextCart?.chatSessionId || '' });
}
function getCart(id) {
  const r = http.get(`${BASE}/carts/${id}`);
  return r.status === 200 ? parsed(r) : null;
}
function init() {
  const created = http.post(`${BASE}/carts`, '{}', JSON_PARAMS);
  const id = parsed(created)?.cart?.id;
  if (created.status !== 201 || !id) return { error: `create_${created.status}` };
  const added = http.post(`${BASE}/carts/${id}/items`, JSON.stringify({menuItemId: ITEM, quantity: 2, modifiers: {}}), JSON_PARAMS);
  if (added.status !== 201) return { id, error: `add_${added.status}` };
  const context = getCart(id);
  const line = context?.items?.[0];
  if (!line || line.quantity !== 2 || !Number.isInteger(context?.cart?.revision)) return {id, error:'setup_invalid'};
  return { id, lineId: line.id, revision: context.cart.revision, total: line.line_total_cents, unit: line.unit_price_cents };
}
function opFor(kind, id, lineId) {
  if (kind === 'add') return ['POST', `${BASE}/carts/${id}/items`, JSON.stringify({ menuItemId: ITEM, quantity: 1, modifiers: {} }), JSON_PARAMS];
  if (kind === 'update') return ['PATCH', `${BASE}/carts/${id}/items/${lineId}`, JSON.stringify({quantity: 5}), JSON_PARAMS];
  return ['POST', `${BASE}/carts/${id}/clear`, '{}', JSON_PARAMS];
}
function checkCartState(kind, mutated, checkoutOk, before, after, checkout) {
  if (!after || after.cart.status !== (checkoutOk ? 'submitted' : 'active')) return false;
  const quantity = after.items.reduce((sum, item) => sum + item.quantity, 0);
  const expectedQty = mutated ? (kind === 'add' ? 3 : kind === 'update' ? 5 : 0) : 2;
  if (quantity !== expectedQty) return false;
  if (after.cart.revision !== before.revision + (mutated ? 1 : 0) + (checkoutOk ? 1 : 0)) return false;
  if (checkoutOk) {
    if (checkout?.success !== true) return false;
    if (checkout.itemCount !== expectedQty) return false;
    if (!checkout.orderId || !checkout.nextCart?.cart?.id || !checkout.nextCart?.chatSessionId) return false;
  }
  // Verify price wasn't corrupted for unchanged or quantity-only carts.
  if (quantity > 0 && after.items.length !== 1) return false;
  if (quantity > 0 && after.items[0].line_total_cents !== before.unit * quantity) return false;
  return true;
}
// Compare persisted cart fields rather than JSON key order or volatile metadata.
// We deliberately include canonical identity, modifiers, quantities and prices.
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).sort().join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function samePersistedCart(pre, post) {
  return Boolean(pre && post &&
    pre.cart?.id === post.cart?.id &&
    pre.cart?.status === post.cart?.status &&
    pre.cart?.revision === post.cart?.revision &&
    stable(pre.items) === stable(post.items));
}
function run(kind, repeat) {
  const runId = __ENV.RUN_ID || 'manual';
  const startedAt = new Date().toISOString();
  const s = init();
  const base = {runId, startedAt, kind, repeat, cartId: s.id || ''};
  if (s.error) {
    log('ROUND', {...base, setupError: s.error, correct: false});
    check(false, {'cart lifecycle correctness': v => v});
    return;
  }
  const checkoutReq = ['POST', `${BASE}/carts/${s.id}/checkout`, '{}', JSON_PARAMS];
  const mutationReq = opFor(kind, s.id, s.lineId);
  const start = Date.now();
  const [checkoutRes, mutationRes] = http.batch([checkoutReq, mutationReq]);
  const batchElapsedMs = Date.now() - start;
  reqRecord(base, 'checkout', checkoutRes);
  reqRecord(base, kind, mutationRes);
  const checkoutBody = parsed(checkoutRes);
  const mutationBody = parsed(mutationRes);
  const final = getCart(s.id);
  const checkoutOk = checkoutRes.status === 200 && checkoutBody?.success === true;
  const mutationOk = (kind === 'add' ? mutationRes.status === 201 : mutationRes.status === 200);
  const mutationRejected = mutationRes.status === 409 && mutationBody?.error?.code === 'CART_NOT_ACTIVE';
  const successRace = (checkoutOk && (mutationOk || mutationRejected) && !(mutationOk && mutationRejected)) ||
    (kind === 'clear' && !checkoutOk && mutationOk);
  // An empty-cart checkout after clear is a valid state transition but should be
  // a controlled 4xx, not an uncaught 500. If 500 occurs, mark failure.
  const emptyCartRejection = kind === 'clear' && mutationOk && !checkoutOk &&
    checkoutRes.status === 400 && checkoutBody?.error?.code === 'EMPTY_CART';
  const raceCorrect = successRace && (checkoutOk || emptyCartRejection) &&
    checkCartState(kind, mutationOk, checkoutOk, s, final, checkoutBody);
  let lateChecked = false;
  let lateStatus = null;
  let lateCorrect = true;
  let lateBusinessCode = '';
  let lateStateUnchanged = null;
  // After successful checkout, stale calls must fail and leave the DB untouched.
  if (checkoutOk) {
    const pre = final;
    const late = opFor(kind, s.id, s.lineId);
    const staleRes = http.request(late[0], late[1], late[2], late[3]);
    reqRecord(base, `${kind}_after_checkout`, staleRes);
    const post = getCart(s.id);
    lateChecked = true;
    lateStatus = staleRes.status;
    lateBusinessCode = parsed(staleRes)?.error?.code ?? '';
    lateStateUnchanged = samePersistedCart(pre, post);
    // The 409 response and persisted state are the correctness criteria.
    // Error codes are recorded separately to help diagnose unexpected response shapes.
    lateCorrect = staleRes.status === 409 &&
      post?.cart?.status === 'submitted' && samePersistedCart(pre, post);
  }
  const correct = raceCorrect && lateCorrect;
  log('ROUND', { ...base, setupError: '', checkoutStatus: checkoutRes.status, mutationStatus: mutationRes.status,
    mutationAccepted: mutationOk, checkoutAccepted: checkoutOk, lateChecked, lateStatus,
    lateBusinessCode, lateStateUnchanged,
    batchElapsedMs, beforeRevision: s.revision, afterRevision: final?.cart?.revision ?? null,
    deltaRevision: (final?.cart?.revision ?? s.revision) - s.revision,
    finalStatus: final?.cart?.status ?? '', finalQuantity: final?.items?.reduce((n,x) => n + x.quantity,0) ?? null,
    raceCorrect, lateCorrect, correct });
  check(correct, {'cart lifecycle correctness': v => v});
}
export default function () {
  for (const kind of MODES) for (let i = 1; i <= REPEATS; i++) run(kind, i);
}
