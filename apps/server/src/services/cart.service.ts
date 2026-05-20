// apps/server/src/services/cart.service.ts

import { ChatRepository } from "../db/repositories/chat.repository";
import { CartRepository } from "../db/repositories/cart.repository";
import { MenuRepository } from "../db/repositories/menu.repository";

import { MenuService } from "./menu.service";

import type {
    CartContext,
    CartContextItem,
    CartExecutionContext,
} from "../types/cart.types";

import type {
    CartItemModifierRow,
    CartItemRow,
    CartRow,
    ModifierGroupRow,
    ModifierOptionRow,
} from "../types/db.types";

import type {
    MenuItem,
} from "../types/domain.types";

import type {
    ResolutionResult,
} from "../types/prompt.types";

export interface CartExecutionService {
    executeResolvedAction(input: {
        cartId: string;
        chatMessageActionId: string;
        resolution: ResolutionResult;
        executionContext?: CartExecutionContext;
    }): Promise<{
        resolvedCartItemId?: string | null;
    }>;
}

export class CartService implements CartExecutionService {
    private static modifierGroupsCache:
        ModifierGroupRow[] | null = null;

    private static modifierOptionsCache:
        ModifierOptionRow[] | null = null;

    private static menuItemCache:
        Map<string, MenuItem> =
        new Map();

    async createCart(): Promise<{ chatSessionId: string; cart: CartRow }> {
        return CartRepository.createCart();
    }

    /**
     * Build hydrated cart state including attached modifiers.
     */
    async getCartContext(cartId: string): Promise<CartContext | null> {
        const cart =
            await CartRepository.getCartById(cartId);

        if (!cart) {
            return null;
        }

        const items =
            await CartRepository.listCartItems(cartId);

        const itemsWithModifiers: CartContextItem[] = [];

        for (const item of items) {
            const modifiers =
                await CartRepository.listCartItemModifiers(item.id);

            itemsWithModifiers.push({
                ...item,
                modifiers,
            });
        }

        return {
            cart,
            items: itemsWithModifiers,
        };
    }

    /**
     * Execute resolved cart mutations produced by the AI pipeline.
     */
    async executeResolvedAction(input: {
        cartId: string;
        chatMessageActionId: string;
        resolution: ResolutionResult;
        executionContext?: CartExecutionContext;
    }): Promise<{
        resolvedCartItemId?: string | null;
    }> {
        const {
            cartId,
            resolution,
            executionContext,
        } = input;

        if (resolution.status !== "success") {
            return {
                resolvedCartItemId: null,
            };
        }

        switch (resolution.action.type) {
            case "add_item": {
                const item =
                    await this.addItem(cartId, {
                        menuItemId:
                        resolution.action.menu_item_id,

                        quantity:
                        resolution.action.quantity,

                        modifiers:
                        resolution.action.modifiers,
                    });

                await ChatRepository.updateChatMessageAction(
                    input.chatMessageActionId,
                    {
                        resolved_cart_item_id: item.id,
                    }
                );

                return {
                    resolvedCartItemId: item.id,
                };
            }

            case "remove_item": {
                const targetCartItemId =
                    await this.resolveTargetCartItemId(
                        cartId,
                        resolution,
                        executionContext
                    );

                if (!targetCartItemId) {
                    throw new Error("Unable to resolve cart item for remove_item.");
                }

                await this.removeItemById(targetCartItemId);

                await ChatRepository.updateChatMessageAction(
                    input.chatMessageActionId,
                    {
                        resolved_cart_item_id: targetCartItemId,
                    }
                );

                return {
                    resolvedCartItemId: targetCartItemId,
                };
            }

            case "update_quantity": {
                const targetCartItemId =
                    await this.resolveTargetCartItemId(
                        cartId,
                        resolution,
                        executionContext
                    );

                if (!targetCartItemId) {
                    throw new Error("Unable to resolve cart item for update_quantity.");
                }

                await this.updateItemQuantity(
                    targetCartItemId,
                    resolution.action.quantity
                );

                await ChatRepository.updateChatMessageAction(
                    input.chatMessageActionId,
                    {
                        resolved_cart_item_id: targetCartItemId,
                    }
                );

                return {
                    resolvedCartItemId: targetCartItemId,
                };
            }

            case "modify_item": {
                const targetCartItemId =
                    await this.resolveTargetCartItemId(
                        cartId,
                        resolution,
                        executionContext
                    );

                if (!targetCartItemId) {
                    throw new Error("Unable to resolve cart item for modify_item.");
                }

                await this.replaceItemModifiers(
                    targetCartItemId,
                    resolution.action.menu_item_id,
                    resolution.action.modifiers
                );

                await ChatRepository.updateChatMessageAction(
                    input.chatMessageActionId,
                    {
                        resolved_cart_item_id: targetCartItemId,
                    }
                );

                return {
                    resolvedCartItemId: targetCartItemId,
                };
            }

            case "clear_cart":
                await this.clearCart(cartId);

                return {};

            case "view_cart":
            case "clarify":
            case "unknown":
            default:
                return {};
        }
    }

