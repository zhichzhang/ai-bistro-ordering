import { Router } from "express";

import { CartService } from "../services/cart.service";

export function createCartRouter(
    cartService: CartService
): Router {
    const router = Router();

    /**
     * POST /cart
     * Create a new cart session.
     */
    router.post("/", async (_req, res, next) => {
        try {
            const cart =
                await cartService.createCart();

            res.status(201).json(cart);

        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /cart/:cartId
     * Load hydrated cart state.
     */
    router.get("/:cartId", async (req, res, next) => {
        try {
            const cart =
                await cartService.getCartContext(
                    req.params.cartId
                );

            res.json(cart);

        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /cart/:cartId/summary
     * Load lightweight cart summary state.
     */
    router.get("/:cartId/summary", async (req, res, next) => {
        try {
            const summary =
                await cartService.getCartSummary(
                    req.params.cartId
                );

            res.json(summary);

        } catch (error) {
            next(error);
        }
    });

    /**
     * POST /cart/:cartId/items
     * Add a new cart item.
     */
    router.post("/:cartId/items", async (req, res, next) => {
        try {
            await cartService.addItem(
                req.params.cartId,
                {
                    menuItemId:
                    req.body.menuItemId,

                    quantity:
                    req.body.quantity,

                    modifiers:
                        req.body.modifiers ?? {},
                }
            );

            const updatedCart =
                await cartService.getCartContext(
                    req.params.cartId
                );

            res.status(201).json(updatedCart);

        } catch (error) {
            next(error);
        }
    });

    /**
     * PATCH /cart/:cartId/items/:cartItemId
     * Apply quantity or modifier mutations to an existing cart line.
     */
    router.patch("/:cartId/items/:cartItemId", async (req, res, next) => {
        try {
            const body =
                req.body;

            // Quantity update flow.
            if (
                typeof body.quantity ===
                "number"
            ) {
                const updated =
                    await cartService.updateItemQuantity(
                        req.params.cartItemId,
                        body.quantity
                    );

                if (!updated) {
                    const updatedCart =
                        await cartService.getCartContext(
                            req.params.cartId
                        );

                    res.json(updatedCart);

                    return;
                }

                const updatedCart =
                    await cartService.getCartContext(
                        req.params.cartId
                    );

                res.json(updatedCart);

                return;
            }

            // Modifier replacement flow.
            if (body.modifiers) {
                const cartContext =
                    await cartService.getCartContext(
                        req.params.cartId
                    );

                if (!cartContext) {
                    res.status(404).json({
                        error: {
                            code: "NOT_FOUND",
                            message:
                                "Cart not found.",
                        },
                    });

                    return;
                }

                const targetItem =
                    cartContext.items.find(
                        (item) =>
                            item.id ===
                            req.params.cartItemId
                    );

                if (!targetItem) {
                    res.status(404).json({
                        error: {
                            code: "NOT_FOUND",
                            message:
                                "Cart item not found.",
                        },
                    });

                    return;
                }

                await cartService.replaceItemModifiers(
                    req.params.cartItemId,
                    targetItem.menu_item_id,
                    body.modifiers
                );

                const updatedCart =
                    await cartService.getCartContext(
                        req.params.cartId
                    );

                res.json(updatedCart);

                return;
            }

            res.status(400).json({
                error: {
                    code:
                        "VALIDATION_ERROR",

                    message:
                        "Either quantity or modifiers must be provided.",
                },
            });

        } catch (error) {
            next(error);
        }
    });

    /**
     * PUT /cart/:cartId/items/:cartItemId
     * Replace an existing cart line item.
     */
    router.put("/:cartId/items/:cartItemId", async (req, res, next) => {
        try {
            const result =
                await cartService.replaceCartItem({
                    cartId:
                    req.params.cartId,

                    cartItemId:
                    req.params.cartItemId,

                    body:
                    req.body,
                });

            res.json(result);

        } catch (error) {
            next(error);
        }
    });

    /**
     * DELETE /cart/:cartId/items/:cartItemId
     * Remove a cart item line or decrement quantity.
     */
    router.delete("/:cartId/items/:cartItemId", async (req, res, next) => {
        try {
            await cartService.removeItemById(
                req.params.cartItemId
            );

            const updatedCart =
                await cartService.getCartContext(
                    req.params.cartId
                );

            res.json(updatedCart);

        } catch (error) {
            next(error);
        }
    });

    /**
     * POST /cart/:cartId/checkout
     * Submit the current cart.
     */
    router.post("/:cartId/checkout", async (req, res, next) => {
        try {
            const result =
                await cartService.checkoutCart(
                    req.params.cartId
                );

            res.json(result);

        } catch (error) {
            next(error);
        }
    });

    /**
     * POST /cart/:cartId/clear
     * Remove all cart items.
     */
    router.post("/:cartId/clear", async (req, res, next) => {
        try {
            await cartService.clearCart(
                req.params.cartId
            );

            const updatedCart =
                await cartService.getCartContext(
                    req.params.cartId
                );

            res.json(updatedCart);

        } catch (error) {
            next(error);
        }
    });

    return router;
}