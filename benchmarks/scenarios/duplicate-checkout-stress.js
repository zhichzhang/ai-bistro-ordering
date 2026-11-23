import http from 'k6/http';
import { check } from 'k6';

// Correctness stress test. ONLY run against localhost with an isolated benchmark DB.
const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const ITEM = __ENV.MENU_ITEM_ID || 'sandwich_beef';
const LEVELS = (__ENV.LEVELS || '2,5,10,20').split(',').map((v) => Number(v.trim()));
const REPEATS = Number(__ENV.REPEATS || '3');
const MAX_LEVEL = __ENV.ALLOW_EXTREME === '1' ? 500 : 200;
const BATCH_PER_HOST = Number(__ENV.BATCH_PER_HOST || Math.max(...LEVELS));
const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || '30s';
const json = { headers: { 'Content-Type': 'application/json' } };

if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/.test(BASE)) {
  throw new Error('Safety stop: BASE_URL must point to a localhost /api endpoint.');
}
if (LEVELS.length === 0 || LEVELS.some((n) => !Number.isInteger(n) || n < 2 || n > MAX_LEVEL)) {
  throw new Error(`LEVELS must contain integers in [2, ${MAX_LEVEL}]. Set ALLOW_EXTREME=1 for up to 500.`);
}
if (!Number.isInteger(REPEATS) || REPEATS < 1 || REPEATS > 10 || LEVELS.length * REPEATS > 40) {
  throw new Error('REPEATS must be 1–10 with at most 40 total rounds.');
}
if (!Number.isInteger(BATCH_PER_HOST) || BATCH_PER_HOST < Math.max(...LEVELS) || BATCH_PER_HOST > 500) {
  throw new Error('BATCH_PER_HOST must cover the largest level and be <= 500.');
}
if (LEVELS.reduce((a, b) => a + b, 0) * REPEATS > 2000) {
  throw new Error('Safety stop: at most 2000 checkout attempts per invocation.');
}

// http.batch() defaults can limit concurrency per host. Explicitly raise both limits.
export const options = {
  batch: BATCH_PER_HOST,
  batchPerHost: BATCH_PER_HOST,
  scenarios: {
    duplicate_checkout_stress: {
      executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: '10m',
    },
  },
  thresholds: { checks: ['rate==1'] },
};

function parse(res) {
  try { return res.json(); } catch (_) { return null; }
}

function record(kind, data) {
  console.log(`BENCH_${kind}|${JSON.stringify(data)}`);
}

function createReadyCart() {
  const created = http.post(`${BASE}/carts`, '{}', json);
  const cartId = parse(created)?.cart?.id;
  if (created.status !== 201 || !cartId) return { error: `cart_create_${created.status}` };

  const added = http.post(
    `${BASE}/carts/${cartId}/items`,
    JSON.stringify({ menuItemId: ITEM, quantity: 1, modifiers: {} }), json,
  );
  if (added.status !== 201) return { cartId, error: `item_add_${added.status}` };

  const read = http.get(`${BASE}/carts/${cartId}`);
  const revision = parse(read)?.cart?.revision;
  if (read.status !== 200 || !Number.isInteger(revision)) {
    return { cartId, error: `cart_read_${read.status}` };
  }
  return { cartId, revision };
}

function runRound(level, repeat) {
  const runId = __ENV.RUN_ID || 'manual';
  const startedAt = new Date().toISOString();
  const setup = createReadyCart();

  if (setup.error) {
    record('ROUND', {
      runId, startedAt, level, repeat, cartId: setup.cartId || '',
      setupError: setup.error, sent: 0, successful: 0, rejected: 0,
      serverErrors: 0, uniqueOrders: 0, uniqueNextCarts: 0,
      uniqueNextSessions: 0, duplicateSuccesses: 0,
      correct: false,
    });
    check(false, { 'checkout round correctness': (v) => v });
    return;
  }

  const { cartId, revision: beforeRevision } = setup;
  const requests = Array.from({ length: level }, (_, attempt) => [
    'POST', `${BASE}/carts/${cartId}/checkout`, '{}', {
      ...json, timeout: REQUEST_TIMEOUT,
      tags: { test_kind: 'duplicate_checkout', level: String(level), repeat: String(repeat), attempt: String(attempt + 1) },
    },
  ]);

  const batchStart = Date.now();
  const responses = http.batch(requests);
  const batchElapsedMs = Date.now() - batchStart;
  const success = [];
  const rejected = [];
  let unexpectedClientErrors = 0;
  let serverErrors = 0;
  const statusCounts = {};

  responses.forEach((res, index) => {
    const body = parse(res);
    const accepted = res.status === 200 && body?.success === true;
    if (accepted) success.push(body);
    if (res.status === 409 && body?.error?.code === 'CART_NOT_ACTIVE') rejected.push(res);
    else if (res.status >= 400 && res.status < 500) unexpectedClientErrors++;
    if (res.status === 0 || res.status >= 500) serverErrors++;
    statusCounts[String(res.status)] = (statusCounts[String(res.status)] || 0) + 1;

    record('REQUEST', {
      runId, startedAt, level, repeat, cartId, attempt: index + 1,
      status: res.status, accepted, durationMs: res.timings?.duration ?? null,
      waitingMs: res.timings?.waiting ?? null, errorCode: res.error_code ?? null,
      error: res.error || '', orderId: accepted ? body.orderId || '' : '',
      nextCartId: accepted ? body.nextCart?.cart?.id || '' : '',
      nextSessionId: accepted ? body.nextCart?.chatSessionId || '' : '',
    });
  });

  const uniqueOrders = new Set(success.map((x) => x.orderId).filter(Boolean)).size;
  const uniqueNextCarts = new Set(success.map((x) => x.nextCart?.cart?.id).filter(Boolean)).size;
  const uniqueNextSessions = new Set(success.map((x) => x.nextCart?.chatSessionId).filter(Boolean)).size;
  const finalResponse = http.get(`${BASE}/carts/${cartId}`);
  const finalCart = parse(finalResponse)?.cart;
  const deltaRevision = Number.isInteger(finalCart?.revision)
    ? finalCart.revision - beforeRevision : null;
  const correct = success.length === 1 && rejected.length === level - 1 &&
    serverErrors === 0 && unexpectedClientErrors === 0 && uniqueOrders === 1 && uniqueNextCarts === 1 &&
    uniqueNextSessions === 1 && finalCart?.status === 'submitted' && deltaRevision === 1;

  record('ROUND', {
    runId, startedAt, level, repeat, cartId, setupError: '', sent: level,
    successful: success.length, rejected: rejected.length, serverErrors,
    duplicateSuccesses: Math.max(0, success.length - 1),
    uniqueOrders, uniqueNextCarts, uniqueNextSessions, unexpectedClientErrors,
    statusCounts, beforeRevision, afterRevision: finalCart?.revision ?? null,
    deltaRevision, cartStatus: finalCart?.status ?? '',
    batchElapsedMs, correct,
  });
  check(correct, { 'checkout round correctness': (v) => v });
}

export default function () {
  for (const level of LEVELS) {
    for (let repeat = 1; repeat <= REPEATS; repeat++) runRound(level, repeat);
  }
}
