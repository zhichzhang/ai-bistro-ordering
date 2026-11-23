import { Prisma } from "../../generated/prisma/client";
import { db } from "./cart.repository";
import { asRow } from "../row";
import type { ChatMessageActionRow, ChatMessageRow, ChatSessionRow } from "../../types/db.types";

export class ChatRepository {
    static async createChatSession(): Promise<ChatSessionRow> {
        return asRow(await db().chatSession.create({ data: {} }));
    }

    static async getChatSessionById(id: string): Promise<ChatSessionRow | null> {
        return asRow(await db().chatSession.findUnique({ where: { id } }));
    }

    static async createChatMessage(input: {
        chatSessionId: string;
        role: "user" | "assistant" | "system";
        content: string;
        parsedAction?: Record<string, unknown> | null;
        errorType?: string | null;
    }): Promise<ChatMessageRow> {
        return asRow(await db().chatMessage.create({ data: {
            chat_session_id: input.chatSessionId,
            role: input.role,
            content: input.content,
            parsed_action: input.parsedAction
                ? input.parsedAction as unknown as Prisma.InputJsonValue : Prisma.DbNull,
            error_type: input.errorType ?? null,
        } }));
    }

    static async listMessagesBySessionId(chatSessionId: string): Promise<ChatMessageRow[]> {
        return asRow(await db().chatMessage.findMany({
            where: { chat_session_id: chatSessionId }, orderBy: { created_at: "asc" },
        }));
    }

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
        return asRow(await db().chatMessageAction.create({ data: {
            chat_message_id: input.chatMessageId,
            cart_id: input.cartId,
            action_index: input.actionIndex,
            action_type: input.actionType,
            intent: input.intent,
            status: input.status,
            normalized_action: input.normalizedAction as unknown as Prisma.InputJsonValue,
            resolved_action: input.resolvedAction
                ? input.resolvedAction as unknown as Prisma.InputJsonValue : Prisma.DbNull,
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
            executed_at: input.executedAt ? new Date(input.executedAt) : null,
        } }));
    }

    static async updateChatMessageAction(id: string, patch: Partial<ChatMessageActionRow>): Promise<ChatMessageActionRow> {
        const data = { ...patch } as Record<string, unknown>;
        for (const key of ["created_at", "updated_at", "executed_at"]) {
            if (typeof data[key] === "string") data[key] = new Date(data[key]);
        }
        for (const key of ["normalized_action", "resolved_action"]) {
            if (data[key] === null) data[key] = Prisma.DbNull;
        }
        return asRow(await db().chatMessageAction.update({
            where: { id }, data: data as unknown as Prisma.ChatMessageActionUncheckedUpdateInput,
        }));
    }

    static async listActionsByMessageId(chatMessageId: string): Promise<ChatMessageActionRow[]> {
        return asRow(await db().chatMessageAction.findMany({
            where: { chat_message_id: chatMessageId }, orderBy: { action_index: "asc" },
        }));
    }

    static async listRecentActionsBySessionId(chatSessionId: string): Promise<ChatMessageActionRow[]> {
        return asRow(await db().chatMessageAction.findMany({
            where: { chat_message: { chat_session_id: chatSessionId } },
            orderBy: { created_at: "desc" }, take: 20,
        }));
    }

    static async getLatestAssistantMessage(chatSessionId: string): Promise<ChatMessageRow | null> {
        return asRow(await db().chatMessage.findFirst({
            where: { chat_session_id: chatSessionId, role: "assistant" },
            orderBy: { created_at: "desc" },
        }));
    }
}