    /**
     * Add a cart item or merge into an equivalent existing line.
     */
    async addItem(
        cartId: string,
        input: {
            menuItemId: string;
            quantity: number;
            modifiers: Record<string, string>;
        }
    ): Promise<CartItemRow> {
        let menuItem:
            MenuItem | null | undefined =
            CartService.menuItemCache.get(
                input.menuItemId
            );

        if (!menuItem) {
            menuItem =
                await MenuService.getMenuItemById(
                    input.menuItemId
                );

            if (menuItem) {
                CartService.menuItemCache.set(
                    input.menuItemId,
                    menuItem
                );
            }
        }

        if (!menuItem) {
            throw new Error(
                `Menu item not found: ${input.menuItemId}`
            );
        }

        const completeModifiers =
            await MenuService.buildCompleteModifiers(
                menuItem.id,
                input.modifiers ?? {}
            );

        // Merge equivalent existing line items.
        const existing =
            await this.findEquivalentCartItem(
                cartId,
                input.menuItemId,
                completeModifiers
            );

        if (existing) {
            const updated =
                await this.updateItemQuantity(
                    existing.id,
                    existing.quantity +
                    input.quantity
                );

            return updated!;
        }

        // Create a new cart line.
        const lineTotalCents =
            menuItem.priceCents *
            input.quantity;

        const cartItem =
            await CartRepository.createCartItem({
                cartId,

                menuItemId:
                menuItem.id,

                quantity:
                input.quantity,

                unitPriceCents:
                menuItem.priceCents,

                lineTotalCents,

                canonicalIdentity:
                    buildModifierIdentity(
                        menuItem.id,
                        completeModifiers
                    ),
            });

        await this.attachModifiers(
            cartItem.id,
            menuItem.id,
            completeModifiers
        );

        await CartRepository.bumpCartRevision(
            cartId
        );

        return cartItem;
    }

    async removeItemById(
        cartItemId: string
    ): Promise<void> {
        const existing =
            await CartRepository.getCartItemById(
                cartItemId
            );

        if (!existing) {
            return;
        }

        // Decrement quantity before removing the entire line.
        if (existing.quantity > 1) {
            await CartRepository.updateCartItemQuantity(
                cartItemId,
                existing.quantity - 1
            );

            await CartRepository.bumpCartRevision(
                existing.cart_id
            );

            return;
        }

        // Remove the line item entirely.
        await CartRepository.deleteModifiersByCartItemId(
            cartItemId
        );

        await CartRepository.deleteCartItem(
            cartItemId
        );

        await CartRepository.compactPositionsAfterRemoval(
            existing.cart_id,
            existing.position
        );

        await CartRepository.bumpCartRevision(
            existing.cart_id
        );
    }

