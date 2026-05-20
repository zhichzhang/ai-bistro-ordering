import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrderingRouter } from "../ordering.routes";
import type { OrderingService } from "../../services/ordering.service";

describe("ordering routes", () => {
    const orderingService = {
        handleUserMessage: vi.fn(),
    } as unknown as OrderingService;

    const app = express();

    app.use(express.json());
    app.use("/ordering", createOrderingRouter(orderingService));

    app.use(
        (
            err: unknown,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction
        ) => {
            const message = err instanceof Error ? err.message : "Internal Server Error";
            res.status(500).json({
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message,
                },
            });
        }
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("POST /ordering/sessions/:sessionId/turn should orchestrate a turn", async () => {
        vi.mocked(orderingService.handleUserMessage).mockResolvedValue({
            sessionId: "chat-session-1",
            chatMessageId: "user-msg-1",
            cartId: "cart-1",
            normalization: {
                intent: "add_item",
                status: "success",
                actions: [],
                question: "",
                message: "",
                suggestions: [],
                error_type: "",
                confidence: 0.98,
            } as any,
            resolutions: [],
            assistantMessage: '{"successCount":1,"clarificationCount":0,"errorCount":0,"resolutions":[]}',
        } as any);

        const res = await request(app)
            .post("/ordering/sessions/chat-session-1/turn")
            .send({
                userMessage: "Add fries",
            });

        expect(res.status).toBe(200);
        expect(res.body.sessionId).toBe("chat-session-1");
        expect(res.body.chatMessageId).toBe("user-msg-1");
        expect(res.body.cartId).toBe("cart-1");
        expect(res.body.assistantMessage).toContain("successCount");
        expect(orderingService.handleUserMessage).toHaveBeenCalledWith({
            sessionId: "chat-session-1",
            userMessage: "Add fries",
        });
    });

    it("POST /ordering/sessions/:sessionId/turn should return 400 when userMessage is missing", async () => {
        const res = await request(app)
            .post("/ordering/sessions/chat-session-1/turn")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: "userMessage is required.",
            },
        });
    });

    it("POST /ordering/sessions/:sessionId/turn should forward service errors to middleware", async () => {
        vi.mocked(orderingService.handleUserMessage).mockRejectedValue(
            new Error("DB failed")
        );

        const res = await request(app)
            .post("/ordering/sessions/chat-session-1/turn")
            .send({
                userMessage: "Add fries",
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "DB failed",
            },
        });
        expect(orderingService.handleUserMessage).toHaveBeenCalledWith({
            sessionId: "chat-session-1",
            userMessage: "Add fries",
        });
    });
});