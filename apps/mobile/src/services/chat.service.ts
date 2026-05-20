// apps/mobile/src/services/chat.service.ts

import { apiService }
    from "./api.service";

import type {
    ChatMessageDto,
    CreateChatSessionResponse,
} from "../types/chat.types";

export const chatService = {

    //
    // CREATE CHAT SESSION
    //

    async createSession() {

        return apiService.post<CreateChatSessionResponse>(
            "/chat/sessions"
        );
    },

    //
    // GET CHAT HISTORY
    //

    async getMessages(
        sessionId: string
    ) {

        return apiService.get<ChatMessageDto[]>(
            `/chat/sessions/${sessionId}/messages`
        );
    },
};