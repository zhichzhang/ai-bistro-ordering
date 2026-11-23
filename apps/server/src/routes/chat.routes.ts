import { Router } from "express";

import { ChatRepository } from "../db/repositories/chat.repository";
import { ChatService } from "../services/chat.service";

import type {
    ChatHistoryResponse,
    CreateChatSessionResponse,
} from "../types/chat.types";

export function createChatRouter(
    chatService: ChatService
): Router {
    const router = Router();

    /**
     * POST /chat/sessions
     * Create a new chat session.
     */
    router.post("/sessions", async (_req, res, next) => {
        try {
            const session =
                await chatService.ensureSession();

            const body: CreateChatSessionResponse = {
                sessionId: session.id,
            };

            res.status(201).json(body);

        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /chat/sessions/:sessionId/messages
     * Load recent chat history for a session.
     */
    router.get("/sessions/:sessionId/messages", async (req, res, next) => {
        try {
            const session =
                await ChatRepository.getChatSessionById(
                    req.params.sessionId
                );

            if (!session) {
                res.status(404).json({
                    error: {
                        code: "NOT_FOUND",
                        message: "Chat session not found.",
                    },
                });

                return;
            }

            const messages =
                await chatService.getRecentMessages(
                    session.id,
                    100
                );

            const response: ChatHistoryResponse = {
                session: {
                    id: session.id,
                    cartId: session.cart_id,
                    createdAt: session.created_at,
                    updatedAt: session.updated_at,
                },

                messages: messages.map((message) => ({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    createdAt: message.created_at,
                    errorType: message.error_type,
                })),
            };

            res.json(response);

        } catch (error) {
            next(error);
        }
    });

    return router;
}