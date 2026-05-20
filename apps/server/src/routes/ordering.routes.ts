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

            console.log("\n");
            console.log("==================================================");
            console.log("[HTTP] POST /ordering/sessions/:sessionId/turn");
            console.log("==================================================");

            console.time("http-ordering-request");

            try {

                const body =
                    req.body as OrderingTurnRequest;

                console.log("\n[Request Params]");
                console.log({
                    sessionId:
                    req.params.sessionId,
                });

                console.log("\n[Request Body]");
                console.dir(body, {
                    depth: null,
                });

                if (
                    !body.userMessage ||
                    typeof body.userMessage !== "string"
                ) {

                    console.log("\n[Validation Failed]");
                    console.log("Missing userMessage");

                    res.status(400).json({
                        error: {
                            code: "VALIDATION_ERROR",
                            message: "userMessage is required.",
                        },
                    });

                    return;
                }

                console.log("\n[Validation Passed]");

                console.log("\n[Ordering Service]");
                console.log("Calling handleUserMessage...");

                const result =
                    await orderingService.handleUserMessage({
                        sessionId:
                        req.params.sessionId,

                        userMessage:
                        body.userMessage,
                    });

                console.log("\n[Ordering Result]");
                // console.log({
                //     status:
                //     result.status,
                //
                //     sessionId:
                //     result.sessionId,
                //
                //     cartId:
                //     result.cartId,
                //
                //     chatMessageId:
                //     result.chatMessageId,
                //
                //     normalizationActions:
                //     result.normalization.actions.length,
                //
                //     resolutions:
                //     result.resolutions.length,
                //
                //     cartItems:
                //     result.cart.items.length,
                // });

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

                console.log("\n[Response Summary]");

                console.log({
                    status:
                    response.status,

                    assistantMessage:
                    response.assistantMessage,

                    cartItems:
                        response.cart?.items.length ?? 0,
                });

                console.timeEnd("http-ordering-request");

                console.log("==================================================");
                console.log("[HTTP] REQUEST COMPLETE");
                console.log("==================================================");

                res.json(response);

            } catch (error) {

                console.log("\n[HTTP ERROR]");
                console.error(error);

                console.timeEnd("http-ordering-request");

                console.log("==================================================");
                console.log("[HTTP] REQUEST FAILED");
                console.log("==================================================");

                next(error);
            }
        },
    );

    return router;
}