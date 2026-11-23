// apps/server/src/routes/ordering.routes.ts

import { Router } from "express";

import { OrderingService }
    from "../services/ordering.service";

import type {
    OrderingTurnRequest,
    OrderingTurnResponse,
} from "../types/ordering.types";

export function createOrderingRouter(
    orderingService: OrderingService,
): Router {
    const router = Router();

    router.post(
        "/sessions/:sessionId/turn",
        async (req, res, next) => {
            console.time("http-ordering-request");

            try {
                const body =
                    req.body as OrderingTurnRequest;

                if (
                    !body.userMessage ||
                    typeof body.userMessage !== "string"
                ) {
                    res.status(400).json({
                        error: {
                            code: "VALIDATION_ERROR",
                            message: "userMessage is required.",
                        },
                    });

                    return;
                }

                if (body.userMessage.length > 2000) {
                    res.status(400).json({
                        error: { code: "VALIDATION_ERROR", message: "userMessage is too long." },
                    });
                    return;
                }

                const result =
                    await orderingService.handleUserMessage({
                        sessionId:
                        req.params.sessionId,

                        userMessage:
                        body.userMessage,
                    });

                const response:
                    OrderingTurnResponse = {

                    status:
                    result.status,

                    sessionId:
                    result.sessionId,

                    chatMessageId:
                    result.chatMessageId,

                    cartId:
                    result.cartId,

                    normalization:
                    result.normalization,

                    resolutions:
                    result.resolutions,

                    assistantMessage:
                    result.assistantMessage,

                    cart:
                    result.cart,
                };

                res.json(response);

            } catch (error) {
                next(error);
            } finally {
                console.timeEnd("http-ordering-request");
            }
        },
    );

    return router;
}
