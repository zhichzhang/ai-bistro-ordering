import { Router } from "express";
import { CartNotActiveError, EmptyCartCheckoutError } from "../errors/cart.errors";

import { createCartRouter } from "./cart.routes";
import { createChatRouter } from "./chat.routes";
import { createHealthRouter } from "./health.routes";
import { createMenuRouter } from "./menu.routes";
import { createOrderingRouter } from "./ordering.routes";

import { CartService } from "../services/cart.service";
import { ChatService } from "../services/chat.service";
import { OrderingService } from "../services/ordering.service";

/**
 * Register all API route groups.
 */
export function createApiRouter(deps: {
    cartService: CartService;
    chatService: ChatService;
    orderingService: OrderingService;
}): Router {
    const router = Router();

    router.use("/health", createHealthRouter());

    router.use("/menu", createMenuRouter());

    router.use("/carts", createCartRouter(deps.cartService));

    router.use("/chat", createChatRouter(deps.chatService));

    router.use("/ordering", createOrderingRouter(deps.orderingService));

    router.use((error: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
        if (error instanceof CartNotActiveError || error instanceof EmptyCartCheckoutError) {
            res.status(error.status).json({
                error: { code: error.code, message: error.message },
            });
            return;
        }
        next(error);
    });

    return router;
}