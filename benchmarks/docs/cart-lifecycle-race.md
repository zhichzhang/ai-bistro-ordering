# Cart Lifecycle — Checkout vs Mutation

[Benchmark index](../README.md) · [Quantitative report](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/reports/concurrency-performance-analysis.md)

## Question and invariants

Can a checkout racing with **add**, **update quantity**, or **clear** produce an impossible cart state? A fresh cart starts with two `sandwich_beef` items. k6 `http.batch` dispatches checkout and mutation concurrently, so the scheduler may choose either operation first.

Valid outcomes:

- **Checkout wins:** cart becomes `submitted`; competing/stale mutation is rejected as HTTP `409 CART_NOT_ACTIVE`; submitted contents and revision do not change afterward.
- **Add or update wins:** mutation is committed before checkout; submitted contents reflect that mutation.
- **Clear wins:** cart is empty and stays `active`; empty-cart checkout is a **controlled 4xx** (now 400), not an unexpected HTTP 500.

The runner also attempts a **late mutation** following successful checkout, then checks rejection and unchanged final state. It checks persisted revision and quantity, not just HTTP success.

## Run

```powershell
.\benchmarks\scripts\run-cart-lifecycle-race.ps1 -Repeats 10
# Full historic after-fix configuration: -Repeats 30 (30 per mode, 90 rounds)
```

Runner: [`run-cart-lifecycle-race.ps1`](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/scripts/run-cart-lifecycle-race.ps1). Scenario: [`cart-lifecycle-race.js`](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/scenarios/cart-lifecycle-race.js). Requires local seeded benchmark PostgreSQL and k6; no real LLM calls.

## Evidence

- Before: [`20261123-010658-637-rounds.csv`](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/results/before-fix/cart-lifecycle-20261123-010658-637-rounds.csv): **6 diagnostic rounds** (2 per mode). All were marked `correct=false`, but the original harness misclassified some otherwise valid late-rejection cases. There was **one observed HTTP 500** for an empty-cart checkout. Therefore this is *not* a reliable 0/6 backend-correctness baseline.
- After: [`20261123-011239-579-rounds.csv`](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/results/after-fix/cart-lifecycle-20261123-011239-579-rounds.csv): **90/90 correct**, 30 per mutation mode; empty-cart checkout was mapped to controlled HTTP 400.
- Regression: [`20261123-024149-617-rounds.csv`](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/results/regression/cart-lifecycle-20261123-024149-617-rounds.csv): **30/30 correct** (10 per mode), following later database context changes.

The before/after are intentionally described asymmetrically because the original classification defect was in **test logic**, while the empty-cart 500 was a genuine **HTTP error-mapping defect**.

## Limitations

The concurrency is simultaneous dispatch, not a deterministic ordering of database transactions. This scenario tests state transitions, not sustained throughput, payments or cross-cart resource ownership. Delayed LLM requests are covered by [AI vs checkout](ai-checkout-race.md).
