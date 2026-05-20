import { readFile } from "node:fs/promises";
import path from "node:path";
import { MenuService } from "./menu.service";
import type { NormalizedAction, ResolutionResult } from "../types/prompt.types";

export interface TextGenerationClient {
    generate(prompt: string): Promise<string>;
}

export type ResolveActionInput = {
    currentCartContext: string;
    executionContext: string;
    normalizedAction: NormalizedAction;
};

export class ResolutionService {
    private static promptTemplatePromise: Promise<string> | null = null;

    constructor(private readonly llm: TextGenerationClient) {}

    async resolveAction(input: ResolveActionInput): Promise<ResolutionResult> {
        const promptTemplate = await ResolutionService.loadPromptTemplate();
        const menuContext = await MenuService.getPromptMenuContext();

        const prompt = promptTemplate
            .replace("{{MENU_CONTEXT}}", JSON.stringify(menuContext, null, 2))
            .replace("{{CURRENT_CART_CONTEXT}}", input.currentCartContext)
            .replace("{{EXECUTION_CONTEXT}}", input.executionContext)
            .replace("{{NORMALIZED_ACTION}}", JSON.stringify(input.normalizedAction, null, 2));

        const raw = await this.llm.generate(prompt);
        const parsed = parseJsonFromModelOutput(raw);

        validateResolutionResult(parsed);

        return parsed as ResolutionResult;
    }

    private static async loadPromptTemplate(): Promise<string> {
        if (!this.promptTemplatePromise) {
            this.promptTemplatePromise = readPromptFile([
                path.resolve(process.cwd(), "src/prompts/menu-resolution-lite.txt"),
                path.resolve(process.cwd(), "apps/server/src/prompts/menu-resolution-lite.txt"),
            ]);
        }

        return this.promptTemplatePromise;
    }
}

async function readPromptFile(candidates: string[]): Promise<string> {
    let lastError: unknown = null;

    for (const filePath of candidates) {
        try {
            return await readFile(filePath, "utf8");
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(
        `Unable to read menu-resolution prompt from any candidate path. Last error: ${String(lastError)}`
    );
}

// function serializeContext(value: unknown): string {
//     if (typeof value === "string") {
//         return value;
//     }
//
//     if (value === undefined) {
//         return "null";
//     }
//
//     return JSON.stringify(value, null, 2);
// }

function parseJsonFromModelOutput(raw: string): unknown {
    const trimmed = raw.trim();

    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced?.[1]) {
        return JSON.parse(fenced[1]);
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace >= firstBrace) {
        const candidate = trimmed.slice(firstBrace, lastBrace + 1);
        return JSON.parse(candidate);
    }

    return JSON.parse(trimmed);
}

// apps/server/src/services/resolution.service.ts

function validateResolutionResult(obj: any): void {

    if (!obj || typeof obj !== "object") {
        throw new Error("Resolution result must be an object.");
    }

    if (
        typeof obj.intent !== "string"
    ) {
        throw new Error(
            "Resolution result missing intent.",
        );
    }

    if (
        typeof obj.status !== "string"
    ) {
        throw new Error(
            "Resolution result missing status.",
        );
    }

    if (
        !obj.action ||
        typeof obj.action !== "object"
    ) {
        throw new Error(
            "Resolution result missing action.",
        );
    }

    const action =
        obj.action;

    const menuItemRequiredIntents = new Set([
        "add_item",
        "remove_item",
        "modify_item",
        "update_quantity",
    ]);

    const quantityRequiredIntents = new Set([
        "add_item",
        "update_quantity",
    ]);

    //
    // ACTION TYPE
    //

    if (
        typeof action.type !== "string"
    ) {
        throw new Error(
            "Resolution action missing type.",
        );
    }

    //
    // TARGET TEXT
    //

    if (
        action.target_text !== undefined &&
        typeof action.target_text !== "string"
    ) {
        throw new Error(
            "Resolution action invalid target_text.",
        );
    }

    //
    // MENU ITEM ID
    //

    if (
        menuItemRequiredIntents.has(
            String(obj.intent),
        ) &&
        typeof action.menu_item_id !== "string"
    ) {
        throw new Error(
            "Resolution action missing menu_item_id.",
        );
    }

    //
    // NAME
    //

    if (
        action.name !== undefined &&
        typeof action.name !== "string"
    ) {
        throw new Error(
            "Resolution action invalid name.",
        );
    }

    //
    // QUANTITY
    //

    if (
        quantityRequiredIntents.has(
            String(obj.intent),
        ) &&
        typeof action.quantity !== "number"
    ) {
        throw new Error(
            "Resolution action missing quantity.",
        );
    }

    //
    // MODIFIERS
    //

    if (
        action.modifiers !== undefined &&
        (
            typeof action.modifiers !== "object" ||
            Array.isArray(action.modifiers)
        )
    ) {
        throw new Error(
            "Resolution action invalid modifiers.",
        );
    }

    //
    // REFERENCE RESOLUTION
    //

    if (
        action.reference_resolution !== undefined &&
        action.reference_resolution !== null &&
        (
            typeof action.reference_resolution !== "object" ||
            Array.isArray(action.reference_resolution)
        )
    ) {
        throw new Error(
            "Resolution action invalid reference_resolution.",
        );
    }

    //
    // QUESTION
    //

    if (
        obj.question !== undefined &&
        typeof obj.question !== "string"
    ) {
        throw new Error(
            "Resolution result invalid question.",
        );
    }

    //
    // SUGGESTIONS
    //

    if (
        obj.suggestions !== undefined &&
        !Array.isArray(obj.suggestions)
    ) {
        throw new Error(
            "Resolution result invalid suggestions.",
        );
    }

    //
    // CONFIDENCE
    //

    if (
        obj.confidence !== undefined &&
        typeof obj.confidence !== "number"
    ) {
        throw new Error(
            "Resolution result invalid confidence.",
        );
    }
}