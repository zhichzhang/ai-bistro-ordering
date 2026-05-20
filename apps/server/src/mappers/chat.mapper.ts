// src/mappers/chat.mapper.ts

import {
    ChatSessionRow,
    ChatMessageRow,
    ChatMessageActionRow,
} from "../types/db.types";

import {
    ChatSession,
    ChatMessage,
    ChatMessageAction,
} from "../types/domain.types";

export function toChatSession(
    row: ChatSessionRow
): ChatSession {
    return {
        id: row.id,
        cartId: row.cart_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toChatMessage(
    row: ChatMessageRow
): ChatMessage {
    return {
        id: row.id,
        chatSessionId: row.chat_session_id,
        role: row.role,
        content: row.content,
        parsedAction: row.parsed_action,
        errorType: row.error_type,
        createdAt: row.created_at,
    };
}

export function toChatMessageAction(
    row: ChatMessageActionRow
): ChatMessageAction {
    return {
        id: row.id,
        chatMessageId: row.chat_message_id,
        cartId: row.cart_id,

        actionIndex: row.action_index,
        actionType: row.action_type,

        intent: row.intent,
        status: row.status,

        normalizedAction: row.normalized_action,
        resolvedAction: row.resolved_action,

        question: row.question,
        message: row.message,

        errorType: row.error_type,
        errorMessage: row.error_message,

        confidence: row.confidence,

        dependsOn: row.depends_on,

        referenceType: row.reference_type,
        referenceActionIndex:
        row.reference_action_index,
        referenceCartItemId:
        row.reference_cart_item_id,
        referenceCartPosition:
        row.reference_cart_position,
        referenceText:
        row.reference_text,

        resolvedMenuItemId:
        row.resolved_menu_item_id,

        resolvedCartItemId:
        row.resolved_cart_item_id,

        executionOrder:
        row.execution_order,

        executedAt:
        row.executed_at,

        createdAt:
        row.created_at,

        updatedAt:
        row.updated_at,
    };
}