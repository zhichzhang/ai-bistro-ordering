import { Router } from "express";
import { createHealthRouter } from "./health.routes";
import { createMenuRouter } from "./menu.routes";
import { createCartRouter } from "./cart.routes";
import { createChatRouter } from "./chat.routes";
import { createOrderingRouter } from "./ordering.routes";
import { CartService } from "../services/cart.service";
import { ChatService } from "../services/chat.service";
import { OrderingService } from "../services/ordering.service";

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

    return router;
}