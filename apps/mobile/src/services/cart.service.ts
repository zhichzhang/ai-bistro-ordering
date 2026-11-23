// apps/mobile/src/services/cart.service.ts

import { apiService } from "./api.service";

import type {
    CreateCartResponse,
    GetCartResponse,
    CartSummaryResponse,
    CheckoutResponse,
} from "../types/cart.types";

export const cartService = {
    /**
     * Create a new cart session.
     */
    async createCart() {
        return apiService.post<CreateCartResponse>(
            "/carts"
        );
    },

    /**
     * Fetch the canonical cart snapshot.
     */
    async getCart(
        cartId: string
    ) {
        return apiService.get<GetCartResponse>(
            `/carts/${cartId}`
        );
    },

    /**
     * Fetch lightweight cart summary data.
     */
    async getCartSummary(
        cartId: string
    ) {
        return apiService.get<CartSummaryResponse>(
            `/carts/${cartId}/summary`
        );
    },

    /**
     * Add a new item into the cart.
     */
    async addItem(
        cartId: string,
        input: {
            menuItemId: string;
            quantity: number;
            modifiers: Record<string, string>;
        }
    ) {
        return apiService.post<GetCartResponse>(
            `/carts/${cartId}/items`,
            input
        );
    },

    /**
     * Update quantity for an existing cart item.
     */
    async updateItemQuantity(
        cartId: string,
        cartItemId: string,
        quantity: number
    ) {
        return apiService.patch<GetCartResponse>(
            `/carts/${cartId}/items/${cartItemId}`,
            {
                quantity,
            }
        );
    },

    /**
     * Replace modifier selections for a cart item.
     */
    async replaceItemModifiers(
        cartId: string,
        cartItemId: string,
        modifiers: Record<string, string>
    ) {
        return apiService.patch<GetCartResponse>(
            `/carts/${cartId}/items/${cartItemId}`,
            {
                modifiers,
            }
        );
    },

    /**
     * Replace the entire cart item payload.
     */
    async replaceCartItem(
        cartId: string,
        cartItemId: string,
        input: {
            menuItemId: string;
            quantity: number;
            modifiers: Record<string, string>;
        }
    ) {
        return apiService.put<GetCartResponse>(
            `/carts/${cartId}/items/${cartItemId}`,
            input
        );
    },

    /**
     * Remove an item from the cart.
     */
    async deleteItem(
        cartId: string,
        cartItemId: string
    ) {
        return apiService.delete<GetCartResponse>(
            `/carts/${cartId}/items/${cartItemId}`
        );
    },

    /**
     * Remove all items from the cart.
     */
    async clearCart(
        cartId: string
    ) {
        return apiService.post<GetCartResponse>(
            `/carts/${cartId}/clear`
        );
    },

    /**
     * Submit the cart for checkout.
     */
    async checkoutCart(
        cartId: string
    ) {
        return apiService.post<CheckoutResponse>(
            `/carts/${cartId}/checkout`
        );
    },
};