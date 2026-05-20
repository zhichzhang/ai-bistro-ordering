// src/db/repositories/cart.repository.ts

import { supabase } from "../supabase";

import { throwIfError } from "./base.repository";

import type {
    CartItemModifierRow,
    CartItemRow,
    CartRow,
} from "../../types/db.types";

export class CartRepository {
    static async getCartById(
        id: string
    ): Promise<CartRow | null> {
        const { data, error } = await supabase
            .from("carts")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        throwIfError(error);

        return (data as CartRow | null) ?? null;
    }

    /**
     * Create a cart and attach a backing chat session.
     */
    static async createCart(): Promise<{
        chatSessionId: string;
        cart: CartRow;
    }> {
        const {
            data: cart,
            error: cartError,
        } = await supabase
            .from("carts")
            .insert({
                status: "active",
                revision: 0,
            })
            .select("*")
            .single();

        throwIfError(cartError);

        const {
            data: session,
            error: sessionError,
        } = await supabase
            .from("chat_sessions")
            .insert({
                cart_id: cart.id,
            })
            .select("*")
            .single();

        throwIfError(sessionError);

        return {
            chatSessionId: session.id,
            cart: cart as CartRow,
        };
    }

    /**
     * Compact cart item positions after a removal mutation.
     */
    static async compactPositionsAfterRemoval(
        cartId: string,
        removedPosition: number
    ): Promise<void> {
        const { data: items, error } = await supabase
            .from("cart_items")
            .select("id, position")
            .eq("cart_id", cartId)
            .gt("position", removedPosition);

        throwIfError(error);

        for (const item of items ?? []) {
            const { error: updateError } = await supabase
                .from("cart_items")
                .update({
                    position: item.position - 1,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", item.id);

            throwIfError(updateError);
        }
    }

    static async listCartItems(
        cartId: string
    ): Promise<CartItemRow[]> {
        const { data, error } = await supabase
            .from("cart_items")
            .select("*")
            .eq("cart_id", cartId)
            .order("position", { ascending: true });

        throwIfError(error);

        return (data ?? []) as CartItemRow[];
    }

    static async getCartItemById(
        cartItemId: string
    ): Promise<CartItemRow | null> {
        const { data, error } = await supabase
            .from("cart_items")
            .select("*")
            .eq("id", cartItemId)
            .maybeSingle();

        throwIfError(error);

        return (data as CartItemRow | null) ?? null;
    }

    static async bumpCartRevision(
        cartId: string
    ): Promise<void> {
        const { error } = await supabase.rpc(
            "increment_cart_revision",
            {
                p_cart_id: cartId,
            }
        );

        throwIfError(error);
    }

    static async updateCartStatus(
        cartId: string,
        status: string
    ): Promise<void> {
        const { error } = await supabase
            .from("carts")
            .update({
                status,
                updated_at:
                    new Date().toISOString(),
            })
            .eq("id", cartId);

        throwIfError(error);
    }

    static async updateCartItem(
        cartItemId: string,
        updates: Partial<{
            menu_item_id: string;
            quantity: number;
            unit_price_cents: number;
            line_total_cents: number;
            canonical_identity: string;
        }>
    ): Promise<void> {
        const { error } = await supabase
            .from("cart_items")
            .update({
                ...updates,
                updated_at:
                    new Date().toISOString(),
            })
            .eq("id", cartItemId);

        throwIfError(error);
    }

    static async clearCartItems(
        cartId: string
    ): Promise<void> {
        const { error } = await supabase
            .from("cart_items")
            .delete()
            .eq("cart_id", cartId);

        throwIfError(error);
    }

    static async getNextCartItemPosition(
        cartId: string
    ): Promise<number> {
        const { data, error } = await supabase
            .from("cart_items")
            .select("position")
            .eq("cart_id", cartId)
            .order("position", { ascending: false })
            .limit(1)
            .maybeSingle();

        throwIfError(error);

        if (!data) {
            return 0;
        }

        return data.position + 1;
    }

    /**
     * Create a new cart line item at the next stable position.
     */
    static async createCartItem(input: {
        cartId: string;
        menuItemId: string;
        quantity: number;
        unitPriceCents: number;
        lineTotalCents: number;
        canonicalIdentity: string;
    }): Promise<CartItemRow> {
        const nextPosition =
            await this.getNextCartItemPosition(
                input.cartId
            );

        const { data, error } = await supabase
            .from("cart_items")
            .insert({
                cart_id: input.cartId,
                menu_item_id: input.menuItemId,
                quantity: input.quantity,
                unit_price_cents: input.unitPriceCents,
                line_total_cents: input.lineTotalCents,
                position: nextPosition,
                canonical_identity: input.canonicalIdentity,
            })
            .select("*")
            .single();

        throwIfError(error);

        return data as CartItemRow;
    }

    static async updateCartItemQuantity(
        cartItemId: string,
        quantity: number
    ): Promise<CartItemRow> {
        const {
            data: existing,
            error: existingError,
        } = await supabase
            .from("cart_items")
            .select("*")
            .eq("id", cartItemId)
            .single();

        throwIfError(existingError);

        const lineTotalCents =
            existing.unit_price_cents * quantity;

        const { data, error } = await supabase
            .from("cart_items")
            .update({
                quantity,
                line_total_cents: lineTotalCents,
                updated_at: new Date().toISOString(),
            })
            .eq("id", cartItemId)
            .select("*")
            .single();

        throwIfError(error);

        return data as CartItemRow;
    }

    static async deleteCartItem(
        cartItemId: string
    ): Promise<void> {
        const { error } = await supabase
            .from("cart_items")
            .delete()
            .eq("id", cartItemId);

        throwIfError(error);
    }

    static async listCartItemModifiers(
        cartItemId: string
    ): Promise<CartItemModifierRow[]> {
        const { data, error } = await supabase
            .from("cart_item_modifiers")
            .select("*")
            .eq("cart_item_id", cartItemId);

        throwIfError(error);

        return (data ?? []) as CartItemModifierRow[];
    }

    static async addCartItemModifier(input: {
        cartItemId: string;
        modifierGroupId: string;
        modifierOptionId: string;
        modifierGroupCode: string;
        modifierOptionCode: string;
    }): Promise<CartItemModifierRow> {
        const { data, error } = await supabase
            .from("cart_item_modifiers")
            .insert({
                cart_item_id:
                input.cartItemId,

                modifier_group_id:
                input.modifierGroupId,

                modifier_option_id:
                input.modifierOptionId,

                modifier_group_code:
                input.modifierGroupCode,

                modifier_option_code:
                input.modifierOptionCode,
            })
            .select("*")
            .single();

        throwIfError(error);

        return data as CartItemModifierRow;
    }

    static async deleteModifiersByCartItemId(
        cartItemId: string
    ): Promise<void> {
        const { error } = await supabase
            .from("cart_item_modifiers")
            .delete()
            .eq("cart_item_id", cartItemId);

        throwIfError(error);
    }

    /**
     * Resolve an existing cart line by canonical modifier identity.
     */
    static async findCartItemByCanonicalIdentity(
        cartId: string,
        canonicalIdentity: string
    ): Promise<CartItemRow | null> {
        const { data, error } =
            await supabase
                .from("cart_items")
                .select("*")
                .eq("cart_id", cartId)
                .eq(
                    "canonical_identity",
                    canonicalIdentity
                )
                .maybeSingle();

        throwIfError(error);

        return data;
    }
}