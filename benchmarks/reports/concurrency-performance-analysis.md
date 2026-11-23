# Backend Concurrency, Reliability & Performance — Quantitative Analysis

> **Evidence scope:** local Express + Prisma 7 + PostgreSQL with deterministic mock LLM for AI tests, one Node.js process. These were historical before/after runs under explicitly controlled test conditions, **not** production deployments or payment-order measurements. All cited CSVs are preserved in this repository.

[Benchmark index](../README.md) · [Main project README](../../../../../../../../Downloads/ai-bistro-ordering-reviewed-readmes/README.md)

## Executive summary

| Experiment | Before | After fix | Later regression |
| --- | --- | --- | --- |
| Duplicate checkout, one cart under 20/50/100 parallel requests | **501 extra successful responses** in 510 attempts (9 rounds) | **0** extra successes; 9 success + 501 expected 409 | 9/9 correct |
| Cart lifecycle vs checkout | 6 diagnostic baseline rounds; test harness misclassified valid interleavings; **one empty-cart 500** | **90/90 correct**, with controlled empty-cart 400 | 30/30 correct |
| Concurrent AI turns (same session), Add→Clear | **0/30** preserve intended semantic order | **30/30** correct by reject + explicit retry; overall **60/60** | 4/4 correct |
| Multi-kiosk independent workflows, 5–100 parallel | **58/555 completed (10.45%)** | **555/555 completed (100%)** | Not repeated as separate regression; after-fix run is final full load validation |

**Interpretation:** the largest measured reliability improvement was the end-to-end multi-kiosk completion rate, rising **89.55 percentage points**. The after-fix workload completed **497 additional workflows** out of the same 555 attempted. These are workload-specific observations, not a statistical guarantee of future error-free operation.

## Environment and measurement rules

The scripts target a locally hosted Express REST API with a dedicated PostgreSQL benchmark database, Prisma repositories, and versioned menu fixture. k6 generates `http.batch`-based checkout/cart races; Node.js fetch scripts control mock-LLM timing and independent kiosk workflows. No live LLM tokens, external payments or fulfillment are involved. The original tests were run on a Windows workstation with local Docker PostgreSQL; detailed CPU, PostgreSQL config and hardware specifications were not captured in the CSV and are therefore **not asserted** here.

Three types of measurements must not be confused:

1. **Request transport success:** HTTP 2xx/4xx/5xx (an intentional 409 can be *correct*).
2. **Business invariants:** e.g. one successful checkout per cart, rejected stale mutation, correct final quantity and persisted history.
3. **Workflow success and performance:** all stages completed on a kiosk, wave elapsed time and measured AI/checkout request latency.

A business response can be HTTP 200 while containing `status=error`, which is why the multi-kiosk harness checks both. The values in the multi-kiosk tables below are **three-run descriptive statistics per load level**; no significance tests or production-SLA claims are made.

## Experiment 1 — Duplicate checkout

**Invariant:** each initially active, nonempty cart may be submitted **at most once**. The current contract rejects later attempts (HTTP 409) rather than replaying an idempotency-key response.

Fresh carts were subjected to 20/50/100 simultaneous checkout calls, each level repeated three times. Total attempted checkout requests: `3 × (20+50+100) = 510`, in 9 rounds. The original k6 summary counted **546 total HTTP requests**, because it also counted 36 setup/verification calls.

| Parallel requests per cart | Total attempts | Before extra successes | After extra successes | After 409 rejections | Correct rounds after |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 20 (×3 rounds) | 60 | 57 | 0 | 57 | 3/3 |
| 50 (×3 rounds) | 150 | 147 | 0 | 147 | 3/3 |
| 100 (×3 rounds) | 300 | 297 | 0 | 297 | 3/3 |
| **Total** | **510** | **501** | **0** | **501** | **9/9** |

Per-round extra successes = `max(0, successfulCheckoutResponses − 1)`. As a fraction of checkout *attempts*, duplicate-success responses fell from **501/510 = 98.24%** to **0/510 = 0%**. Before the fix, 510 distinct response order IDs were returned across nine rounds, with revision increasing once per successful duplicate; after the fix, there were exactly nine distinct order IDs and one checkout revision increment per original cart.

