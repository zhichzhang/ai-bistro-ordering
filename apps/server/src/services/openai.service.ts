import type { GenerationStage, TextGenerationClient } from "./llm.types";

const reference = {
    type: "object",
    additionalProperties: false,
    properties: {
        type: { type: ["string", "null"] },
        action_index: { type: ["integer", "null"] },
        cart_item_id: { type: ["string", "null"] },
        position: { type: ["integer", "null"] },
        text: { type: ["string", "null"] },
    },
    required: ["type", "action_index", "cart_item_id", "position", "text"],
} as const;

const normalizationSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        intent: { type: "string" },
        status: { type: "string" },
        actions: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    index: { type: "integer" },
                    type: { type: "string" },
                    target_text: { type: "string" },
                    quantity: { type: "integer" },
                    modifiers: { type: "array", items: { type: "object", additionalProperties: false, properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] } },
                    reference: { anyOf: [reference, { type: "null" }] },
                    depends_on: { type: "array", items: { type: "integer" } },
                    raw_text: { type: "string" },
                },
                required: ["index", "type", "target_text", "quantity", "modifiers", "reference", "depends_on", "raw_text"],
            },
        },
        question: { type: ["string", "null"] },
        confidence: { type: "number" },
    },
    required: ["intent", "status", "actions", "question", "confidence"],
} as const;

const resolutionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        intent: { type: "string" },
        status: { type: "string" },
        action: {
            type: "object",
            additionalProperties: false,
            properties: {
                type: { type: "string" },
                target_text: { type: "string" },
                menu_item_id: { type: "string" },
                name: { type: "string" },
                quantity: { type: "integer" },
                modifiers: { type: "array", items: { type: "object", additionalProperties: false, properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] } },
                reference_resolution: { anyOf: [reference, { type: "null" }] },
            },
            required: ["type", "target_text", "menu_item_id", "name", "quantity", "modifiers", "reference_resolution"],
        },
        question: { type: ["string", "null"] },
        message: { type: ["string", "null"] },
        suggestions: { type: "array", items: { type: "string" } },
        error_type: { type: ["string", "null"] },
        confidence: { type: "number" },
    },
    required: ["intent", "status", "action", "question", "message", "suggestions", "error_type", "confidence"],
} as const;

type OpenAIResponse = {
    status?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

export class OpenAIService implements TextGenerationClient {
    constructor(
        private readonly apiKey: string,
        private readonly model: string,
        private readonly request: typeof fetch = fetch
    ) {}

    static createFromEnv(): OpenAIService {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is missing");
        }

        return new OpenAIService(
            process.env.OPENAI_API_KEY,
            process.env.OPENAI_MODEL ?? "gpt-4o-mini"
        );
    }

    async generate(prompt: string, stage: GenerationStage): Promise<string> {
        const response = await this.request("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: this.model,
                input: `${prompt}\n\nFor this JSON schema, represent each modifiers object as an array of {"key":"modifier group", "value":"selected option"} entries. Use an empty array when there are no modifiers. Use null for absent optional strings and references.`,
                store: false,
                text: {
                    format: {
                        type: "json_schema",
                        name: stage,
                        strict: true,
                        schema: stage === "normalization" ? normalizationSchema : resolutionSchema,
                    },
                },
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            throw new Error(`OpenAI request failed (${response.status})`);
        }

        const data = await response.json() as OpenAIResponse;
        if (data.status !== "completed") {
            throw new Error(`OpenAI response ${data.status ?? "missing"}`);
        }

        const content = data.output?.flatMap(item => item.content ?? []) ?? [];
        const text = content.filter(item => item.type === "output_text")
            .map(item => item.text ?? "").join("");
        if (!text) {
            throw new Error("OpenAI returned no structured output");
        }

        const parsed = JSON.parse(text) as Record<string, unknown>;
        const convertModifiers = (action: unknown) => {
            if (!action || typeof action !== "object") return;
            const value = action as Record<string, unknown>;
            if (!Array.isArray(value.modifiers)) return;
            const modifiers: Record<string, string> = {};
            for (const entry of value.modifiers) {
                if (!entry || typeof entry.key !== "string" || typeof entry.value !== "string" ||
                    Object.prototype.hasOwnProperty.call(modifiers, entry.key)) {
                    throw new Error("Invalid model modifiers");
                }
                modifiers[entry.key] = entry.value;
            }
            value.modifiers = modifiers;
        };

        if (stage === "normalization" && Array.isArray(parsed.actions)) {
            parsed.actions.forEach(convertModifiers);
        } else if (stage === "resolution") {
            convertModifiers(parsed.action);
        }
        return JSON.stringify(parsed);
    }
}
