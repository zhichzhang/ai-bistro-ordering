import http from 'k6/http';
import { check } from 'k6';

// Safety: this scenario creates carts and writes to a database.
// Run it only against an isolated local benchmark backend.
const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const ITEM = __ENV.MENU_ITEM_ID || 'sandwich_beef';
const json = { headers: { 'Content-Type': 'application/json' } };

export const options = {
  scenarios: {
    duplicate_checkout: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1m',
    },
  },
  // This threshold is intentionally strict: it fails if duplicate checkout
  // creates another independent submission or an unexpected server error.
  thresholds: { checks: ['rate==1'] },
};

function body(res) {
  try { return res.json(); } catch (_) { return null; }
}

function createReadyCart() {
  const created = http.post(`${BASE}/carts`, '{}', json);
  const initial = body(created);
  const cartId = initial?.cart?.id;
  if (!check(created, {
    'setup: cart created': (r) => r.status === 201 && !!cartId,
  })) return null;

  const added = http.post(
    `${BASE}/carts/${cartId}/items`,
    JSON.stringify({ menuItemId: ITEM, quantity: 1, modifiers: {} }),
    json
  );
  const updated = body(added);
  const isReady = added.status === 201 &&
    Array.isArray(updated?.items) && updated.items.length > 0;
  if (!check(added, { 'setup: cart has an item': () => isReady })) {
    return null;
  }
  return cartId;
}

function isSuccess(response) {
  return response.status === 200 && body(response)?.success === true;
}

function describe(response) {
  const data = body(response);
  return {
    status: response.status,
    success: data?.success ?? null,
    orderId: data?.orderId ?? null,
    nextCartId: data?.nextCart?.cart?.id ?? null,
    nextSessionId: data?.nextCart?.chatSessionId ?? null,
  };
}

function assertFinalCart(cartId, label) {
  const response = http.get(`${BASE}/carts/${cartId}`);
  const cart = body(response)?.cart;
  check(response, {
    [`${label}: original cart remains submitted`]: (r) =>
      r.status === 200 && cart?.status === 'submitted',
    [`${label}: revision incremented exactly once by checkout`]: (r) =>
      r.status === 200 && cart?.revision === 2,
  });
}

export default function () {
  // Case A: two overlapping requests targeting the same cart.
  const parallelCartId = createReadyCart();
  if (!parallelCartId) return;

  const url = `${BASE}/carts/${parallelCartId}/checkout`;
  const responses = http.batch([
    ['POST', url, '{}', { ...json, tags: { case: 'parallel_checkout' } }],
    ['POST', url, '{}', { ...json, tags: { case: 'parallel_checkout' } }],
  ]);
  const successes = responses.filter(isSuccess);
  const rejections = responses.filter((r) => r.status >= 400 && r.status < 500);
  const orders = successes.map((r) => body(r)?.orderId);
  const newCarts = successes.map((r) => body(r)?.nextCart?.cart?.id);

  console.log(`parallel checkout: ${JSON.stringify(responses.map(describe))}`);
  check(responses, {
    'parallel: exactly one checkout succeeds': () => successes.length === 1,
    'parallel: duplicate receives a 4xx rejection': () => rejections.length === 1,
    'parallel: no two distinct order IDs': () => new Set(orders.filter(Boolean)).size <= 1,
    'parallel: no two distinct next carts': () => new Set(newCarts.filter(Boolean)).size <= 1,
  });
  assertFinalCart(parallelCartId, 'parallel');

  // Case B: retrying an already-successful checkout after it completes.
  const replayCartId = createReadyCart();
  if (!replayCartId) return;

  const first = http.post(`${BASE}/carts/${replayCartId}/checkout`, '{}', {
    ...json, tags: { case: 'first_checkout' },
  });
  const replay = http.post(`${BASE}/carts/${replayCartId}/checkout`, '{}', {
    ...json, tags: { case: 'replayed_checkout' },
  });

  console.log(`sequential checkout: ${JSON.stringify([describe(first), describe(replay)])}`);
  check([first, replay], {
    'replay: first checkout succeeds': () => isSuccess(first),
    'replay: second checkout is rejected with 4xx': () =>
      replay.status >= 400 && replay.status < 500,
  });
  assertFinalCart(replayCartId, 'replay');
}
