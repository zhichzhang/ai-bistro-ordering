# Multi-Kiosk AI Ordering — Closed-Loop Load Benchmark

[Benchmark index](../README.md) · [Quantitative report](../../../../../../../../Downloads/ai-bistro-ordering-reviewed-readmes/benchmarks/reports/concurrency-performance-analysis.md)

## Workload

Each virtual kiosk owns a **distinct cart and chat session**. In sequence it creates a cart, sends two `Add one beef sandwich` AI turns, verifies final quantity 2, submits a preview checkout, and checks that the original cart is submitted and the response includes an order identifier. Kiosks within a wave start together; waves run sequentially.

The test uses real Express, Prisma, and PostgreSQL with `LLM_PROVIDER=mock`. **No real Gemini/OpenAI network latency is modeled**. The success criterion checks both HTTP status and AI/business status, followed by cart and checkout validation.

## Run

```powershell
# From the repository root; backend must be local mock + benchmark PostgreSQL
.\benchmarks\scripts\run-multi-kiosk-ordering.ps1 -Levels '5,10,20,50,100' -Repeats 3
```

Default: 3 warmups, 1,500ms pause between waves, 90-second individual request timeout. Runner: [`run-multi-kiosk-ordering.ps1`](../scripts/run-multi-kiosk-ordering.ps1); test implementation: [`multi-kiosk-ordering.mjs`](../scripts/multi-kiosk-ordering.mjs).

**Output behavior:** the current runner writes new CSVs into `benchmarks/results/performance-baseline/` regardless of whether the code is a baseline or a fixed build. After validating a run, archive it under `results/before-fix/`, `results/after-fix/` or `results/regression/` manually; the output folder name is not proof of its fix status. A nonzero process exit after CSV creation means at least one workflow failed or there was a harness error.

## Recorded comparison

| Concurrent kiosks | Before successful / total | After successful / total | Before mean AI P95 (ms) | After mean AI P95 (ms) | After mean completed orders/s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 15/15 | 15/15 | 108.27 | 116.11 | 18.91 |
| 10 | 0/30 | 30/30 | 5,166.59 | 187.69 | 22.12 |
| 20 | 14/60 | 60/60 | 5,340.42 | 346.42 | 24.85 |
| 50 | 14/150 | 150/150 | 5,740.88 | 855.34 | 24.27 |
| 100 | 15/300 | 300/300 | 6,461.64 | 1,968.82 | 22.92 |
| **Total** | **58/555** | **555/555** | — | — | — |

Baseline run: [`20261123-100310-360-rounds.csv`](../results/before-fix/multi-kiosk-20261123-100310-360-rounds.csv). After-fix run: [`20261123-103437-123-rounds.csv`](../results/after-fix/multi-kiosk-20261123-103437-123-rounds.csv). Each run has matching [`kiosks.csv`](../results/after-fix/multi-kiosk-20261123-103437-123-kiosks.csv) and [`requests.csv`](../results/after-fix/multi-kiosk-20261123-103437-123-requests.csv) using the same run ID.

The transaction-context correction made `MenuRepository` use the active Prisma transaction client (`db()`) instead of unconditional global-client queries. The pre-fix workload and PostgreSQL observations were consistent with additional pool acquisition while transactions remained open. The before/after results strongly support this explanation, but **do not independently isolate a specific driver timeout or establish a production-capacity limit**.

## Interpretation

- `AI P95` here is the **arithmetic mean of three round-level P95 values** at each level, not a pooled 95th percentile across all requests.
- `completedOrdersPerSec = successfulOrders / waveElapsedSeconds`; it is a **closed-loop wave-completion rate**, not sustainable requests/sec or production throughput.
- Before-fix AI latency includes failed AI business responses; it is not a matched comparison of successful AI calls.
- At 100 kiosks the fixed build completed every workflow but had higher latency than at 20 kiosks, indicating load sensitivity without identifying the precise remaining bottleneck.
- No payment processing, true LLM response variance, multi-process coordination, long-duration steady-state load, or geographically distributed clients are covered.
