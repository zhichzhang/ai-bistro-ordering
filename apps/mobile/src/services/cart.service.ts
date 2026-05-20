// apps/mobile/src/services/cart.service.ts

import { apiService }
    from "./api.service";

import type {
    CreateCartResponse,
    GetCartResponse,
    CartSummaryResponse, CheckoutResponse,
} from "../types/cart.types";

export const cartService = {

    //
    // CREATE CART
    //

    async createCart() {

        return apiService.post<CreateCartResponse>(
            "/carts"
        );
    },

    //
    // GET FULL CART
    //

    async getCart(
        cartId: string
    ) {

        return apiService.get<GetCartResponse>(
            `/carts/${cartId}`
        );
    },

    //
    // GET SUMMARY
    //

    async getCartSummary(
        cartId: string
    ) {

        return apiService.get<CartSummaryResponse>(
            `/carts/${cartId}/summary`
        );
    },

    //
    // ADD ITEM
    //

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

    //
    // UPDATE QUANTITY
    //

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

    //
    // REPLACE MODIFIERS
    //

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

    //
    // REPLACE ENTIRE ITEM
    //

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

    //
    // DELETE ITEM
    //

    async deleteItem(
        cartId: string,
        cartItemId: string
    ) {

        return apiService.delete<GetCartResponse>(
            `/carts/${cartId}/items/${cartItemId}`
        );
    },

    //
    // CLEAR CART
    //

    async clearCart(
        cartId: string
    ) {

        return apiService.post<GetCartResponse>(
            `/carts/${cartId}/clear`
        );
    },

    //
    // CHECKOUT
    //

    async checkoutCart(
        cartId: string
    ) {

        return apiService.post<CheckoutResponse>(
            `/carts/${cartId}/checkout`
        );
    },
};