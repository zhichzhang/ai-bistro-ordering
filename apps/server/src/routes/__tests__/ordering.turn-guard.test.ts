import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createOrderingRouter } from "../ordering.routes";
import type { OrderingService } from "../../services/ordering.service";

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<T>((a, b) => { resolve = a; reject = b; });
    return { promise, resolve, reject };
}
const reply = (sessionId: string) => ({
    status: "success",
    sessionId,
    chatMessageId: "message-1",
    cartId: "cart-1",
    normalization: { intent: "add_item", status: "success", actions: [] },
    resolutions: [],
    assistantMessage: "ok",
    cart: null,
});
function harness(handleUserMessage: (args: { sessionId: string; userMessage: string }) => Promise<any>) {
    const app = express();
    app.use(express.json());
    app.use("/ordering", createOrderingRouter({ handleUserMessage } as OrderingService));
    app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR" } });
    });
    return app;
}

async function waitUntil(check: () => boolean) {
    for (let i = 0; i < 100; i++) {
        if (check()) return;
        await new Promise(resolve => setTimeout(resolve, 5));
    }
    throw new Error("Request did not enter the service");
}

describe("per-session AI turn guard", () => {
    it("rejects an overlapping turn for the same session, without invoking the service", async () => {
        const gate = deferred<any>();
        const service = vi.fn(() => gate.promise);
        const app = harness(service);
        const first = request(app).post("/ordering/sessions/s1/turn")
            .send({ userMessage: "Add one sandwich" });
        const running = first.then(value => value);
        await waitUntil(() => service.mock.calls.length === 1);
        const second = await request(app).post("/ordering/sessions/s1/turn")
            .send({ userMessage: "Clear cart" });
        expect(second.status).toBe(409);
        expect(second.body.error.code).toBe("TURN_IN_PROGRESS");
        expect(service).toHaveBeenCalledTimes(1);
        gate.resolve(reply("s1"));
        expect((await running).status).toBe(200);
        const retry = await request(app).post("/ordering/sessions/s1/turn")
            .send({ userMessage: "Clear cart" });
        expect(retry.status).toBe(200); // only if service permits a new turn
        expect(service).toHaveBeenCalledTimes(2);
    });

    it("allows two different sessions to execute concurrently", async () => {
        const gates = new Map([['s1', deferred<any>()], ['s2', deferred<any>()]]);
        const service = vi.fn(({ sessionId }: { sessionId: string }) => gates.get(sessionId)!.promise);
        const app = harness(service);
        const first = request(app).post("/ordering/sessions/s1/turn").send({ userMessage: "Add" }).then(x => x);
        const second = request(app).post("/ordering/sessions/s2/turn").send({ userMessage: "Add" }).then(x => x);
        await waitUntil(() => service.mock.calls.length === 2);
        gates.get('s2')!.resolve(reply('s2'));
        expect((await second).status).toBe(200);
        gates.get('s1')!.resolve(reply('s1'));
        expect((await first).status).toBe(200);
    });

    it("releases the guard when the first turn fails", async () => {
        const gate = deferred<any>();
        const service = vi.fn().mockImplementationOnce(() => gate.promise)
            .mockResolvedValue(reply("s1"));
        const app = harness(service);
        const first = request(app).post("/ordering/sessions/s1/turn")
            .send({ userMessage: "Add" }).then(x => x);
        await waitUntil(() => service.mock.calls.length === 1);
        gate.reject(new Error("Mock failed"));
        expect((await first).status).toBe(500);
        const retry = await request(app).post("/ordering/sessions/s1/turn")
            .send({ userMessage: "Add" });
        expect(retry.status).toBe(200);
    });

    it("does not acquire a session slot on invalid requests", async () => {
        const service = vi.fn().mockResolvedValue(reply("s1"));
        const app = harness(service);
        expect((await request(app).post('/ordering/sessions/s1/turn').send({})).status).toBe(400);
        expect((await request(app).post('/ordering/sessions/s1/turn').send({userMessage:'Add'})).status).toBe(200);
        expect(service).toHaveBeenCalledTimes(1);
    });
});