**Fix:** a PostgreSQL `SELECT ... FOR UPDATE` lock and an active-state check *inside* a Prisma transaction turn checkout into a single-cart critical section. Post-fix 9/9 regression rounds again had zero duplicate successes.

**Avoid misleading speed claims:** the batch duration fell after the fix but 501 requests now take the shorter **rejection** path. These are different executed workloads, not proof that a successful checkout alone became faster. All IDs are for **preview orders**, not charged payments.

**Evidence:** [before rounds](../results/before-fix/duplicate-checkout-20261123-004132-867-rounds.csv) · [after rounds](../results/after-fix/duplicate-checkout-20261123-010050-931-rounds.csv) · [regression rounds](../results/regression/duplicate-checkout-20261123-024142-122-rounds.csv) · [experiment protocol](../docs/duplicate-checkout.md).

## Experiment 2 — Cart lifecycle and stale writes

The harness tests checkout racing with `add`, `update`, and `clear`, plus a late mutation after successful checkout. **Ordering is intentionally nondeterministic**; valid final states depend on which mutation commits first. If `clear` wins, the now-empty cart must reject checkout as a *controlled 4xx*, while remaining active and empty. If checkout wins, stale mutation must be rejected as `409 CART_NOT_ACTIVE`.

| Result set | Add | Update | Clear | Overall |
| --- | ---: | ---: | ---: | ---: |
| Original diagnostic (before; classifier partly faulty) | 2 rounds | 2 rounds | 2 rounds | **Not a valid backend failure rate** |
| After-fix | 30/30 | 30/30 | 30/30 | **90/90 correct** |
| Post-fix regression | 10/10 | 10/10 | 10/10 | **30/30 correct** |

The original six-row CSV contains **one clear empty-cart checkout HTTP 500**, which was subsequently mapped to a controlled HTTP 400. Other original `correct=false` entries cannot be presented as six real backend failures because the initial harness incorrectly classified some valid interleavings. This limitation is retained rather than retroactively rewriting evidence.

**Evidence:** [before rounds](../results/before-fix/cart-lifecycle-20261123-010658-637-rounds.csv) · [after rounds](../results/after-fix/cart-lifecycle-20261123-011239-579-rounds.csv) · [regression rounds](../results/regression/cart-lifecycle-20261123-024149-617-rounds.csv) · [protocol](../docs/cart-lifecycle-race.md).

## Experiment 3 — Concurrent AI turns

The benchmark creates **one shared session per round**, holds turn A in a deterministic mock normalization gate and submits B. Without an admission guard, B could complete first. Two controlled modes distinguish the actual semantic error from harmless commutation:

| Controlled mode | Before semantic-order matches | After guarded/retried workflow correct |
| --- | ---: | ---: |
| Add → Add | 30/30 | 30/30 |
| Add → Clear | **0/30** | **30/30** |
| **Total after** | — | **60/60** |

The fix rejects overlapping B immediately with HTTP `409 TURN_IN_PROGRESS` and requires the caller to retry B **after** A finishes. This is a **reject-and-retry** policy, *not* server-side FIFO queuing. The session guard is in-memory and single-process only. The original diagnostic did not assert that the application had promised FIFO ordering, so its `0/30` measures a controlled **semantic order mismatch**, not 30 corrupted database transactions.

**Regression:** a later 4-round smoke (two per mode) passed after the transaction-context fix.

**Evidence:** [before rounds](../results/before-fix/concurrent-ai-turns-20261123-093812-732-rounds.csv) · [after rounds](../results/after-fix/concurrent-ai-turns-20261123-094509-119-rounds.csv) · [regression rounds](../results/regression/concurrent-ai-turns-20261123-104153-350-rounds.csv) · [protocol](../docs/concurrent-ai-turns.md).

## Experiment 4 — Independent multi-kiosk workflow reliability and latency

Every kiosk owns a distinct cart/session. Each completes **two sequential AI turns**, cart verification, checkout and submitted-cart verification. Concurrent kiosk levels: **5, 10, 20, 50, 100**, with three rounds at each level (15 waves; `3 × (5+10+20+50+100) = 555` workflows).

