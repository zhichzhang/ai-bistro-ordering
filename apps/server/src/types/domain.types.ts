// apps/server/src/types/domain.types.ts

export type Category = {
    id: string;
    code: string;
    name: string;
    sortOrder: number;
    createdAt: string;
};

export type MenuItem = {
    id: string;
    categoryId: string;
    name: string;
    priceCents: number;
    imageUrl: string;
    isAvailable: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type ModifierGroup = {
    id: string;
    code: string;
    name: string;
    isRequired: boolean;
    minSelect: number;
    maxSelect: number;
    createdAt: string;
};

export type ModifierOption = {
    id: string;
    modifierGroupId: string;
    code: string;
    name: string;
    priceDeltaCents: number;
    sortOrder: number;
    createdAt: string;
};

export type Cart = {
    id: string;
    status: "active" | "reviewing" | "submitted";
    revision: number;
    createdAt: string;
    updatedAt: string;
};

export type CartItem = {
    id: string;
    cartId: string;
    menuItemId: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    note: string | null;
    // Stable frontend/render ordering.
    position: number;
    sourceChatMessageId: string | null;
    sourceActionIndex: number | null;
    sourceChatMessageActionId: string | null;
    createdAt: string;
    updatedAt: string;
};

export type CartItemModifier = {
    id: string;
    cartItemId: string;
    modifierGroupId: string;
    modifierOptionId: string;
    createdAt: string;
};

export type ChatSession = {
    id: string;
    cartId: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ChatMessage = {
    id: string;
    chatSessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    // Structured assistant/user action payload.
    parsedAction: Record<string, unknown> | null;
    errorType: string | null;
    createdAt: string;
};

export type ChatMessageAction = {
    id: string;
    chatMessageId: string;
    cartId: string | null;
    // Normalized orchestration ordering.
    actionIndex: number;
    actionType: string;
    intent: string;
    status: string;
    normalizedAction: Record<string, unknown>;
    resolvedAction: Record<string, unknown> | null;
    question: string | null;
    message: string | null;
    errorType: string | null;
    errorMessage: string | null;
    confidence: number;
    dependsOn: number[];
    // Cross-action/cart reference linkage.
    referenceType: string | null;
    referenceActionIndex: number | null;
    referenceCartItemId: string | null;
    referenceCartPosition: number | null;
    referenceText: string | null;
    resolvedMenuItemId: string | null;
    resolvedCartItemId: string | null;
    executionOrder: number | null;
    executedAt: string | null;
    createdAt: string;
    updatedAt: string;
};