    async updateItemQuantity(
        cartItemId: string,
        quantity: number
    ): Promise<CartItemRow | null> {
        if (quantity <= 0) {
            await this.removeItemById(
                cartItemId
            );

            return null;
        }

        const existing =
            await CartRepository.getCartItemById(
                cartItemId
            );

        if (!existing) {
            return null;
        }

        const updated =
            await CartRepository.updateCartItemQuantity(
                cartItemId,
                quantity
            );

        await CartRepository.bumpCartRevision(
            existing.cart_id
        );

        return updated;
    }

    /**
     * Replace modifiers while preserving canonical merge semantics.
     */
    async replaceItemModifiers(
        cartItemId: string,
        menuItemId: string,
        modifiers: Record<string, string>
    ): Promise<void> {
        const existing =
            await CartRepository.getCartItemById(
                cartItemId
            );

        if (!existing) {
            return;
        }

        const menuItem =
            await MenuService.getMenuItemById(
                menuItemId
            );

        if (!menuItem) {
            throw new Error(
                `Menu item not found: ${menuItemId}`
            );
        }

        const completeModifiers =
            await MenuService.buildCompleteModifiers(
                menuItem.id,
                modifiers ?? {}
            );

        // Resolve equivalent merge target before in-place mutation.
        const equivalent =
            await this.findEquivalentCartItem(
                existing.cart_id,
                menuItemId,
                completeModifiers,
                cartItemId
            );

        // Merge into equivalent line item.
        if (equivalent) {
            await this.updateItemQuantity(
                equivalent.id,
                equivalent.quantity +
                existing.quantity
            );

            await CartRepository.deleteModifiersByCartItemId(
                cartItemId
            );

            await CartRepository.deleteCartItem(
                cartItemId
            );

            await CartRepository.compactPositionsAfterRemoval(
                existing.cart_id,
                existing.position
            );

            return;
        }

        // Mutate existing line item in-place.
        await CartRepository.deleteModifiersByCartItemId(
            cartItemId
        );

        await this.attachModifiers(
            cartItemId,
            menuItemId,
            completeModifiers
        );

        await CartRepository.updateCartItem(
            cartItemId,
            {
                canonical_identity:
                    buildModifierIdentity(
                        menuItemId,
                        completeModifiers
                    ),
            }
        );

        await CartRepository.bumpCartRevision(
            existing.cart_id
        );
    }

    /**
     * Persist normalized modifier selections onto a cart item.
     */
    private async attachModifiers(
        cartItemId: string,
        menuItemId: string,
        modifiers: Record<string, string>
    ): Promise<void> {
        if (!modifiers || Object.keys(modifiers).length === 0) {
            return;
        }

        if (
            !CartService.modifierGroupsCache
        ) {
            CartService.modifierGroupsCache =
                await MenuRepository.listModifierGroups();
        }

        if (
            !CartService.modifierOptionsCache
        ) {
            CartService.modifierOptionsCache =
                await MenuRepository.listModifierOptions();
        }

        const modifierGroups =
            CartService.modifierGroupsCache;

        const modifierOptions =
            CartService.modifierOptionsCache;

        const modifierGroupByCode = new Map<string, ModifierGroupRow>(
            modifierGroups.map((group) => [
                normalizeLookupKey(group.code),
                group,
            ])
        );

        const modifierOptionsByGroupId = groupBy<ModifierOptionRow, string>(
            modifierOptions,
            (option) => option.modifier_group_id
        );

        for (const [modifierName, modifierValue] of Object.entries(modifiers)) {
            const modifierGroupCode =
                `${menuItemId}__${modifierName}`;

            const group =
                modifierGroupByCode.get(
                    normalizeLookupKey(modifierGroupCode)
                );

            if (!group) {
                throw new Error(
                    `Modifier group not found for "${modifierName}" on item "${menuItemId}".`
                );
            }

            const option =
                (
                    modifierOptionsByGroupId.get(group.id) ?? []
                ).find(
                    (candidate) =>
                        normalizeLookupKey(candidate.code) ===
                        normalizeLookupKey(modifierValue)
                );

            if (!option) {
                throw new Error(
                    `Modifier option not found for "${modifierName}=${modifierValue}" on item "${menuItemId}".`
                );
            }

            await CartRepository.addCartItemModifier({
                cartItemId,

                modifierGroupId:
                group.id,

                modifierOptionId:
                option.id,

                modifierGroupCode:
                group.code,

                modifierOptionCode:
                option.code,
            });
        }
    }

