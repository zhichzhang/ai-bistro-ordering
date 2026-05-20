// apps/server/src/services/ordering.service.ts

import { ChatRepository } from "../db/repositories/chat.repository";
import { CartRepository } from "../db/repositories/cart.repository";

import { CartExecutionService } from "./cart.service";
import { MenuService } from "./menu.service";
import { NormalizationService } from "./normalization.service";
import { PromptContextService } from "./prompt-context.service";
import { ResolutionService } from "./resolution.service";

import type {
    CartContext,
    CartExecutionContext,
} from "../types/cart.types";

import type {
    ChatMessageActionRow,
} from "../types/db.types";

import type {
    NormalizationResult,
    NormalizedAction,
    ResolutionResult,
} from "../types/prompt.types";

export type HandleUserMessageInput = {
    sessionId: string;
    userMessage: string;
};

export type HandleUserMessageResult = {
    sessionId: string;
    chatMessageId: string;
    cartId: string;
    normalization: NormalizationResult;
    resolutions: ResolutionResult[];
    assistantMessage: string;
    cart: CartContext | null;
    status:
        | "success"
        | "partial_failure"
        | "needs_clarification"
        | "error";
};

/**
 * Build human-readable execution summaries for chained action references.
 */
function buildExecutionSummary(
    action: {
        type: string;
        target_text?: string;
        quantity?: number;
        name?: string;
    }
): string {
    switch (action.type) {
        case "add_item":
            return `Added ${
                action.quantity ?? 1
            } ${
                action.name ??
                action.target_text ??
                "item"
            }`;

        case "modify_item":
            return `Modified ${
                action.target_text ??
                "item"
            } modifiers`;

        case "remove_item":
            return `Removed ${
                action.target_text ??
                "item"
            }`;

        case "update_quantity":
            return `Updated quantity of ${
                action.target_text ??
                "item"
            } to ${
                action.quantity ?? 0
            }`;

        case "clear_cart":
            return "Cleared cart";

        case "view_cart":
            return "Viewed cart";

        default:
            return action.type;
    }
}

export class OrderingService {
    constructor(
        private readonly normalizationService: NormalizationService,
        private readonly resolutionService: ResolutionService,
        private readonly cartExecutionService: CartExecutionService
    ) {}

