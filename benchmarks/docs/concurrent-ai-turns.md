# Concurrent AI Turns — Ordering and Session Guard

[Benchmark index](../README.md) · [Quantitative report](../../../../../../../../Downloads/ai-bistro-ordering-reviewed-readmes/benchmarks/reports/concurrency-performance-analysis.md)

## Problem

Two turns against **one chat session** can overlap: turn A starts first but waits for mock normalization; B can finish first. The `Add → Clear` case reveals semantic reordering: with unrestricted overlap, the final quantity can be `1` rather than the intended `0`. `Add → Add` is a commutative control: its final quantity is `2` even when execution order is reversed.

## Fix and contract

A **synchronous, per-session in-memory admission guard** rejects a second overlapping turn with HTTP `409 TURN_IN_PROGRESS`; it does **not** silently queue turn B. After A completes, an explicit client/test retry of B succeeds. The guard is released in `finally`, including on errors. Per-request timing avoids collisions from a shared `console.time` label.

## Deterministic method

1. Create a new cart/session and start AI turn A (`Add one beef sandwich`).
2. Pause A at the mock normalization gate and verify the pause is active.
3. Submit B while A is in progress; after the fix B is rejected with 409, and cart/history are unchanged.
4. Release A; retry B *sequentially* after A finishes.
5. Validate quantity, revision delta, persisted messages/actions, retry and ordering semantics.

```powershell
# From repository root, after setting BENCHMARK_TOKEN to match local server
.\benchmarks\scripts\run-concurrent-ai-turns.ps1 -Repeats 30
```

Runner: [`run-concurrent-ai-turns.ps1`](../scripts/run-concurrent-ai-turns.ps1). Test: [`concurrent-ai-turns.mjs`](../scripts/concurrent-ai-turns.mjs).

## Recorded results

| Mode | Before semantic correctness | After overall correctness |
| --- | ---: | ---: |
| Add + Add | 30/30 (commutative control) | 30/30 |
| Add + Clear | **0/30** | **30/30** |
| Total | No single equivalent correctness score in original CSV | **60/60** |

- Before: [`20261123-093812-732-rounds.csv`](../results/before-fix/concurrent-ai-turns-20261123-093812-732-rounds.csv): original diagnostic records `semanticOrderMatches=false` in all 30 Add+Clear rounds. An observed reordering was **not** automatically a database consistency violation or an existing documented FIFO promise.
- After: [`20261123-094509-119-rounds.csv`](../results/after-fix/concurrent-ai-turns-20261123-094509-119-rounds.csv): **60/60 `correct=true`**, with controlled 409 then explicit sequential retry.
- Regression: [`20261123-104153-350-rounds.csv`](../results/regression/concurrent-ai-turns-20261123-104153-350-rounds.csv): **4/4** correct, with two cases per mode.

## Limitations

The guard is **process-local**. Other replicas/workers do not share the same guard; multi-instance deployment requires a shared admission mechanism. The guard serializes by **server arrival**, not by frontend send order in the presence of network reordering. Manual cart operations are governed separately by the cart transaction/state checks. The test bypasses the UI's ordinary overlapping-send prevention; no real LLM calls are made.
