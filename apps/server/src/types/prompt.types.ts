// apps/server/src/types/prompt.types.ts

export type NormalizationIntent =
    | "multi_action"
    | "add_item"
    | "remove_item"
    | "update_quantity"
    | "modify_item"
    | "clear_cart"
    | "view_cart"
    | "clarify"
    | "unknown";

export type NormalizationStatus =
    | "success"
    | "needs_clarification"
    | "error";

export type NormalizedReferenceType =
    | "none"
    | "previous_action"
    | "cart_item_id"
    | "cart_position"
    | "explicit_cart_reference";

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

    /**
     * Cross-action and cart reference metadata.
     */
    reference: {
        type: NormalizedReferenceType;
        action_index: number | null;
        cart_item_id: string | null;
        position: number | null;
        text: string | null;
    };

    depends_on: number[];
    raw_text: string;
};

export type NormalizationResult = {
    intent: NormalizationIntent;
    status: NormalizationStatus;
    actions: NormalizedAction[];
    question?: string;
    message?: string;
    confidence: number;
};

export type ResolutionIntent =
    | "add_item"
    | "remove_item"
    | "update_quantity"
    | "modify_item"
    | "clear_cart"
    | "view_cart"
    | "clarify"
    | "invalid_item"
    | "unknown";

export type ResolutionStatus =
    | "success"
    | "needs_clarification"
    | "error";

export type ResolvedAction = {
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
    menu_item_id: string;
    name: string;
    quantity: number;
    modifiers: Record<string, string>;

    /**
     * Final resolved reference linkage.
     */
    reference_resolution: {
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
};

export type ResolutionResult = {
    intent: ResolutionIntent;
    status: ResolutionStatus;
    action: ResolvedAction;
    question: string;
    message: string;
    suggestions: string[];
    error_type: string;
    confidence: number;
};