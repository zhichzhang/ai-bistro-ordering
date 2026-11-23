// src/mappers/prompt.mapper.ts

import {
    ChatMessageActionRow,
} from "../types/db.types";

import {
    NormalizationResult,
    ResolutionResult,
} from "../types/prompt.types";

/**
 * Convert normalization output into persisted action rows.
 */
export function toChatMessageActionRows(
    chatMessageId: string,
    cartId: string | null,
    normalization: NormalizationResult
): Partial<ChatMessageActionRow>[] {
    return normalization.actions.map((action) => ({
        chat_message_id: chatMessageId,

        cart_id: cartId,

        action_index: action.index,

        action_type: action.type,

        intent: normalization.intent,

        status:
            normalization.status === "success"
                ? "pending"
                : normalization.status,

        normalized_action: action,

        resolved_action: null,

        question:
            normalization.question ?? null,

        message:
            normalization.message ?? null,

        error_type:
            normalization.status ===
            "needs_clarification"
                ? "clarification_required"
                : null,

        error_message: null,

        confidence:
        normalization.confidence,

        depends_on:
        action.depends_on,

        reference_type:
        action.reference.type,

        reference_action_index:
        action.reference.action_index,

        reference_cart_item_id:
        action.reference.cart_item_id,

        reference_cart_position:
        action.reference.position,

        reference_text:
        action.reference.text,

        resolved_menu_item_id: null,

        resolved_cart_item_id: null,

        execution_order:
        action.index,

        executed_at: null,
    }));
}

/**
 * Apply resolution output onto a persisted action row.
 */
export function applyResolutionToActionRow(
    resolution: ResolutionResult
): Partial<ChatMessageActionRow> {
    return {
        resolved_action: resolution,

        resolved_menu_item_id:
            resolution.action.menu_item_id ||
            null,

        resolved_cart_item_id:
            resolution.action
                .reference_resolution
                .cart_item_id || null,

        status:
            resolution.status === "success"
                ? "success"
                : resolution.status,

        question:
            resolution.question || null,

        message:
            resolution.message || null,

        error_type:
            resolution.error_type || null,

        confidence:
        resolution.confidence,
    };
}