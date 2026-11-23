import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCartRouter } from "../cart.routes";
import type { CartService } from "../../services/cart.service";

describe("cart routes", () => {
    const cartService = {
        createCart: vi.fn(),
        getCartContext: vi.fn(),
        getCartSummary: vi.fn(),
        addItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        replaceItemModifiers: vi.fn(),
        replaceCartItem: vi.fn(),
        removeItemById: vi.fn(),
        clearCart: vi.fn(),
        checkoutCart: vi.fn(),
    } as unknown as CartService;

    const cartContext = {
        cart: { id: "cart-1", status: "active" },
        items: [{ id: "item-1", menu_item_id: "burger_beef", quantity: 1, modifiers: [] }],
    };
    const app = express();
    app.use(express.json());
    app.use("/cart", createCartRouter(cartService));
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: err instanceof Error ? err.message : "Internal Server Error",
            },
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(cartService.getCartContext).mockResolvedValue(cartContext as any);
    });

    it("POST /cart creates a cart and chat session", async () => {
        vi.mocked(cartService.createCart).mockResolvedValue({
            chatSessionId: "session-1",
            cart: cartContext.cart as any,
        });

        const res = await request(app).post("/cart").send({});
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ chatSessionId: "session-1", cart: cartContext.cart });
        expect(cartService.createCart).toHaveBeenCalledWith();
    });

    it("GET /cart/:cartId returns the hydrated cart", async () => {
        const res = await request(app).get("/cart/cart-1");
        expect(res.status).toBe(200);
        expect(res.body).toEqual(cartContext);
        expect(cartService.getCartContext).toHaveBeenCalledWith("cart-1");
    });

    it("GET /cart/:cartId returns null when the cart is absent", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue(null);
        const res = await request(app).get("/cart/missing");
        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });

    it("POST /cart/:cartId/items adds an item and returns the cart", async () => {
        const res = await request(app).post("/cart/cart-1/items").send({
            menuItemId: "burger_beef",
            quantity: 2,
        });
        expect(res.status).toBe(201);
        expect(res.body).toEqual(cartContext);
        expect(cartService.addItem).toHaveBeenCalledWith("cart-1", {
            menuItemId: "burger_beef", quantity: 2, modifiers: {},
        });
    });

    it("PATCH /cart/:cartId/items/:cartItemId updates quantity", async () => {
        const res = await request(app).patch("/cart/cart-1/items/item-1").send({ quantity: 3 });
        expect(res.status).toBe(200);
        expect(res.body).toEqual(cartContext);
        expect(cartService.updateItemQuantity).toHaveBeenCalledWith("item-1", 3);
    });

    it("PATCH /cart/:cartId/items/:cartItemId replaces modifiers", async () => {
        const res = await request(app).patch("/cart/cart-1/items/item-1").send({
            modifiers: { cheese: "yes" },
        });
        expect(res.status).toBe(200);
        expect(res.body).toEqual(cartContext);
        expect(cartService.replaceItemModifiers).toHaveBeenCalledWith(
            "item-1", "burger_beef", { cheese: "yes" }
        );
    });

    it("PATCH returns 404 when the cart is absent during modifier replacement", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue(null);
        const res = await request(app).patch("/cart/cart-1/items/item-1").send({
            modifiers: { cheese: "yes" },
        });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("PATCH returns 404 when the item is absent during modifier replacement", async () => {
        vi.mocked(cartService.getCartContext).mockResolvedValue({ ...cartContext, items: [] } as any);
        const res = await request(app).patch("/cart/cart-1/items/item-1").send({
            modifiers: { cheese: "yes" },
        });
        expect(res.status).toBe(404);
        expect(res.body.error.message).toBe("Cart item not found.");
    });

    it("PATCH returns 400 when no update is provided", async () => {
        const res = await request(app).patch("/cart/cart-1/items/item-1").send({});
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("DELETE /cart/:cartId/items/:cartItemId removes an item and returns the cart", async () => {
        const res = await request(app).delete("/cart/cart-1/items/item-1");
        expect(res.status).toBe(200);
        expect(res.body).toEqual(cartContext);
        expect(cartService.removeItemById).toHaveBeenCalledWith("item-1");
    });

    it("POST /cart/:cartId/clear clears items and returns the cart", async () => {
        const res = await request(app).post("/cart/cart-1/clear");
        expect(res.status).toBe(200);
        expect(res.body).toEqual(cartContext);
        expect(cartService.clearCart).toHaveBeenCalledWith("cart-1");
    });

    it("forwards service errors to middleware", async () => {
        vi.mocked(cartService.createCart).mockRejectedValue(new Error("DB failed"));
        const res = await request(app).post("/cart").send({});
        expect(res.status).toBe(500);
        expect(res.body.error.message).toBe("DB failed");
    });
});