    /**
     * Execute the full ordering pipeline for a user message.
     */
    async handleUserMessage(
        input: HandleUserMessageInput
    ): Promise<HandleUserMessageResult> {
        const chatSession =
            await ChatRepository.getChatSessionById(input.sessionId);

        if (!chatSession) {
            throw new Error(`Chat session not found: ${input.sessionId}`);
        }

        if (!chatSession.cart_id) {
            throw new Error(`Cart not initialized for chat session: ${input.sessionId}`);
        }

        const cart =
            await CartRepository.getCartById(chatSession.cart_id);

        if (!cart) {
            throw new Error(`Cart not found: ${chatSession.cart_id}`);
        }

        const currentCartContext =
            await this.buildCurrentCartContext(cart.id);

        const menuContext =
            await MenuService.getPromptMenuContext();

        if (!currentCartContext) {
            throw new Error(`Cart not found: ${cart.id}`);
        }

        const recentActionContext =
            await this.buildRecentActionContext(chatSession.id);

        /**
         * Resolve lightweight clarification replies before normalization.
         */
        const normalizedUserMessage =
            input.userMessage
                .trim()
                .toLowerCase();

        const recentAssistantMessage =
            await ChatRepository.getLatestAssistantMessage(
                chatSession.id
            );

        if (
            recentAssistantMessage?.content.includes(
                "Which sandwich would you like"
            )
        ) {
            const clarificationCandidates =
                await MenuService.findMenuItemCandidates(
                    normalizedUserMessage
                );

            if (
                clarificationCandidates.length === 1
            ) {
                input.userMessage =
                    `Add ${
                        clarificationCandidates[0].name
                    }`;
            }
        }

        const normalization =
            await this.normalizationService.normalizeMessage({
                currentCartContext:
                    PromptContextService
                        .serializeCartContext(
                            currentCartContext,
                            menuContext
                        ),

                recentActionContext:
                    PromptContextService
                        .serializeRecentActions(
                            recentActionContext
                        ),

                // availableModifierContext:
                //     PromptContextService.serializeModifierContext(
                //         menuContext
                //     ),

                userMessage:
                input.userMessage,
            });

        const userMessageRow =
            await ChatRepository.createChatMessage({
                chatSessionId: chatSession.id,
                role: "user",
                content: input.userMessage,
                parsedAction: normalization as Record<string, unknown>,
                errorType: null,
            });

        if (
            normalization.status ===
            "needs_clarification"
        ) {
            return {
                status:
                    "needs_clarification",

                sessionId:
                chatSession.id,

                cartId:
                cart.id,

                chatMessageId:
                userMessageRow.id,

                normalization,

                resolutions: [],

                assistantMessage:
                    normalization.question ??
                    "Please clarify.",

                cart:
                    await this.buildCurrentCartContext(
                        cart.id
                    ),
            };
        }

        const actionRows =
            await this.persistNormalizedActions({
                chatMessageId: userMessageRow.id,
                cartId: cart.id,
                normalization,
            });

        const resolutions: ResolutionResult[] = [];

        const executionErrors: {
            actionIndex: number;
            message: string;
            errorType: string;
        }[] = [];

        let mutableCurrentCartContext: CartContext =
            currentCartContext;

        for (const actionRow of actionRows) {
            const normalizedAction =
                actionRow.normalized_action as NormalizedAction;

            const executionContext =
                await this.buildExecutionContext(
                    userMessageRow.id,
                    normalizedAction.index
                );

            const resolution =
                await this.resolutionService.resolveAction({
                    currentCartContext:
                        PromptContextService
                            .serializeCartContext(
                                mutableCurrentCartContext,
                                menuContext
                            ),

                    executionContext:
                        PromptContextService
                            .serializeExecutionContext(
                                executionContext
                            ),

                    normalizedAction,
                });

            resolutions.push(resolution);

            if (
                resolution.status ===
                "needs_clarification"
            ) {
                const finalCart =
                    await this
                        .buildCurrentCartContext(
                            cart.id
                        );

                return {
                    status:
                        "needs_clarification",

                    sessionId:
                    chatSession.id,

                    chatMessageId:
                    userMessageRow.id,

                    cartId:
                    cart.id,

                    normalization,

                    resolutions,

                    assistantMessage:
                        resolution.question ??
                        "Please clarify.",

                    cart:
                    finalCart,
                };
            }

            const updatedRow =
                await ChatRepository.updateChatMessageAction(
                    actionRow.id,
                    this.mapResolutionToActionPatch(resolution)
                );

            if (resolution.status === "success") {
                try {
                    await this
                        .cartExecutionService
                        .executeResolvedAction({
                            cartId:
                            cart.id,

                            chatMessageActionId:
                            updatedRow.id,

                            resolution,

                            executionContext,
                        });
                } catch (error) {
                    executionErrors.push({
                        actionIndex:
                        normalizedAction.index,

                        message:
                            error instanceof Error
                                ? error.message
                                : "Execution failed.",

                        errorType:
                            "execution_error",
                    });
                }

                const refreshed =
                    await this.buildCurrentCartContext(cart.id);

                if (refreshed) {
                    mutableCurrentCartContext = refreshed;
                }
            }
        }

        const assistantMessageContent =
            this.buildAssistantMessage(
                resolutions,
                executionErrors
            );

        await ChatRepository.createChatMessage({
            chatSessionId: chatSession.id,
            role: "assistant",
            content: assistantMessageContent,
            parsedAction: {
                normalization,
                resolutions,
            } as Record<string, unknown>,
            errorType: null,
        });

        const finalCart =
            await this.buildCurrentCartContext(
                cart.id
            );

        return {
            status:
                executionErrors.length > 0
                    ? "partial_failure"
                    : "success",

            sessionId:
            chatSession.id,

            chatMessageId:
            userMessageRow.id,

            cartId:
            cart.id,

            normalization,

            resolutions,

            assistantMessage:
                this.buildAssistantMessage(
                    resolutions,
                    executionErrors
                ),

            cart:
            finalCart,
        };
    }

