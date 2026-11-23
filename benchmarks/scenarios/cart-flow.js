import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const ITEM = __ENV.MENU_ITEM_ID || 'sandwich_beef';
const json = { headers: { 'Content-Type': 'application/json' } };

export const options = {
  scenarios: {
    independent_kiosks: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 5 },
        { duration: '15s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

function readJson(res) {
  try { return res.json(); } catch (_) { return null; }
}

export default function () {
  const created = http.post(`${BASE}/carts`, '{}', {
    ...json,
    tags: { operation: 'create_cart' },
  });
  const createdBody = readJson(created);
  const cartId = createdBody && createdBody.cart && createdBody.cart.id;
  const sessionId = createdBody && createdBody.chatSessionId;
  if (!check(created, {
    'cart created': (r) => r.status === 201 && !!cartId && !!sessionId,
  })) return;

  const added = http.post(
    `${BASE}/carts/${cartId}/items`,
    JSON.stringify({ menuItemId: ITEM, quantity: 2, modifiers: {} }),
    { ...json, tags: { operation: 'add_item' } }
  );
  const addedBody = readJson(added);
  const lines = addedBody && addedBody.items;
  const line = Array.isArray(lines) && lines.find(i => i.menu_item_id === ITEM);
  if (!check(added, {
    'item added with quantity 2': (r) => r.status === 201 && !!line && line.quantity === 2,
  })) return;

  const summary = http.get(`${BASE}/carts/${cartId}/summary`, {
    tags: { operation: 'cart_summary' },
  });
  check(summary, {
    'summary reflects two items': (r) => {
      const data = readJson(r);
      return r.status === 200 && data && data.itemCount === 2;
    },
  });

  const checkout = http.post(`${BASE}/carts/${cartId}/checkout`, '{}', {
    ...json,
    tags: { operation: 'checkout' },
  });
  check(checkout, {
    'checkout rotates cart and session': (r) => {
      const data = readJson(r);
      return r.status === 200 && !!data && data.success === true &&
        data.itemCount === 2 && !!data.nextCart && !!data.nextCart.cart &&
        !!data.nextCart.chatSessionId &&
        data.nextCart.cart.id !== cartId;
    },
  });
  sleep(1);
}
