# Backend Benchmarks

This directory contains reproducible, **local-only** backend correctness and performance tests for AI Bistro Ordering. Each experiment has a detailed protocol under [`docs/`](docs/), and its observed results are analyzed in the [quantitative report](reports/concurrency-performance-analysis.md). Existing CSV files are kept unchanged.

## Safety and prerequisites

- Run only against a **separate local PostgreSQL benchmark database**, not production or shared data; the scripts create carts and submit preview orders.
- Start Docker/PostgreSQL, apply the project's migrations and seed menu data, and start the Express backend using the benchmark database.
- Requirements: Node.js, Windows PowerShell, and **k6** for the k6-backed tests. The mock AI tests require the already-integrated benchmark provider and local control routes.
- Use a single Node.js backend process bound to `127.0.0.1`. Run benchmark scenarios **sequentially**, not simultaneously.
- The `BENCHMARK_MODE` mock provider must remain disabled in production. Never commit a real API token or database password. Set the same `BENCHMARK_TOKEN` in the server and test shells for controlled-gate tests.

From `apps/server`, configure local-only environment variables before `npm run dev`:

```powershell
$env:DATABASE_URL="postgresql://postgres:<LOCAL_PASSWORD>@127.0.0.1:5433/ai_bistro_benchmark"
$env:DIRECT_URL=$env:DATABASE_URL
$env:NODE_ENV="development"
$env:BENCHMARK_MODE="true"
$env:LLM_PROVIDER="mock"
$env:BENCHMARK_TOKEN="<local-test-token-at-least-16-characters>"
npm run dev
```

In another shell, from the **repository root**, export the same test token when using mock gates. The token and credentials above are placeholders; use your own local values.

## Experiment matrix

| Scenario | Purpose | Runner | Documentation |
| --- | --- | --- | --- |
| Duplicate checkout | Only one successful checkout per cart under contended requests | `run-duplicate-checkout.ps1` | [Duplicate checkout](docs/duplicate-checkout.md) |
| Cart lifecycle race | Checkout racing with add/update/clear and stale mutation | `run-cart-lifecycle-race.ps1` | [Cart lifecycle](docs/cart-lifecycle-race.md) |
| AI vs checkout | Delay an AI turn until after checkout, then ensure it cannot mutate a submitted cart | `run-ai-checkout-race.ps1` | [AI vs checkout](docs/ai-checkout-race.md) |
| Concurrent AI turns | Same-session overlap, controlled rejection and sequential retry | `run-concurrent-ai-turns.ps1` | [Concurrent AI turns](docs/concurrent-ai-turns.md) |
| Multi-kiosk ordering | Independent carts and sessions at 5–100 simultaneous kiosks | `run-multi-kiosk-ordering.ps1` | [Multi-kiosk](docs/multi-kiosk-ordering.md) |

Run examples:

```powershell
.\benchmarks\scripts\run-duplicate-checkout.ps1 -Levels '20,50,100' -Repeats 3
.\benchmarks\scripts\run-cart-lifecycle-race.ps1 -Repeats 30
.\benchmarks\scripts\run-ai-checkout-race.ps1 -Repeats 2
.\benchmarks\scripts\run-concurrent-ai-turns.ps1 -Repeats 30
.\benchmarks\scripts\run-multi-kiosk-ordering.ps1 -Levels '5,10,20,50,100' -Repeats 3
```

See each linked document for its setup, assertions, and limitations. Other basic k6 scenarios are available in [`scenarios/`](scenarios/), including menu-read and cart-flow smoke/load probes.

## Evidence layout

- [`results/before-fix/`](results/before-fix/): historic baselines **before** the relevant fixes.
- [`results/after-fix/`](results/after-fix/): historic **after** results; do not overwrite them.
- [`results/regression/`](results/regression/): subsequent regression runs after the transaction-context correction.

Each named run uses a timestamped ID, with `-rounds.csv` (round-level assertions), `-requests.csv` (request-level details), and in the multi-kiosk case `-kiosks.csv` (workflow-level details). The provided runners generally write **new runs to their default output location** (`benchmarks/results/` for most scenarios, `benchmarks/results/performance-baseline/` for multi-kiosk). **Move only completed, validated runs** into the appropriate archival folder; the paths above are evidence archives, not automatic destinations. Do not conflate historic baseline runs with fresh reruns.

Use CSV business assertions, not solely HTTP status or aggregate k6 `http_req_failed`: a successful HTTP 200 can still be a business failure, and an intentional HTTP 409 can be a correct outcome.

## Results overview

| Experiment | Before | After | Post-fix regression |
| --- | --- | --- | --- |
| Duplicate checkout | 501 extra successful checkouts across 9 rounds | 0 across 9 rounds | 9/9 correct |
| Cart lifecycle | 6-round diagnostic baseline; harness classification partly incorrect; one empty-cart checkout returned 500 | 90/90 correct | 30/30 correct |
| Concurrent AI turns | Add→Clear semantic order wrong in 30/30 controlled cases | 60/60 correct with rejection + explicit retry | 4/4 correct |
| Multi-kiosk ordering | 58/555 completed workflows | 555/555 completed workflows | — |

The [full report](reports/concurrency-performance-analysis.md) defines the denominators, shows results by concurrency level, identifies run IDs, and describes limitations. These are **deterministic mock-LLM, wave-based local experiments**, not production capacity measurements.
