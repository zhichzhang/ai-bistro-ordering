# Controlled AI vs Checkout Race

[Benchmark index](../README.md) · [Quantitative report](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/reports/concurrency-performance-analysis.md)

## Purpose

Test whether an AI ordering request that **starts before checkout but resolves afterward** can illegally modify a submitted cart. This is a **correctness guard test**, not an AI latency or throughput measurement.

## Deterministic protocol

1. Create an original cart/session and seed two beef sandwiches.
2. Arm a **local controlled mock** at the normalization stage.
3. Begin an AI request; wait for an explicit gate signal verifying it is paused.
4. Checkout the original cart and verify it was submitted.
5. Release the mock and allow the AI pipeline to proceed.
6. Assert no late cart mutation occurred, quantity/revision remain correct, and AI history/response does not falsely claim the mutation succeeded.

This exercises real Express routing, parsing, cart service, Prisma and PostgreSQL; **only LLM text generation is mocked**. It avoids real Gemini/OpenAI tokens and arbitrary `sleep` timing.

## Run

Start a loopback-only local mock backend, configured per the [benchmark index](../README.md), and put the **matching BENCHMARK_TOKEN** in the runner shell:

```powershell
.\benchmarks\scripts\run-ai-checkout-race.ps1 -Repeats 2
# For the previously recorded controlled validation: -Repeats 30
```

Runner: [`run-ai-checkout-race.ps1`](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/scripts/run-ai-checkout-race.ps1). Test: [`ai-checkout-race.mjs`](../../../../../../../../Downloads/ai-bistro-ordering-benchmark-docs/benchmarks/scripts/ai-checkout-race.mjs). Results are timestamped round- and request-level CSVs in the default `benchmarks/results/` directory.

## Evidence and scope

An earlier controlled AI-vs-checkout verification was reported as **32/32 passed**, but **its CSVs are not present in the supplied evidence archive**. The consolidated report therefore treats it as a previously reported regression result rather than an audited Before/After comparison. Run and preserve a new CSV if you want this test to be independently auditable from the repository.

Mock gates are server-local and should not be shared by multiple simultaneous benchmark processes. The test does not demonstrate distributed coordination, payment safety or live-model behavior.
