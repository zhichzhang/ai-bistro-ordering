// apps/server/src/services/chat.service.ts

import { ChatRepository } from "../db/repositories/chat.repository";

import type {
    ChatMessageActionRow,
    ChatMessageRow,
    ChatSessionRow,
} from "../types/db.types";

export type ChatContextMessage = Pick<
    ChatMessageRow,
    "id" | "role" | "content" | "created_at" | "error_type"
>;

export type ChatContext = {
    session: ChatSessionRow;
    recentMessages: ChatContextMessage[];
};

export type AssistantMessagePayload = {
    normalization?: unknown;
    resolutions?: unknown;
    cartSnapshot?: unknown;
    question?: string;
    message?: string;
};

export class ChatService {
    async ensureSession(
        sessionId?: string
    ): Promise<ChatSessionRow> {
        if (sessionId) {
            const existing =
                await ChatRepository.getChatSessionById(sessionId);

            if (existing) {
                return existing;
            }
        }

        return ChatRepository.createChatSession();
    }

    async createUserMessage(input: {
        chatSessionId: string;
        content: string;
        parsedAction?: Record<string, unknown> | null;
    }): Promise<ChatMessageRow> {
        return ChatRepository.createChatMessage({
            chatSessionId: input.chatSessionId,
            role: "user",
            content: input.content,
            parsedAction: input.parsedAction ?? null,
            errorType: null,
        });
    }

    async createAssistantMessage(input: {
        chatSessionId: string;
        content: string;
        payload?: AssistantMessagePayload;
        errorType?: string | null;
    }): Promise<ChatMessageRow> {
        return ChatRepository.createChatMessage({
            chatSessionId: input.chatSessionId,
            role: "assistant",
            content: input.content,
            parsedAction:
                (input.payload ?? null) as Record<string, unknown> | null,
            errorType: input.errorType ?? null,
        });
    }

    /**
     * Load recent chat history for conversational grounding.
     */
    async getRecentMessages(
        chatSessionId: string,
        limit: number = 8
    ): Promise<ChatContextMessage[]> {
        const messages =
            await ChatRepository.listMessagesBySessionId(chatSessionId);

        return messages.slice(-limit).map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            created_at: message.created_at,
            error_type: message.error_type,
        }));
    }

    async buildChatContext(
        chatSessionId: string,
        limit: number = 8
    ): Promise<ChatContext> {
        const session =
            await ChatRepository.getChatSessionById(chatSessionId);

        if (!session) {
            throw new Error(`Chat session not found: ${chatSessionId}`);
        }

        const recentMessages =
            await this.getRecentMessages(chatSessionId, limit);

        return {
            session,
            recentMessages,
        };
    }

    async getRecentActionRowsForMessage(
        chatMessageId: string
    ): Promise<ChatMessageActionRow[]> {
        return ChatRepository.listActionsByMessageId(chatMessageId);
    }

    /**
     * Persist normalized action rows before execution begins.
     */
    async appendActionRows(input: {
        chatMessageId: string;
        cartId: string | null;
        intent: string;
        normalizedActionRows: Array<{
            actionIndex: number;
            actionType: string;
            status: string;
            normalizedAction: Record<string, unknown>;
            question?: string | null;
            message?: string | null;
            errorType?: string | null;
            errorMessage?: string | null;
            confidence: number;
            dependsOn?: number[];
            referenceType?: string | null;
            referenceActionIndex?: number | null;
            referenceCartItemId?: string | null;
            referenceCartPosition?: number | null;
            referenceText?: string | null;
        }>;
    }): Promise<ChatMessageActionRow[]> {
        const created: ChatMessageActionRow[] = [];

        for (const row of input.normalizedActionRows) {
            const createdRow =
                await ChatRepository.createChatMessageAction({
                    chatMessageId: input.chatMessageId,
                    cartId: input.cartId,
                    actionIndex: row.actionIndex,
                    actionType: row.actionType,
                    intent: input.intent,
                    status: row.status,
                    normalizedAction: row.normalizedAction,
                    resolvedAction: null,
                    question: row.question ?? null,
                    message: row.message ?? null,
                    errorType: row.errorType ?? null,
                    errorMessage: row.errorMessage ?? null,
                    confidence: row.confidence,
                    dependsOn: row.dependsOn ?? [],
                    referenceType: row.referenceType ?? null,
                    referenceActionIndex:
                        row.referenceActionIndex ?? null,
                    referenceCartItemId:
                        row.referenceCartItemId ?? null,
                    referenceCartPosition:
                        row.referenceCartPosition ?? null,
                    referenceText: row.referenceText ?? null,
                    resolvedMenuItemId: null,
                    resolvedCartItemId: null,
                    executionOrder: row.actionIndex,
                    executedAt: null,
                });

            created.push(createdRow);
        }

        return created;
    }

    /**
     * Build lightweight assistant response text from execution state.
     */
    buildAssistantText(input: {
        normalizationStatus?: string;
        resolutions?: Array<{
            status: string;
            message?: string;
            question?: string;
        }>;
    }): string {
        const resolutions =
            input.resolutions ?? [];

        const successCount =
            resolutions.filter(
                (r) => r.status === "success"
            ).length;

        const clarification =
            resolutions.find(
                (r) => r.status === "needs_clarification"
            );

        const errors =
            resolutions.filter(
                (r) => r.status === "error"
            ).length;

        if (clarification?.question) {
            return clarification.question;
        }

        if (errors > 0 && successCount === 0) {
            return "I could not process that order.";
        }

        if (successCount > 0) {
            return `Updated your cart with ${successCount} item${successCount > 1 ? "s" : ""}.`;
        }

        return "Done.";
    }
}