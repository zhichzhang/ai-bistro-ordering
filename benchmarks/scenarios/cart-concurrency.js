import http from 'k6/http';
import { check, fail } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const ITEM = __ENV.MENU_ITEM_ID || 'sandwich_beef';
const PARALLEL = Number(__ENV.PARALLEL || 10);
const jsonHeaders = { 'Content-Type': 'application/json' };

// A single test iteration creates one cart and fires PARALLEL concurrent writes.
export const options = {
  scenarios: {
    same_cart: { executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: '2m' },
  },
  thresholds: { http_req_failed: ['rate<0.01'], checks: ['rate==1'] },
};

function parse(res) {
  try { return res.json(); } catch (_) { return null; }
}

export default function () {
  if (!Number.isInteger(PARALLEL) || PARALLEL < 2 || PARALLEL > 50) {
    fail('PARALLEL must be between 2 and 50');
  }
  const created = http.post(`${BASE}/carts`, '{}', { headers: jsonHeaders });
  const c = parse(created);
  check(created, { 'cart created': (r) => r.status === 201 && !!c?.cart?.id });
  if (!c?.cart?.id) return;
  const cartId = c.cart.id;
  const requests = Array.from({ length: PARALLEL }, () => [
    'POST', `${BASE}/carts/${cartId}/items`,
    JSON.stringify({ menuItemId: ITEM, quantity: 1, modifiers: {} }),
    { headers: jsonHeaders, tags: { operation: 'concurrent_add' } },
  ]);
  const results = http.batch(requests);
  const success = results.filter((r) => r.status === 201).length;
  check(success, { 'all writes returned 201': (value) => value === PARALLEL });

  const cartRes = http.get(`${BASE}/carts/${cartId}`);
  const cart = parse(cartRes);
  const matching = (cart?.items || []).filter((line) => line.menu_item_id === ITEM);
  const count = matching.reduce((sum, line) => sum + line.quantity, 0);
  check(cartRes, {
    'cart returned 200': (r) => r.status === 200,
    'no lost updates': () => count === success,
    'same canonical item merges to one line': () => matching.length === 1,
    'cart revision accounts for writes': () => cart?.cart?.revision === success,
  });
  console.log(`same-cart: sent=${PARALLEL}, succeeded=${success}, quantity=${count}, lines=${matching.length}, revision=${cart?.cart?.revision}`);
}
