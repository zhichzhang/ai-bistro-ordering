// apps/server/src/services/gemini.service.ts

import { GoogleGenAI } from "@google/genai";

export class GeminiService {
    constructor(private readonly client: GoogleGenAI) {}

    static createFromEnv(): GeminiService {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is missing");
        }

        const client = new GoogleGenAI({ apiKey });
        return new GeminiService(client);
    }

    async generate(prompt: string): Promise<string> {
        const response = await this.client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text ?? "";
    }
}