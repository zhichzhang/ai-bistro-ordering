import { Router } from "express";

export function createHealthRouter(): Router {
    const router = Router();

    /**
     * GET /health
     * Lightweight service health check endpoint.
     */
    router.get("/", (_req, res) => {
        res.status(200).json({ ok: true });
    });

    return router;
}