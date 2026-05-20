import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCartRouter } from "../cart.routes";
import type { CartService } from "../../services/cart.service";

describe("cart routes", () => {
    const cartService = {
        createCart: vi.fn(),
        getCartContext: vi.fn(),
        addItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        replaceItemModifiers: vi.fn(),
        removeItemById: vi.fn(),
        clearCart: vi.fn(),
    } as unknown as CartService;

    const app = express();

    app.use(express.json());
    app.use("/cart", createCartRouter(cartService));

    app.use(
        (
            err: unknown,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction
        ) => {
            const message = err instanceof Error ? err.message : "Internal Server Error";
            res.status(500).json({
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message,
                },
            });
        }
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("POST /cart should create a cart", async () => {
        vi.mocked(cartService.createCart).mockResolvedValue({
            id: "cart-1",
            status: "active",
            revision: 1,
            created_at: "2026-05-16T00:00:00.000Z",
            updated_at: "2026-05-16T00:00:00.000Z",
        } as any);

        const res = await request(app).post("/cart").send({
            chatSessionId: "chat-session-1",
        });

        expect(res.status).toBe(201);
        expect(res.body.cart.id).toBe("cart-1");
        expect(cartService.createCart).toHaveBeenCalledWith("chat-session-1");
    });

    it("POST /cart should return 400 when sessionId is missing", async () => {
        const res = await request(app).post("/cart").send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: "chatSessionId is required.",
            },
        });
    });

    it("GET /cart/:cartId should return cart context", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue({
            cart: {
                id: "cart-1",
                session_id: "session-1",
            },
            items: [
                {
                    id: "item-1",
                    cart_id: "cart-1",
                    menu_item_id: "burger_beef",
                    quantity: 1,
                    unit_price_cents: 899,
                    created_at: "2026-05-16T00:00:00.000Z",
                    updated_at: "2026-05-16T00:00:00.000Z",
                    modifiers: [],
                },
            ],
        } as any);

        const res = await request(app).get("/cart/cart-1");

        expect(res.status).toBe(200);
        expect(res.body.cart.id).toBe("cart-1");
        expect(res.body.items).toHaveLength(1);
        expect(cartService.getCartContext).toHaveBeenCalledWith("cart-1");
    });

    it("GET /cart/:cartId should return 404 when cart not found", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue(null);

        const res = await request(app).get("/cart/unknown");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: {
                code: "NOT_FOUND",
                message: "Cart not found.",
            },
        });
    });

    it("POST /cart/:cartId/items should add an item", async () => {
        vi.mocked(cartService.addItem).mockResolvedValue({
            id: "item-1",
            cart_id: "cart-1",
            menu_item_id: "burger_beef",
            quantity: 2,
            unit_price_cents: 899,
            created_at: "2026-05-16T00:00:00.000Z",
            updated_at: "2026-05-16T00:00:00.000Z",
        } as any);

        const res = await request(app).post("/cart/cart-1/items").send({
            menuItemId: "burger_beef",
            quantity: 2,
            modifiers: {
                cheese: "yes",
            },
        });

        expect(res.status).toBe(201);
        expect(res.body.item.id).toBe("item-1");
        expect(cartService.addItem).toHaveBeenCalledWith("cart-1", {
            menuItemId: "burger_beef",
            quantity: 2,
            modifiers: {
                cheese: "yes",
            },
        });
    });

    it("POST /cart/:cartId/items should default modifiers to empty object", async () => {
        vi.mocked(cartService.addItem).mockResolvedValue({
            id: "item-1",
        } as any);

        await request(app).post("/cart/cart-1/items").send({
            menuItemId: "burger_beef",
            quantity: 1,
        });

        expect(cartService.addItem).toHaveBeenCalledWith("cart-1", {
            menuItemId: "burger_beef",
            quantity: 1,
            modifiers: {},
        });
    });

    it("POST /cart/:cartId/items should return 400 when menuItemId or quantity is missing", async () => {
        const res = await request(app).post("/cart/cart-1/items").send({
            quantity: 1,
        });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: "menuItemId and quantity are required.",
            },
        });
    });

    it("PATCH /cart/:cartId/items/:itemId should update quantity", async () => {
        vi.mocked(cartService.updateItemQuantity).mockResolvedValue({
            id: "item-1",
            quantity: 3,
        } as any);

        const res = await request(app).patch("/cart/cart-1/items/item-1").send({
            quantity: 3,
        });

        expect(res.status).toBe(200);
        expect(res.body.item.quantity).toBe(3);
        expect(cartService.updateItemQuantity).toHaveBeenCalledWith("item-1", 3);
    });

    it("PATCH /cart/:cartId/items/:itemId should replace modifiers", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue({
            cart: {
                id: "cart-1",
            },
            items: [
                {
                    id: "item-1",
                    cart_id: "cart-1",
                    menu_item_id: "burger_beef",
                    quantity: 1,
                    unit_price_cents: 899,
                    created_at: "2026-05-16T00:00:00.000Z",
                    updated_at: "2026-05-16T00:00:00.000Z",
                    modifiers: [],
                },
            ],
        } as any);

        vi.mocked(cartService.replaceItemModifiers).mockResolvedValue(undefined);

        const res = await request(app).patch("/cart/cart-1/items/item-1").send({
            modifiers: {
                cheese: "yes",
            },
        });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
        expect(cartService.replaceItemModifiers).toHaveBeenCalledWith(
            "item-1",
            "burger_beef",
            {
                cheese: "yes",
            }
        );
    });

    it("PATCH /cart/:cartId/items/:itemId should return 404 when cart not found for modifiers update", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue(null);

        const res = await request(app).patch("/cart/cart-1/items/item-1").send({
            modifiers: {
                cheese: "yes",
            },
        });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: {
                code: "NOT_FOUND",
                message: "Cart not found.",
            },
        });
    });

    it("PATCH /cart/:cartId/items/:itemId should return 404 when cart item not found for modifiers update", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue({
            cart: {
                id: "cart-1",
            },
            items: [],
        } as any);

        const res = await request(app).patch("/cart/cart-1/items/item-1").send({
            modifiers: {
                cheese: "yes",
            },
        });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: {
                code: "NOT_FOUND",
                message: "Cart item not found.",
            },
        });
    });

    it("PATCH /cart/:cartId/items/:itemId should return 400 when neither quantity nor modifiers are provided", async () => {
        const res = await request(app).patch("/cart/cart-1/items/item-1").send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: "Either quantity or modifiers must be provided.",
            },
        });
    });

    it("DELETE /cart/:cartId/items/:itemId should remove item", async () => {
        vi.mocked(cartService.removeItemById).mockResolvedValue(undefined);

        const res = await request(app).delete("/cart/cart-1/items/item-1");

        expect(res.status).toBe(204);
        expect(cartService.removeItemById).toHaveBeenCalledWith("item-1");
    });

    it("DELETE /cart/:cartId should clear cart", async () => {
        vi.mocked(cartService.deleteCart).mockResolvedValue(undefined);

        const res = await request(app).delete("/cart/cart-1");

        expect(res.status).toBe(204);
        expect(cartService.deleteCart).toHaveBeenCalledWith("cart-1");
    });

    it("should forward service errors to middleware", async () => {
        vi.mocked(cartService.createCart).mockRejectedValue(new Error("DB failed"));

        const res = await request(app).post("/cart").send({
            chatSessionId: "chat-session-1",
        });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "DB failed",
            },
        });
    });
});