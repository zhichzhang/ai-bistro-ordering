// apps/server/src/types/chat.types.ts

export type CreateChatSessionResponse = {
    sessionId: string;
};

export type ChatMessageDto = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
    errorType: string | null;
};

export type ChatSessionDto = {
    id: string;
    cartId: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ChatHistoryResponse = {
    session: ChatSessionDto;
    messages: ChatMessageDto[];
};

export type AssistantMessagePayload = {
    normalization?: unknown;
    resolutions?: unknown[];
    cartSnapshot?: unknown;
    question?: string;
    message?: string;
};

// Prompt-facing cart context used for AI orchestration.
export type PromptCartItemContext = {
    position: number;
    cart_item_id: string;
    menu_item_id: string;
    name: string;
    quantity: number;
    modifiers: {
        name: string;
        value: string;
    }[];
};