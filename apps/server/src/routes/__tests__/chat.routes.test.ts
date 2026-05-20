import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChatRouter } from "../chat.routes";
import type { ChatService } from "../../services/chat.service";
import { ChatRepository } from "../../db/repositories/chat.repository";

vi.mock("../../db/repositories/chat.repository", () => ({
    ChatRepository: {
        getChatSessionById: vi.fn(),
    },
}));

describe("chat routes", () => {
    const chatService = {
        ensureSession: vi.fn(),
        getRecentMessages: vi.fn(),
    } as unknown as ChatService;

    const app = express();

    app.use(express.json());
    app.use("/chat", createChatRouter(chatService));

    app.use(
        (
            err: unknown,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction
        ) => {
            const message =
                err instanceof Error ? err.message : "Internal Server Error";
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

    it("POST /chat/sessions should create a session", async () => {
        vi.mocked(chatService.ensureSession).mockResolvedValue({
            id: "chat-session-1",
            created_at: "2026-05-16T00:00:00.000Z",
            updated_at: "2026-05-16T00:00:00.000Z",
        } as any);

        const res = await request(app).post("/chat/sessions").send({});

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            sessionId: "chat-session-1",
        });
        expect(chatService.ensureSession).toHaveBeenCalledTimes(1);
    });

    it("GET /chat/sessions/:sessionId/messages should return 404 when session not found", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue(null);

        const res = await request(app).get(
            "/chat/sessions/missing-session/messages"
        );

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: {
                code: "NOT_FOUND",
                message: "Chat session not found.",
            },
        });
        expect(chatService.getRecentMessages).not.toHaveBeenCalled();
    });

    it("GET /chat/sessions/:sessionId/messages should return session and messages", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue({
            id: "chat-session-1",
            cart_id: "cart-1",
            created_at: "2026-05-16T00:00:00.000Z",
            updated_at: "2026-05-16T00:00:00.000Z",
        } as any);

        vi.mocked(chatService.getRecentMessages).mockResolvedValue([
            {
                id: "msg-1",
                role: "user",
                content: "Add fries",
                created_at: "2026-05-16T00:01:00.000Z",
                error_type: null,
            },
            {
                id: "msg-2",
                role: "assistant",
                content: "Added fries",
                created_at: "2026-05-16T00:02:00.000Z",
                error_type: null,
            },
        ] as any);

        const res = await request(app).get(
            "/chat/sessions/chat-session-1/messages"
        );

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            session: {
                id: "chat-session-1",
                createdAt: "2026-05-16T00:00:00.000Z",
                updatedAt: "2026-05-16T00:00:00.000Z",
            },
            messages: [
                {
                    id: "msg-1",
                    role: "user",
                    content: "Add fries",
                    createdAt: "2026-05-16T00:01:00.000Z",
                    errorType: null,
                },
                {
                    id: "msg-2",
                    role: "assistant",
                    content: "Added fries",
                    createdAt: "2026-05-16T00:02:00.000Z",
                    errorType: null,
                },
            ],
        });

        expect(ChatRepository.getChatSessionById).toHaveBeenCalledWith(
            "chat-session-1"
        );
        expect(chatService.getRecentMessages).toHaveBeenCalledWith(
            "chat-session-1",
            100
        );
    });
});