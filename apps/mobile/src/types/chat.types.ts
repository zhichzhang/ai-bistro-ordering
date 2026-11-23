// apps/mobile/src/types/chat.types.ts

// Chat message

export type ChatMessageDto = {
    id: string;
    chat_session_id: string;

    role:
        | "user"
        | "assistant"
        | "system";

    content: string;
    parsed_action: unknown | null;
    error_type: string | null;
    created_at: string;
};

// Chat session

export type ChatSessionDto = {
    id: string;
    cart_id: string | null;
    created_at: string;
    updated_at: string;
};

// API responses

export type CreateChatSessionResponse =
    ChatSessionDto;

export type ChatMessagesResponse =
    ChatMessageDto[];