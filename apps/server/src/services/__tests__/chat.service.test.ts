import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatService } from "../chat.service";
import { ChatRepository } from "../../db/repositories/chat.repository";

vi.mock("../../db/repositories/chat.repository", () => ({
    ChatRepository: {
        createChatSession: vi.fn(),
        getChatSessionById: vi.fn(),
        createChatMessage: vi.fn(),
        listMessagesBySessionId: vi.fn(),
        listActionsByMessageId: vi.fn(),
        createChatMessageAction: vi.fn(),
    },
}));

describe("ChatService", () => {
    const service = new ChatService();

    const sessionRow = {
        id: "session-1",
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const anotherSessionRow = {
        id: "session-2",
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const userMessageRow = {
        id: "msg-user-1",
        chat_session_id: "session-1",
        role: "user",
        content: "Add fries",
        parsed_action: null,
        error_type: null,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const assistantMessageRow = {
        id: "msg-assistant-1",
        chat_session_id: "session-1",
        role: "assistant",
        content: "Done.",
        parsed_action: { normalization: {}, resolutions: [] },
        error_type: null,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const messageRows = [
        {
            id: "msg-1",
            role: "user",
            content: "Hello",
            created_at: "2026-05-16T00:00:00.000Z",
            error_type: null,
        },
        {
            id: "msg-2",
            role: "assistant",
            content: "Hi",
            created_at: "2026-05-16T00:01:00.000Z",
            error_type: null,
        },
        {
            id: "msg-3",
            role: "user",
            content: "Add cola",
            created_at: "2026-05-16T00:02:00.000Z",
            error_type: "clarification_required",
        },
    ] as any[];

    const actionRow1 = {
        id: "action-row-1",
        chat_message_id: "msg-1",
        cart_id: "cart-1",
        action_index: 0,
        action_type: "add_item",
        intent: "add_item",
        status: "pending",
        normalized_action: { type: "add_item" },
        resolved_action: null,
        question: null,
        message: null,
        error_type: null,
        error_message: null,
        confidence: 0.99,
        depends_on: [],
        reference_type: "none",
        reference_action_index: null,
        reference_cart_item_id: null,
        reference_cart_position: null,
        reference_text: null,
        resolved_menu_item_id: null,
        resolved_cart_item_id: null,
        execution_order: 0,
        executed_at: null,
    } as any;

    const actionRow2 = {
        id: "action-row-2",
        chat_message_id: "msg-1",
        cart_id: "cart-1",
        action_index: 1,
        action_type: "modify_item",
        intent: "multi_action",
        status: "needs_clarification",
        normalized_action: { type: "modify_item" },
        resolved_action: null,
        question: "Which one?",
        message: "Ambiguous item.",
        error_type: "ambiguous_item",
        error_message: "Ambiguous item.",
        confidence: 0.91,
        depends_on: [0],
        reference_type: "previous_action",
        reference_action_index: 0,
        reference_cart_item_id: null,
        reference_cart_position: null,
        reference_text: "it",
        resolved_menu_item_id: null,
        resolved_cart_item_id: null,
        execution_order: 1,
        executed_at: null,
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("ensureSession should return existing session when found", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue(sessionRow);

        const result = await service.ensureSession("session-1");

        expect(result).toBe(sessionRow);
        expect(ChatRepository.getChatSessionById).toHaveBeenCalledWith("session-1");
        expect(ChatRepository.createChatSession).not.toHaveBeenCalled();
    });

    it("ensureSession should create a new session when missing", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue(null);
        vi.mocked(ChatRepository.createChatSession).mockResolvedValue(anotherSessionRow);

        const result = await service.ensureSession("session-1");

        expect(result).toBe(anotherSessionRow);
        expect(ChatRepository.createChatSession).toHaveBeenCalledTimes(1);
    });

    it("ensureSession should create a new session when no sessionId is provided", async () => {
        vi.mocked(ChatRepository.createChatSession).mockResolvedValue(anotherSessionRow);

        const result = await service.ensureSession();

        expect(result).toBe(anotherSessionRow);
        expect(ChatRepository.getChatSessionById).not.toHaveBeenCalled();
        expect(ChatRepository.createChatSession).toHaveBeenCalledTimes(1);
    });

    it("createUserMessage should delegate to ChatRepository.createChatMessage", async () => {
        vi.mocked(ChatRepository.createChatMessage).mockResolvedValue(userMessageRow);

        const result = await service.createUserMessage({
            chatSessionId: "session-1",
            content: "Add fries",
            parsedAction: { intent: "add_item" },
        });

        expect(result).toBe(userMessageRow);
        expect(ChatRepository.createChatMessage).toHaveBeenCalledWith({
            chatSessionId: "session-1",
            role: "user",
            content: "Add fries",
            parsedAction: { intent: "add_item" },
            errorType: null,
        });
    });

    it("createAssistantMessage should delegate payload to parsedAction", async () => {
        vi.mocked(ChatRepository.createChatMessage).mockResolvedValue(assistantMessageRow);

        const result = await service.createAssistantMessage({
            chatSessionId: "session-1",
            content: "Done.",
            payload: {
                normalization: { intent: "add_item" },
                resolutions: [],
                cartSnapshot: { items: [] },
            },
            errorType: null,
        });

        expect(result).toBe(assistantMessageRow);
        expect(ChatRepository.createChatMessage).toHaveBeenCalledWith({
            chatSessionId: "session-1",
            role: "assistant",
            content: "Done.",
            parsedAction: {
                normalization: { intent: "add_item" },
                resolutions: [],
                cartSnapshot: { items: [] },
            },
            errorType: null,
        });
    });

    it("getRecentMessages should return only the last N messages and map fields", async () => {
        vi.mocked(ChatRepository.listMessagesBySessionId).mockResolvedValue(messageRows);

        const result = await service.getRecentMessages("session-1", 2);

        expect(result).toEqual([
            {
                id: "msg-2",
                role: "assistant",
                content: "Hi",
                created_at: "2026-05-16T00:01:00.000Z",
                error_type: null,
            },
            {
                id: "msg-3",
                role: "user",
                content: "Add cola",
                created_at: "2026-05-16T00:02:00.000Z",
                error_type: "clarification_required",
            },
        ]);
    });

    it("buildChatContext should return session and recent messages", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue(sessionRow);
        vi.mocked(ChatRepository.listMessagesBySessionId).mockResolvedValue(messageRows);

        const result = await service.buildChatContext("session-1", 2);

        expect(result.session).toBe(sessionRow);
        expect(result.recentMessages).toHaveLength(2);
        expect(result.recentMessages[0].id).toBe("msg-2");
    });

    it("buildChatContext should throw when session does not exist", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue(null);

        await expect(service.buildChatContext("missing-session")).rejects.toThrow(
            "Chat session not found: missing-session"
        );
    });

    it("getRecentActionRowsForMessage should delegate to ChatRepository", async () => {
        vi.mocked(ChatRepository.listActionsByMessageId).mockResolvedValue([actionRow1, actionRow2]);

        const result = await service.getRecentActionRowsForMessage("msg-1");

        expect(result).toEqual([actionRow1, actionRow2]);
        expect(ChatRepository.listActionsByMessageId).toHaveBeenCalledWith("msg-1");
    });

    it("appendActionRows should create one chat_message_actions row per normalized action", async () => {
        vi.mocked(ChatRepository.createChatMessageAction)
            .mockResolvedValueOnce(actionRow1)
            .mockResolvedValueOnce(actionRow2);

        const result = await service.appendActionRows({
            chatMessageId: "msg-1",
            cartId: "cart-1",
            intent: "multi_action",
            normalizedActionRows: [
                {
                    actionIndex: 0,
                    actionType: "add_item",
                    status: "pending",
                    normalizedAction: { type: "add_item" },
                    confidence: 0.97,
                    dependsOn: [],
                    referenceType: "none",
                },
                {
                    actionIndex: 1,
                    actionType: "modify_item",
                    status: "needs_clarification",
                    normalizedAction: { type: "modify_item" },
                    question: "Which one?",
                    message: "Ambiguous item.",
                    errorType: "ambiguous_item",
                    errorMessage: "Ambiguous item.",
                    confidence: 0.91,
                    dependsOn: [0],
                    referenceType: "previous_action",
                    referenceActionIndex: 0,
                    referenceText: "it",
                },
            ],
        });

        expect(result).toEqual([actionRow1, actionRow2]);
        expect(ChatRepository.createChatMessageAction).toHaveBeenNthCalledWith(1, {
            chatMessageId: "msg-1",
            cartId: "cart-1",
            actionIndex: 0,
            actionType: "add_item",
            intent: "multi_action",
            status: "pending",
            normalizedAction: { type: "add_item" },
            resolvedAction: null,
            question: null,
            message: null,
            errorType: null,
            errorMessage: null,
            confidence: 0.97,
            dependsOn: [],
            referenceType: "none",
            referenceActionIndex: null,
            referenceCartItemId: null,
            referenceCartPosition: null,
            referenceText: null,
            resolvedMenuItemId: null,
            resolvedCartItemId: null,
            executionOrder: 0,
            executedAt: null,
        });

        expect(ChatRepository.createChatMessageAction).toHaveBeenNthCalledWith(2, {
            chatMessageId: "msg-1",
            cartId: "cart-1",
            actionIndex: 1,
            actionType: "modify_item",
            intent: "multi_action",
            status: "needs_clarification",
            normalizedAction: { type: "modify_item" },
            resolvedAction: null,
            question: "Which one?",
            message: "Ambiguous item.",
            errorType: "ambiguous_item",
            errorMessage: "Ambiguous item.",
            confidence: 0.91,
            dependsOn: [0],
            referenceType: "previous_action",
            referenceActionIndex: 0,
            referenceCartItemId: null,
            referenceCartPosition: null,
            referenceText: "it",
            resolvedMenuItemId: null,
            resolvedCartItemId: null,
            executionOrder: 1,
            executedAt: null,
        });
    });

    it("buildAssistantText should prefer clarification question", () => {
        const result = service.buildAssistantText({
            resolutions: [
                { status: "success" },
                { status: "needs_clarification", question: "Which one?" },
            ],
        });

        expect(result).toBe("Which one?");
    });

    it("buildAssistantText should return error text when only errors are present", () => {
        const result = service.buildAssistantText({
            resolutions: [{ status: "error", message: "Failed" }],
        });

        expect(result).toBe("I could not process that order.");
    });

    it("buildAssistantText should summarize successful updates", () => {
        const single = service.buildAssistantText({
            resolutions: [{ status: "success" }],
        });

        const multiple = service.buildAssistantText({
            resolutions: [{ status: "success" }, { status: "success" }],
        });

        expect(single).toBe("Updated your cart with 1 item.");
        expect(multiple).toBe("Updated your cart with 2 items.");
    });

    it("buildAssistantText should default to Done", () => {
        const result = service.buildAssistantText({
            resolutions: [],
        });

        expect(result).toBe("Done.");
    });
});