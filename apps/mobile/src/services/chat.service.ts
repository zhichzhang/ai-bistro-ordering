// apps/mobile/src/services/chat.service.ts

import { apiService } from "./api.service";

import type {
    ChatMessageDto,
    CreateChatSessionResponse,
} from "../types/chat.types";

export const chatService = {
    /**
     * Create a new chat session.
     */
    async createSession() {
        return apiService.post<CreateChatSessionResponse>(
            "/chat/sessions"
        );
    },

    /**
     * Fetch message history for a chat session.
     */
    async getMessages(
        sessionId: string
    ) {
        return apiService.get<ChatMessageDto[]>(
            `/chat/sessions/${sessionId}/messages`
        );
    },
};