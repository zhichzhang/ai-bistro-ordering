// apps/server/src/types/cart.types.ts

import type {
    CartItemModifierRow,
    CartItemRow,
    CartRow,
} from "./db.types";

/**
 * Public cart payload.
 */
export type CartDto = {
    id: string;
    status: "active" | "reviewing" | "submitted";
    revision: number;
    createdAt: string;
    updatedAt: string;
};

/**
 * Public cart item modifier payload.
 */
export type CartItemModifierDto = {
    id: string;
    modifierGroupId: string;
    modifierOptionId: string;
};

/**
 * Public cart item payload.
 */
export type CartItemDto = {
    id: string;
    menuItemId: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    note: string | null;
    position: number;
    modifiers: CartItemModifierDto[];
    createdAt: string;
    updatedAt: string;
};

/**
 * Full cart response payload.
 */
export type CartContextDto = {
    cart: CartDto;
    items: CartItemDto[];
};

export type CreateCartRequest = {
    chatSessionId: string;
};

export type AddCartItemRequest = {
    menuItemId: string;
    quantity: number;
    modifiers?: Record<string, string>;
};

export type UpdateCartItemRequest = {
    quantity?: number;
    modifiers?: Record<string, string>;
};

export type AddCartItemResponse = {
    item: CartItemDto;
};

export type ClearCartResponse = {
    success: boolean;
};

/**
 * Previous AI execution reference context.
 */
export type CartExecutionPreviousAction = {
    action_index: number;
    resolved_cart_item_id?: string | null;
    referenced_cart_item_id?: string | null;

    /**
     * Semantic action memory used by downstream prompt execution.
     */
    action_type?: string | null;

    target_text?: string | null;
    menu_item_id?: string | null;
    summary?: string | null;
};

export type CartExecutionContext = {
    previousActions: CartExecutionPreviousAction[];
};

/**
 * Internal hydrated cart context.
 */
export type CartContext = {
    cart: CartRow;
    items: CartContextItem[];
};

export type CartContextItem = CartItemRow & {
    modifiers: CartItemModifierRow[];
};