import { describe, expect, it, vi } from "vitest";
import { OpenAIService } from "../openai.service";

describe("OpenAIService", () => {
    it("uses a stage-specific structured schema and converts modifiers", async () => {
        const request = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: "completed",
                output: [{ content: [{ type: "output_text", text: JSON.stringify({
                    intent: "add_item", status: "success", question: null, confidence: 0.9,
                    actions: [{ index: 0, type: "add_item", target_text: "chicken", quantity: 1,
                        modifiers: [{ key: "spice", value: "spicy" }], reference: null,
                        depends_on: [], raw_text: "add chicken" }],
                }) }] }],
            }),
        });
        const service = new OpenAIService("test-key", "test-model", request);
        const result = JSON.parse(await service.generate("add chicken", "normalization"));
        expect(result.actions[0].modifiers).toEqual({ spice: "spicy" });
        const body = JSON.parse(request.mock.calls[0][1].body);
        expect(body.text.format.name).toBe("normalization");
        expect(body.store).toBe(false);
    });

    it("does not treat an incomplete result as an order", async () => {
        const request = vi.fn().mockResolvedValue({
            ok: true, json: async () => ({ status: "incomplete", output: [] }),
        });
        await expect(new OpenAIService("key", "model", request)
            .generate("add chicken", "resolution")).rejects.toThrow("incomplete");
    });
});
