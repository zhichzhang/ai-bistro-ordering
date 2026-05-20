import { Router } from "express";
import { ChatService } from "../services/chat.service";
import type { CreateChatSessionResponse, ChatHistoryResponse } from "../types/chat.types";
import {ChatRepository} from "../db/repositories/chat.repository";

export function createChatRouter(chatService: ChatService): Router {
    const router = Router();

    router.post("/sessions", async (_req, res, next) => {
        try {
            const session = await chatService.ensureSession();
            const body: CreateChatSessionResponse = { sessionId: session.id };
            res.status(201).json(body);
        } catch (error) {
            next(error);
        }
    });

    router.get("/sessions/:sessionId/messages", async (req, res, next) => {
        try {
            const session = await ChatRepository.getChatSessionById(req.params.sessionId);
            if (!session) {
                res.status(404).json({
                    error: { code: "NOT_FOUND", message: "Chat session not found." },
                });
                return;
            }

            const messages = await chatService.getRecentMessages(session.id, 100);

            res.json({
                session: {
                    id: session.id,
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
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}