// apps/server/src/services/normalization.service.ts

import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
    NormalizationResult,
} from "../types/prompt.types";

export interface TextGenerationClient {
    generate(prompt: string): Promise<string>;
}

export type NormalizeMessageInput = {
    currentCartContext: string;
    recentActionContext: string;
    // availableModifierContext: string;
    userMessage: string;
};

export class NormalizationService {
    private static promptTemplatePromise: Promise<string> | null = null;

    constructor(
        private readonly llm: TextGenerationClient
    ) {}

    /**
     * Normalize raw user input into structured ordering actions.
     */
    async normalizeMessage(
        input: NormalizeMessageInput
    ): Promise<NormalizationResult> {
        const promptTemplate =
            await NormalizationService.loadPromptTemplate();

        const prompt = promptTemplate
            .replace(
                "{{CURRENT_CART_CONTEXT}}",
                input.currentCartContext
            )
            .replace(
                "{{RECENT_ACTION_CONTEXT}}",
                input.recentActionContext
            )
            // .replace(
            //     "{{AVAILABLE_MODIFIER_CONTEXT}}",
            //     input.availableModifierContext
            // )
            .replace(
                "{{USER_MESSAGE}}",
                input.userMessage
            );

        const raw =
            await this.llm.generate(prompt);

        const parsed =
            parseJsonFromModelOutput(raw);

        validateNormalizationResult(parsed);

        return parsed as NormalizationResult;
    }

    /**
     * Load and cache the normalization prompt template.
     */
    private static async loadPromptTemplate(): Promise<string> {
        if (!this.promptTemplatePromise) {
            this.promptTemplatePromise = readPromptFile([
                path.resolve(
                    process.cwd(),
                    "src/prompts/action-normalization-lite.txt"
                ),
                path.resolve(
                    process.cwd(),
                    "apps/server/src/prompts/action-normalization-lite.txt"
                ),
            ]);
        }

        return this.promptTemplatePromise;
    }
}

/**
 * Load the first available prompt template candidate.
 */
async function readPromptFile(
    candidates: string[]
): Promise<string> {
    let lastError: unknown = null;

    for (const filePath of candidates) {
        try {
            return await readFile(filePath, "utf8");
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(
        `Unable to read action-normalization prompt from any candidate path. Last error: ${String(lastError)}`
    );
}

/**
 * Extract structured JSON payloads from model output.
 */
function parseJsonFromModelOutput(
    raw: string
): unknown {
    const trimmed =
        raw.trim();

    const fenced =
        trimmed.match(
            /^```(?:json)?\s*([\s\S]*?)\s*```$/i
        );

    if (fenced?.[1]) {
        return JSON.parse(fenced[1]);
    }

    const firstBrace =
        trimmed.indexOf("{");

    const lastBrace =
        trimmed.lastIndexOf("}");

    if (
        firstBrace >= 0 &&
        lastBrace >= firstBrace
    ) {
        const candidate =
            trimmed.slice(
                firstBrace,
                lastBrace + 1
            );

        return JSON.parse(candidate);
    }

    return JSON.parse(trimmed);
}

/**
 * Validate normalization payload shape before execution.
 */
function validateNormalizationResult(
    obj: any
): void {
    if (!obj || typeof obj !== "object") {
        throw new Error("Normalization result must be an object.");
    }

    if (!Array.isArray(obj.actions)) {
        throw new Error("Normalization result missing actions.");
    }

    const quantityRequiredTypes = new Set([
        "add_item",
        "update_quantity",
    ]);

    for (const a of obj.actions) {
        if (!a || typeof a !== "object") {
            throw new Error("Normalization action invalid.");
        }

        // Validate normalized action type.
        if (typeof a.type !== "string") {
            throw new Error("Normalization action missing type.");
        }

        // Validate optional target text.
        if (
            a.target_text !== undefined &&
            typeof a.target_text !== "string"
        ) {
            throw new Error(
                "Normalization action invalid target_text."
            );
        }

        // Validate required quantity-bearing actions.
        if (
            quantityRequiredTypes.has(
                String(a.type)
            ) &&
            typeof a.quantity !== "number"
        ) {
            throw new Error(
                `Normalization action missing quantity for type=${a.type}.`
            );
        }

        // Validate modifier payload shape.
        if (
            a.modifiers !== undefined &&
            (
                typeof a.modifiers !== "object" ||
                Array.isArray(a.modifiers)
            )
        ) {
            throw new Error(
                "Normalization action invalid modifiers."
            );
        }

        // Validate reference metadata shape.
        if (
            a.reference !== undefined &&
            a.reference !== null &&
            (
                typeof a.reference !== "object" ||
                Array.isArray(a.reference)
            )
        ) {
            throw new Error(
                "Normalization action invalid reference."
            );
        }

        // Validate dependency graph structure.
        if (
            a.depends_on !== undefined &&
            !Array.isArray(a.depends_on)
        ) {
            throw new Error(
                "Normalization action invalid depends_on."
            );
        }

        // Validate raw source text preservation.
        if (
            a.raw_text !== undefined &&
            typeof a.raw_text !== "string"
        ) {
            throw new Error(
                "Normalization action invalid raw_text."
            );
        }
    }

    // Validate top-level confidence score.
    if (
        obj.confidence !== undefined &&
        typeof obj.confidence !== "number"
    ) {
        throw new Error(
            "Normalization result invalid confidence."
        );
    }
}