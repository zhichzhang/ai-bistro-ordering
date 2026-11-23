import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../prisma";
import { asRow } from "../row";
import type { CartItemModifierRow, CartItemRow, CartRow } from "../../types/db.types";

const transaction = new AsyncLocalStorage<Prisma.TransactionClient>();
export const db = () => transaction.getStore() ?? prisma;

export class CartRepository {
    static async inCartTransaction<T>(cartId: string, work: () => Promise<T>): Promise<T> {
        if (transaction.getStore()) return work();
        return prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM carts WHERE id = ${cartId}::uuid FOR UPDATE`;
            return transaction.run(tx, work);
        });
    }

    static async getCartById(id: string): Promise<CartRow | null> {
        return asRow(await db().cart.findUnique({ where: { id } }));
    }

    static async createCart(): Promise<{ chatSessionId: string; cart: CartRow }> {
        const create = async () => {
            const cart = await db().cart.create({ data: {} });
            const session = await db().chatSession.create({ data: { cart_id: cart.id } });
            return { cart, session };
        };
        const { cart, session } = transaction.getStore()
            ? await create()
            : await prisma.$transaction(tx => transaction.run(tx, create));
        return { chatSessionId: session.id, cart: asRow(cart) };
    }

    static async compactPositionsAfterRemoval(cartId: string, removedPosition: number): Promise<void> {
        const items = await db().cartItem.findMany({
            where: { cart_id: cartId, position: { gt: removedPosition } },
            orderBy: { position: "asc" },
        });
        for (const item of items) {
            await db().cartItem.update({ where: { id: item.id }, data: { position: item.position - 1 } });
        }
    }

    static async listCartItems(cartId: string): Promise<CartItemRow[]> {
        return asRow(await db().cartItem.findMany({
            where: { cart_id: cartId }, orderBy: { position: "asc" },
        }));
    }

    static async getCartItemById(cartItemId: string): Promise<CartItemRow | null> {
        return asRow(await db().cartItem.findUnique({ where: { id: cartItemId } }));
    }

    static async bumpCartRevision(cartId: string): Promise<void> {
        await db().cart.update({ where: { id: cartId }, data: { revision: { increment: 1 } } });
    }

    static async updateCartStatus(cartId: string, status: string): Promise<void> {
        await db().cart.update({ where: { id: cartId }, data: { status } });
    }

    static async updateCartItem(cartItemId: string, updates: Partial<{
        menu_item_id: string;
        quantity: number;
        unit_price_cents: number;
        line_total_cents: number;
        canonical_identity: string;
    }>): Promise<void> {
        await db().cartItem.update({ where: { id: cartItemId }, data: updates });
    }

    static async clearCartItems(cartId: string): Promise<void> {
        await db().cartItem.deleteMany({ where: { cart_id: cartId } });
    }

    static async getNextCartItemPosition(cartId: string): Promise<number> {
        const last = await db().cartItem.findFirst({
            where: { cart_id: cartId }, orderBy: { position: "desc" }, select: { position: true },
        });
        return last ? last.position + 1 : 0;
    }

    static async createCartItem(input: {
        cartId: string;
        menuItemId: string;
        quantity: number;
        unitPriceCents: number;
        lineTotalCents: number;
        canonicalIdentity: string;
    }): Promise<CartItemRow> {
        const position = await this.getNextCartItemPosition(input.cartId);
        return asRow(await db().cartItem.create({ data: {
            cart_id: input.cartId,
            menu_item_id: input.menuItemId,
            quantity: input.quantity,
            unit_price_cents: input.unitPriceCents,
            line_total_cents: input.lineTotalCents,
            canonical_identity: input.canonicalIdentity,
            position,
        } }));
    }

    static async updateCartItemQuantity(cartItemId: string, quantity: number): Promise<CartItemRow> {
        const existing = await db().cartItem.findUniqueOrThrow({ where: { id: cartItemId } });
        return asRow(await db().cartItem.update({
            where: { id: cartItemId },
            data: { quantity, line_total_cents: existing.unit_price_cents * quantity },
        }));
    }

    static async deleteCartItem(cartItemId: string): Promise<void> {
        await db().cartItem.delete({ where: { id: cartItemId } });
    }

    static async listCartItemModifiers(cartItemId: string): Promise<CartItemModifierRow[]> {
        return asRow(await db().cartItemModifier.findMany({ where: { cart_item_id: cartItemId } }));
    }

    static async addCartItemModifier(input: {
        cartItemId: string;
        modifierGroupId: string;
        modifierOptionId: string;
        modifierGroupCode: string;
        modifierOptionCode: string;
    }): Promise<CartItemModifierRow> {
        return asRow(await db().cartItemModifier.create({ data: {
            cart_item_id: input.cartItemId,
            modifier_group_id: input.modifierGroupId,
            modifier_option_id: input.modifierOptionId,
            modifier_group_code: input.modifierGroupCode,
            modifier_option_code: input.modifierOptionCode,
        } }));
    }

    static async deleteModifiersByCartItemId(cartItemId: string): Promise<void> {
        await db().cartItemModifier.deleteMany({ where: { cart_item_id: cartItemId } });
    }

    static async findCartItemByCanonicalIdentity(cartId: string, canonicalIdentity: string): Promise<CartItemRow | null> {
        return asRow(await db().cartItem.findFirst({
            where: { cart_id: cartId, canonical_identity: canonicalIdentity },
        }));
    }
}