    /**
     * Resolve execution references into concrete cart item ids.
     */
    private async resolveTargetCartItemId(
        cartId: string,
        resolution: ResolutionResult,
        executionContext?: CartExecutionContext
    ): Promise<string | null> {
        const reference =
            resolution.action.reference_resolution;

        if (reference.cart_item_id) {
            return reference.cart_item_id;
        }

        if (
            reference.type === "cart_position" &&
            typeof reference.position === "number"
        ) {
            const items =
                await CartRepository.listCartItems(cartId);

            const item =
                items.find(
                    (candidate) =>
                        candidate.position === reference.position
                ) ?? null;

            return item?.id ?? null;
        }

        if (
            reference.type === "previous_action" &&
            typeof reference.action_index === "number"
        ) {
            const previous =
                executionContext?.previousActions.find(
                    (action) =>
                        action.action_index === reference.action_index
                );

            const directId =
                previous?.resolved_cart_item_id ??
                previous?.referenced_cart_item_id ??
                null;

            if (directId) {
                return directId;
            }
        }

        if (reference.type === "explicit_cart_reference") {
            const items =
                await CartRepository.listCartItems(cartId);

            const matches =
                items.filter(
                    (item) =>
                        item.menu_item_id ===
                        resolution.action.menu_item_id
                );

            if (matches.length === 1) {
                return matches[0].id;
            }

            return null;
        }

        return null;
    }

    async checkoutCart(cartId: string) {
        const cart =
            await this.getCartContext(cartId);

        if (!cart) {
            throw new Error("Cart not found.");
        }

        if (cart.items.length === 0) {
            throw new Error(
                "Cannot checkout empty cart."
            );
        }

        const itemCount =
            cart.items.reduce(
                (sum, item) =>
                    sum + item.quantity,
                0
            );

        const subtotalCents =
            cart.items.reduce(
                (sum, item) =>
                    sum + item.line_total_cents,
                0
            );

        await CartRepository.updateCartStatus(
            cartId,
            "submitted"
        );

        await CartRepository.bumpCartRevision(
            cartId
        );

        const nextCart =
            await CartRepository.createCart();

        return {
            success: true,

            orderId:
                crypto.randomUUID(),

            orderNumber:
                `#${Math.floor(
                    1000 + Math.random() * 9000
                )}`,

            status: "confirmed",

            itemCount,

            subtotalCents,

            submittedAt:
                new Date().toISOString(),

            nextCart,
        };
    }

    async getCartSummary(cartId: string) {
        const cart =
            await this.getCartContext(cartId);

        if (!cart) {
            throw new Error("Cart not found.");
        }

        const itemCount =
            cart.items.reduce(
                (sum, item) =>
                    sum + item.quantity,
                0
            );

        const subtotalCents =
            cart.items.reduce(
                (sum, item) =>
                    sum + item.line_total_cents,
                0
            );

        return {
            cartId,

            status:
            cart.cart.status,

            revision:
            cart.cart.revision,

            itemCount,

            subtotalCents,
        };
    }

