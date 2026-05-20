// apps/server/src/types/ordering.types.ts

import type {
    NormalizationResult,
    ResolutionResult,
} from "./prompt.types";
import {CartContext, CartContextDto} from "./cart.types";

export type OrderingPipelineStatus =
    | "success"
    | "partial_failure"
    | "needs_clarification"
    | "error";

export type OrderingTurnRequest = {
    userMessage: string;
};

export type OrderingTurnResponse = {
    sessionId: string;

    chatMessageId: string;

    cartId: string;

    normalization: NormalizationResult;

    resolutions: ResolutionResult[];

    assistantMessage: string;

    cart: CartContext | null;

    status: OrderingPipelineStatus;

};

export type OrderingExecutionResult = {
    success: boolean;

    appliedActions: number;

    clarificationRequired: boolean;

    errors: string[];
};

export type OrderingAssistantResponse = {
    message: string;

    question?: string | null;

    suggestions?: string[];

    requiresClarification: boolean;
};

type OrderingPipelineResult = {

    status:
        | "success"
        | "partial_failure"
        | "needs_clarification"
        | "error";

    assistantMessage: string;

    normalization?: NormalizationResult;

    resolutions: ResolutionResult[];

    executionErrors: {
        actionIndex: number;

        message: string;

        errorType: string;
    }[];

    cart: CartContextDto;

    sessionId: string;

    cartId: string;

    chatMessageId: string;
};