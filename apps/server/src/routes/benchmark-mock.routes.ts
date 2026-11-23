import { Router } from "express";
import type { BenchmarkMockLLMService } from "../services/benchmark-mock-llm.service";

export function createBenchmarkMockRouter(mock: BenchmarkMockLLMService): Router {
    const router = Router();
    const secret = process.env.BENCHMARK_TOKEN;
    if (!secret || secret.length < 16) throw new Error("BENCHMARK_TOKEN must be at least 16 characters");
    router.use((req, res, next) => {
        const remote = req.socket.remoteAddress ?? "";
        const local = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
        if (!local || req.get("x-benchmark-token") !== secret) {
            res.sendStatus(403);
            return;
        }
        next();
    });
    router.post("/gates", (req, res) => {
        if (req.body?.stage !== "normalization" && req.body?.stage !== "resolution") {
            res.status(400).json({ error: "Invalid stage" });
            return;
        }
        try { res.status(201).json({ gateId: mock.arm(req.body.stage) }); }
        catch (error) { res.status(429).json({ error: String(error) }); }
    });
    router.get("/gates/:gateId", (req, res) => {
        const state = mock.status(req.params.gateId);
        if (!state) { res.sendStatus(404); return; }
        res.json({ state });
    });
    router.post("/gates/:gateId/release", (req, res) => {
        if (!mock.release(req.params.gateId)) { res.status(409).json({ error: "Gate unavailable" }); return; }
        res.json({ released: true });
    });
    return router;
}