    /**
     * Build the current hydrated cart context with modifiers.
     */
    private async buildCurrentCartContext(
        cartId: string
    ): Promise<CartContext | null> {
        const cart =
            await CartRepository.getCartById(cartId);

        if (!cart) {
            return null;
        }

        const items =
            await CartRepository.listCartItems(cartId);

        const itemsWithModifiers = [];

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
     * Load recent actions for prompt grounding.
     */
    private async buildRecentActionContext(
        chatSessionId: string
    ): Promise<ChatMessageActionRow[]> {
        const actions =
            await ChatRepository
                .listRecentActionsBySessionId(
                    chatSessionId
                );

        return actions.slice(-5);
    }

    /**
     * Build execution memory for chained action resolution.
     */
    private async buildExecutionContext(
        userMessageId: string,
        currentActionIndex: number
    ): Promise<CartExecutionContext> {
        const actions =
            await ChatRepository.listActionsByMessageId(userMessageId);

        return {
            previousActions: actions
                .filter((action) =>
                    action.action_index < currentActionIndex
                )
                .sort((a, b) =>
                    a.action_index - b.action_index
                )
                .map((action) => ({
                    action_index:
                    action.action_index,

                    resolved_cart_item_id:
                    action.resolved_cart_item_id,

                    referenced_cart_item_id:
                    action.reference_cart_item_id,

                    action_type:
                    action.action_type,

                    target_text:
                        (
                            action.normalized_action as any
                        )?.target_text ?? null,

                    menu_item_id:
                    action.resolved_menu_item_id,

                    summary:
                        buildExecutionSummary({
                            type:
                            action.action_type,

                            target_text:
                            (
                                action.normalized_action as any
                            )?.target_text,

                            quantity:
                            (
                                action.normalized_action as any
                            )?.quantity,

                            name:
                            (
                                action.resolved_action as any
                            )?.name,
                        }),
                })),
        };
    }

    /**
     * Persist normalized actions before resolution and execution.
     */
    private async persistNormalizedActions(input: {
        chatMessageId: string;
        cartId: string | null;
        normalization: NormalizationResult;
    }): Promise<ChatMessageActionRow[]> {
        const rows: ChatMessageActionRow[] = [];

        for (const action of input.normalization.actions) {
            const row =
                await ChatRepository.createChatMessageAction({
                    chatMessageId: input.chatMessageId,
                    cartId: input.cartId,
                    actionIndex: action.index,
                    actionType: action.type,
                    intent: input.normalization.intent,
                    status:
                        input.normalization.status === "success"
                            ? "pending"
                            : input.normalization.status,
                    normalizedAction: action as Record<string, unknown>,
                    resolvedAction: null,
                    question: input.normalization.question ?? null,
                    message: input.normalization.message ?? null,
                    errorType:
                        input.normalization.status === "needs_clarification"
                            ? "clarification_required"
                            : null,
                    errorMessage: null,
                    confidence: input.normalization.confidence,
                    dependsOn:
                    action.depends_on,

                    referenceType:
                        action.reference?.type ?? null,

                    referenceActionIndex:
                        action.reference?.action_index ?? null,

                    referenceCartItemId:
                        action.reference?.cart_item_id ?? null,

                    referenceCartPosition:
                        action.reference?.position ?? null,

                    referenceText:
                        action.reference?.text ?? null,

                    resolvedMenuItemId:
                        null,

                    resolvedCartItemId:
                        null,

                    executionOrder:
                    action.index,

                    executedAt:
                        null,
                });

            rows.push(row);
        }

        return rows;
    }

    /**
     * Map resolution output into persisted action state.
     */
    private mapResolutionToActionPatch(
        resolution: ResolutionResult
    ): Partial<ChatMessageActionRow> {
        return {
            status: resolution.status,
            resolved_action:
                resolution.action as unknown as Record<string, unknown>,
            question: resolution.question ?? null,
            message: resolution.message ?? null,
            error_type: resolution.error_type ?? null,
            confidence: resolution.confidence,
            resolved_cart_item_id: null,
        };
    }

    /**
     * Build user-facing assistant response text.
     */
    private buildAssistantMessage(
        resolutions: ResolutionResult[],
        executionErrors: {
            actionIndex: number;
            message: string;
            errorType: string;
        }[]
    ): string {
        if (
            executionErrors.length > 0
        ) {
            return executionErrors[0]
                .message;
        }

        const successful =
            resolutions.filter(
                (r) =>
                    r.status === "success"
            );

        if (
            successful.length === 0
        ) {
            return "Unable to process request.";
        }

        return successful
            .map((r) => {
                switch (
                    r.action.type
                    ) {
                    case "add_item":
                        return `Added ${
                            r.action.quantity
                        } ${
                            r.action.name
                        }`;

                    case "modify_item":
                        return `Updated ${
                            r.action.name
                        }`;

                    case "remove_item":
                        return `Removed ${
                            r.action.name
                        }`;

                    case "update_quantity":
                        return `Updated quantity for ${
                            r.action.name
                        }`;

                    case "clear_cart":
                        return "Cleared cart";

                    default:
                        return "Done";
                }
            })
            .join(". ") + ".";
    }
}