import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createHealthRouter } from "../health.routes";

describe("health routes", () => {
    const app = express();

    app.use(express.json());

    app.use("/health", createHealthRouter());

    it("GET /health should return ok status", async () => {
        const res = await request(app).get("/health");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            ok: true,
        });
    });

    it("GET /health should return json", async () => {
        const res = await request(app).get("/health");

        expect(res.headers["content-type"])
            .toContain("application/json");
    });
});