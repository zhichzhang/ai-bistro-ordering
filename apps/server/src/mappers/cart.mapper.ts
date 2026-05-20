// src/mappers/cart.mapper.ts

import {
    CartItemModifierRow,
    CartItemRow,
    CartRow,
} from "../types/db.types";

import {
    Cart,
    CartItem,
    CartItemModifier,
} from "../types/domain.types";

export function toCart(row: CartRow): Cart {
    return {
        id: row.id,
        status: row.status,
        revision: row.revision,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toCartItem(
    row: CartItemRow
): CartItem {
    return {
        id: row.id,
        cartId: row.cart_id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        unitPriceCents: row.unit_price_cents,
        lineTotalCents: row.line_total_cents,
        note: row.note,
        position: row.position,
        sourceChatMessageId: row.source_chat_message_id,
        sourceActionIndex: row.source_action_index,

        sourceChatMessageActionId:
        row.source_chat_message_action_id,

        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toCartItemModifier(
    row: CartItemModifierRow
): CartItemModifier {
    return {
        id: row.id,
        cartItemId: row.cart_item_id,
        modifierGroupId: row.modifier_group_id,
        modifierOptionId: row.modifier_option_id,
        createdAt: row.created_at,
    };
}