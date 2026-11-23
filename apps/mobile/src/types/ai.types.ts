// apps/mobile/src/types/ai.types.ts

import type { CartContextDto } from "./cart.types";

//
// ACTION NORMALIZATION
//

export type NormalizedReference = {
    type:
        | "none"
        | "previous_action"
        | "cart_item_id"
        | "cart_position"
        | "explicit_cart_reference";

    action_index: number | null;
    cart_item_id: string | null;
    position: number | null;
    text: string | null;
};

/**
 * Canonical action produced by the normalization pipeline.
 */
export type NormalizedAction = {
    index: number;

    type:
        | "add_item"
        | "remove_item"
        | "update_quantity"
        | "modify_item"
        | "clear_cart"
        | "view_cart"
        | "clarify"
        | "unknown";

    target_text: string;
    quantity: number;
    modifiers: Record<string, string>;
    reference: NormalizedReference;
    depends_on: number[];
    raw_text: string;
};

/**
 * Top-level normalization pipeline result.
 */
export type NormalizationResult = {
    intent:
        | "multi_action"
        | "add_item"
        | "remove_item"
        | "update_quantity"
        | "modify_item"
        | "clear_cart"
        | "view_cart"
        | "clarify"
        | "unknown";

    status:
        | "success"
        | "needs_clarification"
        | "error";

    actions: NormalizedAction[];
    question?: string;
    message?: string;
    confidence: number;
};

//
// MENU RESOLUTION
//

export type ResolutionReference = {
    type:
        | "none"
        | "previous_action"
        | "cart_position"
        | "cart_item_id"
        | "explicit_cart_reference";

    action_index: number | null;
    cart_item_id: string | null;
    position: number | null;
    text: string | null;
};

/**
 * Menu-resolved action ready for cart execution.
 */
export type ResolvedAction = {
    type:
        | "add_item"
        | "remove_item"
        | "update_quantity"
        | "modify_item"
        | "clear_cart"
        | "view_cart"
        | "clarify"
        | "invalid_item"
        | "unknown";

    target_text: string;
    menu_item_id: string;
    name: string;
    quantity: number;
    modifiers: Record<string, string>;
    reference_resolution: ResolutionReference;
};

/**
 * Resolution outcome for a single normalized action.
 */
export type ResolutionResult = {
    intent:
        | "add_item"
        | "remove_item"
        | "update_quantity"
        | "modify_item"
        | "clear_cart"
        | "view_cart"
        | "clarify"
        | "invalid_item"
        | "unknown";

    status:
        | "success"
        | "needs_clarification"
        | "error";

    action: ResolvedAction;
    question: string;
    message: string;
    suggestions: string[];
    error_type: string;
    confidence: number;
};

//
// FINAL ORDERING RESPONSE
//

/**
 * End-to-end orchestration response for a single ordering turn.
 */
export type OrderingTurnResponse = {
    sessionId: string;
    chatMessageId: string;
    cartId: string;
    normalization: NormalizationResult;
    resolutions: ResolutionResult[];
    assistantMessage: string;
    cart: CartContextDto | null;

    status:
        | "success"
        | "partial_failure"
        | "needs_clarification"
        | "error";
};