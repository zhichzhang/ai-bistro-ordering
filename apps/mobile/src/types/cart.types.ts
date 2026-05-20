// apps/mobile/src/types/cart.types.ts

export type CartModifierDto = {
    id: string;

    cart_item_id: string;

    modifier_group_id: string;

    modifier_option_id: string;

    modifier_group_code: string;

    modifier_option_code: string;

    created_at: string;
};

export type CartItemDto = {
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

    modifiers: CartModifierDto[];
};

export type CartDto = {
    id: string;

    status:
        | "active"
        | "reviewing"
        | "submitted";

    revision: number;

    created_at: string;

    updated_at: string;
};

export type CartContextDto = {
    cart: CartDto;

    items: CartItemDto[];
};

//
// API RESPONSES
//

export type CreateCartResponse = {
    chatSessionId: string;

    cart: CartDto;
};

export type GetCartResponse =
    CartContextDto;

export type CartSummaryResponse = {
    cartId: string;

    status:
        | "active"
        | "reviewing"
        | "submitted";

    revision: number;

    itemCount: number;

    subtotalCents: number;
};

export type CheckoutResponse = {
    success: boolean;

    orderId: string;

    orderNumber: string;

    status: "confirmed";

    itemCount: number;

    subtotalCents: number;

    submittedAt: string;

    nextCart: {
        chatSessionId: string;

        cart: CartDto;
    };
};