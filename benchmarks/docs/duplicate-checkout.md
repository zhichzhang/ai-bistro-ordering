# Duplicate Checkout — Contended-Cart Correctness

[Benchmark index](../README.md) · [Quantitative report](../../../../../../../../Downloads/ai-bistro-ordering-reviewed-readmes/benchmarks/reports/concurrency-performance-analysis.md)

## Question and invariant

What happens if 20, 50, or 100 checkout requests race against **the same active cart**? The required invariant is **exactly one successful checkout per original cart** (given a nonempty cart) and no additional successor orders, carts or sessions. In this application's **reject-on-duplicate** policy, subsequent attempts return HTTP `409`. The preview checkout is **not** a payment transaction; no payment idempotency is implied.

## Method

The k6 scenario [`duplicate-checkout-stress.js`](../scenarios/duplicate-checkout-stress.js) creates a fresh cart, adds an item, sends simultaneous checkout attempts via `http.batch`, and retrieves final state. The PowerShell runner captures structured console events and parses them into two CSVs. Each level (`20,50,100`) is repeated 3 times, yielding `3 × (20+50+100) = 510` checkout attempts across 9 rounds. Setup and verification HTTP requests are **not** checkout attempts.

```powershell
# From repository root with the isolated local benchmark API running
.\benchmarks\scripts\run-duplicate-checkout.ps1 -Levels '20,50,100' -Repeats 3
```

## Root cause and fix

The original checkout path allowed concurrent callers to observe the cart as active before any marked it submitted (a check-then-act race). The fix uses a Prisma transaction, PostgreSQL row lock (`SELECT ... FOR UPDATE`) on the original cart, and a **status check while the lock is held**. One caller transitions `active → submitted`; later callers observe the new status and get 409. The lock and state check are a joint correctness requirement. This guarantees *at most one successful submission under the tested workload*, **not** idempotent replay of the first response.

## Recorded results

| Level × repetitions | Before success / attempts | Before extra successes | After success / attempts | After rejected (409) |
| --- | ---: | ---: | ---: | ---: |
| 20 × 3 | 60/60 | 57 | 3/60 | 57 |
| 50 × 3 | 150/150 | 147 | 3/150 | 147 |
| 100 × 3 | 300/300 | 297 | 3/300 | 297 |
| **Total** | **510/510** | **501** | **9/510** | **501** |

- Before: [`20261123-004132-867-rounds.csv`](../results/before-fix/duplicate-checkout-20261123-004132-867-rounds.csv) and [`requests.csv`](../results/before-fix/duplicate-checkout-20261123-004132-867-requests.csv).
- After: [`20261123-010050-931-rounds.csv`](../results/after-fix/duplicate-checkout-20261123-010050-931-rounds.csv) and [`requests.csv`](../results/after-fix/duplicate-checkout-20261123-010050-931-requests.csv).
- Regression: [`20261123-024142-122-rounds.csv`](../results/regression/duplicate-checkout-20261123-024142-122-rounds.csv) and [`requests.csv`](../results/regression/duplicate-checkout-20261123-024142-122-requests.csv): 9/9 correct.

`duplicateSuccesses = max(0, successfulCheckouts − 1)` per round. All 9 after-fix rounds have one unique returned order ID, one successor cart ID and a one-step checkout revision increase. The pre-fix run returned 510 distinct order IDs across its 9 rounds. **These are preview-order response identifiers, not paid orders.**

## Measurement caveats

The pre-fix k6 run emitted 546 HTTP requests in total, including **36 setup/verification requests**; its aggregate HTTP p95 is *not* checkout-only latency. After the fix, 409s are expected business rejections. Batch wall times before/after reflect **different success/rejection work**, so cannot establish that the successful checkout path became intrinsically faster. The scenario probes a single cart under contention; independent-cart scalability is in the [multi-kiosk test](multi-kiosk-ordering.md).
