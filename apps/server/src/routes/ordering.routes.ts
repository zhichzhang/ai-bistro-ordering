// apps/server/src/routes/ordering.routes.ts

import { Router } from "express";
import { performance } from "node:perf_hooks";

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
    // Single-process guard: each session may have only one active AI turn.
    // The Set is scoped to this router instance; it is not a distributed lock.
    const inFlightSessions = new Set<string>();

    router.post(
        "/sessions/:sessionId/turn",
        async (req, res, next) => {
            const startedAt = performance.now();
            let acquired = false;
            const sessionId = req.params.sessionId;

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

                // Acquire synchronously before any await to prevent overlapping
                // requests from reading the same stale cart/chat context.
                if (inFlightSessions.has(sessionId)) {
                    res.status(409).json({
                        error: {
                            code: "TURN_IN_PROGRESS",
                            message: "An AI turn is already processing for this session.",
                        },
                    });
                    return;
                }
                inFlightSessions.add(sessionId);
                acquired = true;

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
                if (acquired) inFlightSessions.delete(sessionId);
                const elapsedMs = performance.now() - startedAt;
                console.log(`http-ordering-request: ${elapsedMs.toFixed(3)}ms`);
            }
        },
    );

    return router;
}
