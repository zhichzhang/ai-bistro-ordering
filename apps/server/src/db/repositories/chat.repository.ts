// src/db/repositories/chat.repository.ts

import { supabase } from "../supabase";

import { throwIfError } from "./base.repository";

import type {
    ChatMessageActionRow,
    ChatMessageRow,
    ChatSessionRow,
} from "../../types/db.types";

export class ChatRepository {
    static async createChatSession(): Promise<ChatSessionRow> {
        const { data, error } = await supabase
            .from("chat_sessions")
            .insert({})
            .select("*")
            .single();

        throwIfError(error);

        return data as ChatSessionRow;
    }

    static async getChatSessionById(
        id: string
    ): Promise<ChatSessionRow | null> {
        const { data, error } = await supabase
            .from("chat_sessions")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        throwIfError(error);

        return (data as ChatSessionRow | null) ?? null;
    }

    /**
     * Persist a chat message with optional structured AI payload metadata.
     */
    static async createChatMessage(input: {
        chatSessionId: string;
        role: "user" | "assistant" | "system";
        content: string;
        parsedAction?: Record<string, unknown> | null;
        errorType?: string | null;
    }): Promise<ChatMessageRow> {
        const { data, error } = await supabase
            .from("chat_messages")
            .insert({
                chat_session_id: input.chatSessionId,
                role: input.role,
                content: input.content,
                parsed_action: input.parsedAction ?? null,
                error_type: input.errorType ?? null,
            })
            .select("*")
            .single();

        throwIfError(error);

        return data as ChatMessageRow;
    }

    static async listMessagesBySessionId(
        chatSessionId: string
    ): Promise<ChatMessageRow[]> {
        const { data, error } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("chat_session_id", chatSessionId)
            .order("created_at", { ascending: true });

        throwIfError(error);

        return (data ?? []) as ChatMessageRow[];
    }

    /**
     * Persist normalized orchestration actions for downstream execution.
     */
    static async createChatMessageAction(input: {
        chatMessageId: string;
        cartId: string | null;
        actionIndex: number;
        actionType: string;
        intent: string;
        status: string;
        normalizedAction: Record<string, unknown>;
        resolvedAction?: Record<string, unknown> | null;
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
        resolvedMenuItemId?: string | null;
        resolvedCartItemId?: string | null;
        executionOrder?: number | null;
        executedAt?: string | null;
    }): Promise<ChatMessageActionRow> {
        const { data, error } = await supabase
            .from("chat_message_actions")
            .insert({
                chat_message_id: input.chatMessageId,
                cart_id: input.cartId,
                action_index: input.actionIndex,
                action_type: input.actionType,
                intent: input.intent,
                status: input.status,
                normalized_action: input.normalizedAction,
                resolved_action: input.resolvedAction ?? null,
                question: input.question ?? null,
                message: input.message ?? null,
                error_type: input.errorType ?? null,
                error_message: input.errorMessage ?? null,
                confidence: input.confidence,
                depends_on: input.dependsOn ?? [],
                reference_type: input.referenceType ?? null,
                reference_action_index: input.referenceActionIndex ?? null,
                reference_cart_item_id: input.referenceCartItemId ?? null,
                reference_cart_position: input.referenceCartPosition ?? null,
                reference_text: input.referenceText ?? null,
                resolved_menu_item_id: input.resolvedMenuItemId ?? null,
                resolved_cart_item_id: input.resolvedCartItemId ?? null,
                execution_order: input.executionOrder ?? null,
                executed_at: input.executedAt ?? null,
            })
            .select("*")
            .single();

        throwIfError(error);

        return data as ChatMessageActionRow;
    }

    static async updateChatMessageAction(
        id: string,
        patch: Partial<ChatMessageActionRow>
    ): Promise<ChatMessageActionRow> {
        const { data, error } = await supabase
            .from("chat_message_actions")
            .update({
                ...patch,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select("*")
            .single();

        throwIfError(error);

        return data as ChatMessageActionRow;
    }

    static async listActionsByMessageId(
        chatMessageId: string
    ): Promise<ChatMessageActionRow[]> {
        const { data, error } = await supabase
            .from("chat_message_actions")
            .select("*")
            .eq("chat_message_id", chatMessageId)
            .order("action_index", { ascending: true });

        throwIfError(error);

        return (data ?? []) as ChatMessageActionRow[];
    }

    /**
     * Load recent action history for prompt grounding.
     */
    static async listRecentActionsBySessionId(
        chatSessionId: string
    ): Promise<ChatMessageActionRow[]> {
        const { data, error } =
            await supabase
                .from("chat_message_actions")
                .select(`
                *,
                chat_messages!inner(
                    chat_session_id
                )
            `)
                .eq(
                    "chat_messages.chat_session_id",
                    chatSessionId
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    }
                )
                .limit(20);

        throwIfError(error);

        return (
            data ?? []
        ) as unknown as
            ChatMessageActionRow[];
    }

    /**
     * Load the latest assistant message for clarification grounding.
     */
    static async getLatestAssistantMessage(
        chatSessionId: string
    ) {
        const { data, error } =
            await supabase
                .from("chat_messages")
                .select("*")
                .eq(
                    "chat_session_id",
                    chatSessionId
                )
                .eq(
                    "role",
                    "assistant"
                )
                .order(
                    "created_at",
                    { ascending: false }
                )
                .limit(1)
                .maybeSingle();

        throwIfError(error);

        return data;
    }
}