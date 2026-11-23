import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderingService } from "../ordering.service";
import { ChatRepository } from "../../db/repositories/chat.repository";
import { CartRepository } from "../../db/repositories/cart.repository";
import type { NormalizationService } from "../normalization.service";
import type { ResolutionService } from "../resolution.service";
import type { CartExecutionService } from "../cart.service";

vi.mock("../../db/repositories/chat.repository", () => ({
    ChatRepository: {
        getChatSessionById: vi.fn(),
    },
}));

vi.mock("../../db/repositories/cart.repository", () => ({
    CartRepository: {
        getCartById: vi.fn(),
    },
}));

describe("OrderingService", () => {
    const normalizationService = { normalizeMessage: vi.fn() } as unknown as NormalizationService;
    const resolutionService = { resolveAction: vi.fn() } as unknown as ResolutionService;
    const cartExecutionService = { executeResolvedAction: vi.fn() } as CartExecutionService;
    const service = new OrderingService(
        normalizationService, resolutionService, cartExecutionService
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects an unknown chat session before calling the model", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue(null);

        await expect(service.handleUserMessage({
            sessionId: "missing", userMessage: "Add fries",
        })).rejects.toThrow("Chat session not found: missing");

        expect(CartRepository.getCartById).not.toHaveBeenCalled();
        expect(normalizationService.normalizeMessage).not.toHaveBeenCalled();
    });

    it("rejects a session without a cart before calling the model", async () => {
        vi.mocked(ChatRepository.getChatSessionById).mockResolvedValue({
            id: "session-1", cart_id: null,
        } as any);

        await expect(service.handleUserMessage({
            sessionId: "session-1", userMessage: "Add fries",
        })).rejects.toThrow("Cart not initialized for chat session: session-1");

        expect(CartRepository.getCartById).not.toHaveBeenCalled();
        expect(normalizationService.normalizeMessage).not.toHaveBeenCalled();
    });
});
