import { describe, it, expect, vi } from "vitest";
import { GeminiService } from "../gemini.service"

describe("GeminiService", () => {
    it("should return text from Gemini response", async () => {
        const mockClient = {
            models: {
                generateContent: vi.fn().mockResolvedValue({
                    text: "Kafka is a distributed streaming platform.",
                }),
            },
        } as any;

        const service = new GeminiService(mockClient);
        const result = await service.generate("Explain Kafka.");

        expect(result).toBe("Kafka is a distributed streaming platform.");
        expect(mockClient.models.generateContent).toHaveBeenCalledWith({
            model: "gemini-2.5-flash",
            contents: "Explain Kafka.",
        });
    });

    it("should return empty string when text is missing", async () => {
        const mockClient = {
            models: {
                generateContent: vi.fn().mockResolvedValue({}),
            },
        } as any;

        const service = new GeminiService(mockClient);
        const result = await service.generate("Hello");

        expect(result).toBe("");
    });
});