| Kiosks | Before successful | After successful | Before mean round AI p95 | After mean round AI p95 | After mean orders/s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 15/15 | 15/15 | 108 ms | 116 ms | 18.91 |
| 10 | 0/30 | **30/30** | 5,167 ms | **188 ms** | 22.12 |
| 20 | 14/60 | **60/60** | 5,340 ms | **346 ms** | 24.85 |
| 50 | 14/150 | **150/150** | 5,741 ms | **855 ms** | 24.27 |
| 100 | 15/300 | **300/300** | 6,462 ms | **1,969 ms** | 22.92 |
| **Total** | **58/555** | **555/555** | — | — | — |

**10-kiosk latency illustration:** the arithmetic mean of three per-wave AI p95 values fell from **5,166.59ms** to **187.69ms**, a **96.37%** reduction for the observed request population. The **before-fix** measurement includes *failed* AI business responses; it does not measure the before-fix latency of 30 successful orders (there were none). Avoid calling this a production latency SLA.

The after-fix run achieved 555 unique completed workflows and 1,110 successful AI turns. At high concurrency, p95 still grew (about 1.97 seconds at 100 kiosks). Mean completed-order rate peaked at **24.85 orders/s at 20 concurrent kiosks** and was **22.92 orders/s at 100**. These are short **closed-loop wave completion rates** (`successfulOrders / waveSeconds`), not an open-loop offered load or steady-state capacity.

**Remediation and causal evidence:** the cart code propagates an active Prisma transaction via `AsyncLocalStorage`, while pre-fix menu queries bypassed it by calling the global Prisma Client. During the failing 10-kiosk test, PostgreSQL showed up to **10 `idle in transaction`** connections for several seconds, with AI responses near five seconds. Changing `MenuRepository` to use the shared `db()` client eliminated that failure pattern in the matched after-fix experiment. This is strong evidence of **transaction-context-dependent connection contention**, but does not by itself quantify pool wait time or conclusively identify a particular driver timeout.

**Evidence:** [before rounds](../results/before-fix/multi-kiosk-20261123-100310-360-rounds.csv), [before requests](../results/before-fix/multi-kiosk-20261123-100310-360-requests.csv), [after rounds](../results/after-fix/multi-kiosk-20261123-103437-123-rounds.csv), [after kiosks](../results/after-fix/multi-kiosk-20261123-103437-123-kiosks.csv), [after requests](../results/after-fix/multi-kiosk-20261123-103437-123-requests.csv) · [protocol](../docs/multi-kiosk-ordering.md).

## Additional controlled test — Late AI vs checkout

A deterministic mock normalization gate pauses an AI action; the original cart is checked out before the request continues. The expected invariant is **no late mutation to the submitted cart**. This scenario was previously reported to pass **32/32**, but the supplied ZIP does **not** contain those CSVs. It is therefore included as an *unarchived validation*, not counted as a verified Before/After measurement. [Protocol](../docs/ai-checkout-race.md).

## Regression and limitations

After the Prisma repository-context fix, archived regression evidence shows: **duplicate checkout 9/9**, **cart lifecycle 30/30**, and **concurrent AI turns 4/4**. Regression run sizes differ from the earlier full after-fix tests, and should not be conflated with them.

**Important boundaries:**

- Single Node.js process; the per-session AI turn guard does **not** coordinate multiple replicas.
- Deterministic mock LLM; no live provider errors, token costs or network latency.
- Simulated preview checkout, not money movement, fulfillment or payment idempotency.
- Windows/Docker workstation with no complete hardware profiling; numbers are **environment-specific**.
- The original cart lifecycle harness was partly incorrect; do not compute a false “0%→100% backend fix rate” from its 6 rows.
- Wave tests are short and have three repeats; they are descriptive, not statistically powered confidence estimates.
- Cross-cart ownership, sustained steady-state traffic, and multi-instance coordination were not established by these experiments.

For the actual commands and source protocols, begin at the [benchmark index](../README.md). All CSV paths above are linked to the **archived files** and may be independently recomputed.
