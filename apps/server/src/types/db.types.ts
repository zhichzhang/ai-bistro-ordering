// apps/server/src/types/db.types.ts

export type CategoryRow = {
    id: string;
    code: string;
    name: string;
    sort_order: number;
    created_at: string;
};

export type MenuItemRow = {
    id: string;
    category_id: string;
    name: string;
    price_cents: number;
    image_url: string;
    is_available: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type MenuItemModifierGroupRow = {
    menu_item_id: string;
    modifier_group_id: string;
};

export type ModifierGroupRow = {
    id: string;
    code: string;
    name: string;
    is_required: boolean;
    min_select: number;
    max_select: number;
    created_at: string;
};

export type ModifierOptionRow = {
    id: string;
    modifier_group_id: string;
    code: string;
    name: string;
    price_delta_cents: number;
    sort_order: number;
    created_at: string;
};

export type CartRow = {
    id: string;
    status: "active" | "reviewing" | "submitted";
    revision: number;
    created_at: string;
    updated_at: string;
};

export type ChatMessageRow = {
    id: string;
    chat_session_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    parsed_action: Record<string, unknown> | null;
    error_type: string | null;
    created_at: string;
};

export type ChatMessageActionRow = {
    id: string;
    chat_message_id: string;
    cart_id: string | null;
    action_index: number;
    action_type:
        | "add_item"
        | "remove_item"
        | "update_quantity"
        | "modify_item"
        | "clear_cart"
        | "view_cart"
        | "clarify"
        | "unknown";
    intent:
        | "multi_action"
        | "add_item"
        | "remove_item"
        | "update_quantity"
        | "modify_item"
        | "clear_cart"
        | "view_cart"
        | "clarify"
        | "unknown"
        | "invalid_item";
    status: "pending" | "success" | "needs_clarification" | "error" | "skipped";
    normalized_action: Record<string, unknown>;
    resolved_action: Record<string, unknown> | null;
    question: string | null;
    message: string | null;
    error_type: string | null;
    error_message: string | null;
    confidence: number;
    depends_on: number[];
    reference_type:
        | "none"
        | "previous_action"
        | "cart_item_id"
        | "cart_position"
        | "explicit_cart_reference"
        | null;
    reference_action_index: number | null;
    reference_cart_item_id: string | null;
    reference_cart_position: number | null;
    reference_text: string | null;
    resolved_menu_item_id: string | null;
    resolved_cart_item_id: string | null;
    execution_order: number | null;
    executed_at: string | null;
    created_at: string;
    updated_at: string;
};

export type CartItemRow = {
    id: string;

    cart_id: string;

    menu_item_id: string;

    canonical_identity: string;

    quantity: number;

    unit_price_cents: number;

    line_total_cents: number;

    note: string | null;

    position: number;

    source_chat_message_id: string | null;

    source_action_index: number | null;

    source_chat_message_action_id: string | null;

    created_at: string;

    updated_at: string;
};

export type CartItemModifierRow = {
    id: string;

    cart_item_id: string;

    modifier_group_id: string;

    modifier_option_id: string;

    modifier_group_code: string;

    modifier_option_code: string;

    created_at: string;
};

export type ChatSessionRow = {
    id: string;
    cart_id: string | null;
    created_at: string;
    updated_at: string;
};