import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuService } from "../menu.service";
import { ResolutionService } from "../resolution.service";
import {NormalizedAction} from "../../types/prompt.types";
import {PromptMenuContext} from "../../types/menu.types";

const generateMock = vi.fn();

vi.mock("node:fs/promises", () => ({
    readFile: vi.fn(),
}));

vi.mock("../menu.service", () => ({
    MenuService: {
        getPromptMenuContext: vi.fn(),
    },
}));

describe("ResolutionService", () => {
    const promptTemplate = [
        "You are a strict restaurant order parsing engine for a mobile food-ordering app called \"Bistro AI\".",
        "",
        "MENU_CONTEXT:",
        "{{MENU_CONTEXT}}",
        "",
        "CURRENT_CART_CONTEXT:",
        "{{CURRENT_CART_CONTEXT}}",
        "",
        "EXECUTION_CONTEXT:",
        "{{EXECUTION_CONTEXT}}",
        "",
        "NORMALIZED_ACTION:",
        "{{NORMALIZED_ACTION}}",
    ].join("\n");

    const menuContext: PromptMenuContext = {
        restaurant_name: "The Intelligent Bistro",
        categories: [
            {
                id: "cat_sandwiches",
                name: "Sandwiches",
                sort_order: 1,
                items: [
                    {
                        id: "burger_beef",
                        name: "Grilled Beef Sandwich",
                        category: "Sandwiches",
                        price: 8.99,
                        image_url: "https://example.com/beef.png",
                        modifiers: {
                            size: ["single", "double"],
                            cheese: ["yes", "no"],
                            spice: ["mild", "spicy"],
                        },
                    },
                ],
            },
        ],
        aliases: {
            sandwich: ["burger_beef"],
            cola: ["coke"],
        },
    };

    const normalizedAction: NormalizedAction = {
        index: 0,
        type: "remove_item",
        target_text: "the second one",
        quantity: 1,
        modifiers: {},
        reference: {
            type: "cart_position",
            action_index: null,
            cart_item_id: null,
            position: 1,
            text: "the second one",
        },
        depends_on: [],
        raw_text: "Remove the second one",
    };

    const validResolution = {
        intent: "remove_item",
        status: "success",
        action: {
            type: "remove_item",
            target_text: "the second one",
            menu_item_id: "coke",
            name: "Classic Cola",
            quantity: 1,
            modifiers: {},
            reference_resolution: {
                type: "cart_position",
                action_index: null,
                cart_item_id: "ci_002",
                position: 1,
                text: "the second one",
            },
        },
        question: "",
        message: "",
        suggestions: [],
        error_type: "",
        confidence: 0.93,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (ResolutionService as any).promptTemplatePromise = null;
        vi.mocked(readFile).mockResolvedValue(promptTemplate);
        vi.mocked(MenuService.getPromptMenuContext).mockResolvedValue(menuContext);
        generateMock.mockReset();
    });

    it("should build the prompt with menu, cart, execution, and normalized action contexts", async () => {
        generateMock.mockResolvedValue(JSON.stringify(validResolution));

        const llm = {
            generate: generateMock,
        };

        const service = new ResolutionService(llm);

        const currentCartContext = {
            cart: {
                id: "cart-1",
                session_id: "session-1",
            },
            items: [
                {
                    id: "ci_001",
                    menu_item_id: "burger_beef",
                },
                {
                    id: "ci_002",
                    menu_item_id: "coke",
                },
            ],
        };

        const executionContext = {
            previousActions: [
                {
                    action_index: 0,
                    resolved_cart_item_id: "ci_001",
                },
            ],
        };

        const result = await service.resolveAction({
            currentCartContext,
            executionContext,
            normalizedAction,
        });

        expect(MenuService.getPromptMenuContext).toHaveBeenCalledTimes(1);
        expect(generateMock).toHaveBeenCalledTimes(1);

        const prompt = generateMock.mock.calls[0][0] as string;

        expect(prompt).toContain(JSON.stringify(menuContext, null, 2));
        expect(prompt).toContain(JSON.stringify(currentCartContext, null, 2));
        expect(prompt).toContain(JSON.stringify(executionContext, null, 2));
        expect(prompt).toContain(JSON.stringify(normalizedAction, null, 2));

        expect(result).toEqual(validResolution);
    });

    it("should parse fenced JSON returned by the model", async () => {
        generateMock.mockResolvedValue(
            [
                "```json",
                JSON.stringify(validResolution, null, 2),
                "```",
            ].join("\n")
        );

        const service = new ResolutionService({
            generate: generateMock,
        });

        const result = await service.resolveAction({
            currentCartContext: null,
            executionContext: null,
            normalizedAction,
        });

        expect(result.intent).toBe("remove_item");
        expect(result.status).toBe("success");
        expect(result.action.reference_resolution.type).toBe("cart_position");
        expect(result.action.reference_resolution.position).toBe(1);
    });

    it("should parse raw JSON with extra surrounding text", async () => {
        generateMock.mockResolvedValue(
            `Here is the result:\n${JSON.stringify(validResolution, null, 2)}\nThanks.`
        );

        const service = new ResolutionService({
            generate: generateMock,
        });

        const result = await service.resolveAction({
            currentCartContext: null,
            executionContext: null,
            normalizedAction,
        });

        expect(result.action.menu_item_id).toBe("coke");
        expect(result.action.name).toBe("Classic Cola");
    });

    it("should throw when the model output is missing required fields", async () => {
        generateMock.mockResolvedValue(
            JSON.stringify({
                intent: "remove_item",
                status: "success",
                action: {
                    type: "remove_item",
                    target_text: "the second one",
                    menu_item_id: "coke",
                    name: "Classic Cola",
                    quantity: 1,
                    modifiers: {},
                    // reference_resolution intentionally missing
                },
                question: "",
                message: "",
                suggestions: [],
                error_type: "",
                confidence: 0.93,
            })
        );

        const service = new ResolutionService({
            generate: generateMock,
        });

        await expect(
            service.resolveAction({
                currentCartContext: null,
                executionContext: null,
                normalizedAction,
            })
        ).rejects.toThrow("Resolution action missing reference_resolution.");
    });

    it("should throw when the model output is not valid JSON", async () => {
        generateMock.mockResolvedValue("not json at all");

        const service = new ResolutionService({
            generate: generateMock,
        });

        await expect(
            service.resolveAction({
                currentCartContext: null,
                executionContext: null,
                normalizedAction,
            })
        ).rejects.toThrow();
    });
});