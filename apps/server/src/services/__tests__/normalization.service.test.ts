import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NormalizationService } from "../normalization.service";

vi.mock("node:fs/promises", () => ({
    readFile: vi.fn(),
}));

describe("NormalizationService", () => {
    const promptTemplate = [
        "ACTION NORMALIZATION",
        "CURRENT_CART_CONTEXT:",
        "{{CURRENT_CART_CONTEXT}}",
        "RECENT_ACTION_CONTEXT:",
        "{{RECENT_ACTION_CONTEXT}}",
        "USER_MESSAGE:",
        "{{USER_MESSAGE}}",
    ].join("\n");

    const normalizedResult = {
        intent: "add_item",
        status: "success",
        actions: [
            {
                index: 0,
                type: "add_item",
                target_text: "chicken sandwich",
                quantity: 2,
                modifiers: {
                    spice: "spicy",
                },
                reference: {
                    type: "none",
                    action_index: null,
                    cart_item_id: null,
                    position: null,
                    text: null,
                },
                depends_on: [],
                raw_text: "Add two spicy chicken sandwiches",
            },
        ],
        confidence: 0.97,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (NormalizationService as any).promptTemplatePromise = null;
        vi.mocked(readFile).mockResolvedValue(promptTemplate);
    });

    it("should fill the prompt template and send it to the LLM", async () => {
        const llm = {
            generate: vi.fn().mockResolvedValue(JSON.stringify(normalizedResult)),
        };

        const service = new NormalizationService(llm);

        const currentCartContext = {
            items: [{ id: "cart_item_1", name: "Classic Cola" }],
        };

        const recentActionContext = {
            lastAction: {
                type: "add_item",
                target_text: "cola",
            },
        };

        const result = await service.normalizeMessage({
            currentCartContext,
            recentActionContext,
            userMessage: "Add two spicy chicken sandwiches",
        });

        expect(llm.generate).toHaveBeenCalledTimes(1);

        expect(llm.generate).toHaveBeenCalledWith(
            [
                "ACTION NORMALIZATION",
                "CURRENT_CART_CONTEXT:",
                JSON.stringify(currentCartContext, null, 2),
                "RECENT_ACTION_CONTEXT:",
                JSON.stringify(recentActionContext, null, 2),
                "USER_MESSAGE:",
                "Add two spicy chicken sandwiches",
            ].join("\n")
        );

        expect(result.intent).toBe("add_item");
        expect(result.status).toBe("success");
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0].modifiers.spice).toBe("spicy");
    });

    it("should parse fenced JSON returned by the model", async () => {
        const llm = {
            generate: vi.fn().mockResolvedValue(
                [
                    "```json",
                    JSON.stringify(normalizedResult, null, 2),
                    "```",
                ].join("\n")
            ),
        };

        const service = new NormalizationService(llm);

        const result = await service.normalizeMessage({
            currentCartContext: null,
            recentActionContext: null,
            userMessage: "Add two spicy chicken sandwiches",
        });

        expect(result.intent).toBe("add_item");
        expect(result.actions[0].target_text).toBe("chicken sandwich");
    });

    it("should throw when the model output is not valid normalization JSON", async () => {
        const llm = {
            generate: vi.fn().mockResolvedValue(
                JSON.stringify({
                    intent: "add_item",
                    status: "success",
                    // actions is intentionally missing
                    confidence: 0.9,
                })
            ),
        };

        const service = new NormalizationService(llm);

        await expect(
            service.normalizeMessage({
                currentCartContext: null,
                recentActionContext: null,
                userMessage: "Add fries",
            })
        ).rejects.toThrow("Normalization response missing actions array.");
    });
});