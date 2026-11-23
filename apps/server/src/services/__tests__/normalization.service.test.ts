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

        const currentCartContext = JSON.stringify({
            items: [{ id: "cart_item_1", name: "Classic Cola" }],
        }, null, 2);

        const recentActionContext = JSON.stringify({
            lastAction: {
                type: "add_item",
                target_text: "cola",
            },
        }, null, 2);

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
                currentCartContext,
                "RECENT_ACTION_CONTEXT:",
                recentActionContext,
                "USER_MESSAGE:",
                "Add two spicy chicken sandwiches",
            ].join("\n"),
            "normalization"
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
            currentCartContext: "",
            recentActionContext: "",
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
                currentCartContext: "",
                recentActionContext: "",
                userMessage: "Add fries",
            })
        ).rejects.toThrow("Normalization result missing actions.");
    });
});