    /**
     * Replace an existing cart line while preserving merge behavior.
     */
    async replaceCartItem(input: {
        cartId: string;
        cartItemId: string;
        body: {
            menuItemId: string;
            quantity: number;
            modifiers: Record<string, string>;
        };
    }) {
        // Load the existing source line.
        const existing =
            await CartRepository.getCartItemById(
                input.cartItemId
            );

        if (!existing) {
            throw new Error(
                "Cart item not found."
            );
        }

        // Validate target menu item.
        const menuItem =
            await MenuService.getMenuItemById(
                input.body.menuItemId
            );

        if (!menuItem) {
            throw new Error(
                "Menu item not found."
            );
        }

        const completeModifiers =
            await MenuService.buildCompleteModifiers(
                menuItem.id,
                input.body.modifiers ?? {}
            );

        // Resolve equivalent merge target.
        const equivalent =
            await this.findEquivalentCartItem(
                input.cartId,
                input.body.menuItemId,
                completeModifiers,
                input.cartItemId
            );

        // Merge into an existing equivalent line.
        if (equivalent) {
            await this.updateItemQuantity(
                equivalent.id,
                equivalent.quantity +
                input.body.quantity
            );

            await CartRepository.deleteModifiersByCartItemId(
                input.cartItemId
            );

            await CartRepository.deleteCartItem(
                input.cartItemId
            );

            await CartRepository.compactPositionsAfterRemoval(
                existing.cart_id,
                existing.position
            );

            return this.getCartContext(
                input.cartId
            );
        }

        // Modify the source line in-place.
        const unitPriceCents =
            menuItem.priceCents;

        await CartRepository.updateCartItem(
            input.cartItemId,
            {
                menu_item_id:
                input.body.menuItemId,

                quantity:
                input.body.quantity,

                unit_price_cents:
                unitPriceCents,

                line_total_cents:
                    unitPriceCents *
                    input.body.quantity,

                canonical_identity:
                    buildModifierIdentity(
                        input.body.menuItemId,
                        completeModifiers
                    ),
            }
        );

        await CartRepository.deleteModifiersByCartItemId(
            input.cartItemId
        );

        await this.attachModifiers(
            input.cartItemId,
            input.body.menuItemId,
            completeModifiers
        );

        await CartRepository.bumpCartRevision(
            input.cartId
        );

        return this.getCartContext(
            input.cartId
        );
    }

    async clearCart(
        cartId: string
    ): Promise<void> {
        await CartRepository.clearCartItems(
            cartId
        );

        await CartRepository.bumpCartRevision(
            cartId
        );
    }

    /**
     * Find an equivalent cart line using canonical modifier identity.
     */
    private async findEquivalentCartItem(
        cartId: string,
        menuItemId: string,
        modifiers: Record<string, string>,
        excludeCartItemId?: string
    ): Promise<CartContextItem | null> {
        const canonicalIdentity =
            buildModifierIdentity(
                menuItemId,
                modifiers
            );

        const existing =
            await CartRepository
                .findCartItemByCanonicalIdentity(
                    cartId,
                    canonicalIdentity
                );

        if (!existing) {
            return null;
        }

        if (
            excludeCartItemId &&
            existing.id === excludeCartItemId
        ) {
            return null;
        }

        const modifiersRows =
            await CartRepository
                .listCartItemModifiers(
                    existing.id
                );

        return {
            ...existing,
            modifiers: modifiersRows,
        };
    }
}

function buildModifierIdentity(
    menuItemId: string,
    modifiers: Record<string, string>
): string {
    return [
        menuItemId,

        ...Object.entries(modifiers)
            .sort(([a], [b]) =>
                a.localeCompare(b)
            )
            .map(
                ([k, v]) =>
                    `${k}:${v}`
            ),
    ].join("|");
}

function normalizeLookupKey(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ");
}

function groupBy<T, K>(
    items: T[],
    keyFn: (item: T) => K
): Map<K, T[]> {
    const map = new Map<K, T[]>();

    for (const item of items) {
        const key = keyFn(item);

        const bucket = map.get(key);

        if (bucket) {
            bucket.push(item);
        } else {
            map.set(key, [item]);
        }
    }

    return map;
}