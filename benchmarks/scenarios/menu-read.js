import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
export const options = {
  scenarios: {
    menu_reads: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 5 },
        { duration: '15s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const res = http.get(`${BASE}/menu/items`, { tags: { operation: 'menu_read' } });
  check(res, {
    'menu response is 200': (r) => r.status === 200,
    'menu contains items': (r) => {
      try {
        return Array.isArray(r.json('items')) && r.json('items').length > 0;
      } catch (_) {
        return false;
      }
    },
  });
  sleep(1);
}
