// apps/mobile/src/types/api.types.ts

import type {
    NormalizationResult,
    ResolutionResult,
} from "./ai.types";

//
// MENU
//

export type MenuCategoriesResponse = {
    categories: {
        id: string;
        code: string;
        name: string;
        sortOrder: number;
        createdAt: string;
    }[];
};

//
// MENU ITEMS
//

export type MenuItemsResponse = {
    items: {
        id: string;
        categoryId: string;
        name: string;
        priceCents: number;
        imageUrl: string;
        isAvailable: boolean;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
    }[];
};

//
// MENU ITEM
//

export type MenuItemResponse = {
    item: {
        id: string;
        categoryId: string;
        name: string;
        priceCents: number;
        imageUrl: string;
        isAvailable: boolean;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
    };
};

//
// MENU CONTEXT
//

export type MenuContextResponse = {
    context: {
        restaurant_name: string;

        categories: {
            id: string;
            name: string;
            sort_order: number;

            items: {
                id: string;
                name: string;
                category: string;
                price: number;
                image_url: string;
                modifiers?: Record<string, string[]>;
            }[];
        }[];

        aliases?: Record<string, string[]>;
    };
};

//
// CART
//

export type CartDto = {
    id: string;
    status: string;
    revision: number;
    created_at: string;
    updated_at: string;
};

//
// CART ITEM
//

export type CartItemDto = {
    id: string;
    cart_id: string;
    menu_item_id: string;
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

//
// CREATE CART
//

export type CreateCartResponse = {
    chatSessionId: string;
    cart: CartDto;
};

//
// GET CART
//

export type GetCartResponse = {
    cart: CartDto;

    items: {
        id: string;
        menu_item_id: string;
        quantity: number;
        position: number;
        modifiers: Record<string, string>;
    }[];
};

//
// ADD CART ITEM
//

export type AddCartItemRequest = {
    menuItemId: string;
    quantity: number;
    modifiers?: Record<string, string>;
};

export type AddCartItemResponse = {
    item: CartItemDto;
};

//
// UPDATE QUANTITY
//

export type UpdateQuantityRequest = {
    quantity: number;
};

export type UpdateQuantityResponse = {
    item: CartItemDto;
};

//
// REPLACE MODIFIERS
//

export type ReplaceModifiersRequest = {
    modifiers: Record<string, string>;
};

export type ReplaceModifiersResponse = {
    success: true;
};

//
// CHAT
//

export type CreateChatSessionResponse = {
    sessionId: string;
};

//
// CHAT MESSAGE
//

export type ChatMessageDto = {
    id: string;

    role:
        | "user"
        | "assistant"
        | "system";

    content: string;

    createdAt?: string;
};

//
// CHAT MESSAGES
//

export type ChatMessagesResponse = {
    session: {
        id: string;
        createdAt: string;
        updatedAt: string;
    };

    messages: ChatMessageDto[];
};

//
// ORDERING
//

export type OrderingTurnRequest = {
    userMessage: string;
};

//
// ORDERING RESPONSE
//

export type OrderingTurnResponse = {
    sessionId: string;
    chatMessageId: string;
    cartId: string | null;
    normalization: NormalizationResult;
    resolutions: ResolutionResult[];
    assistantMessage: string;
    cart?: unknown;
};

//
// HEALTH
//

export type HealthResponse = {
    ok: true;
};