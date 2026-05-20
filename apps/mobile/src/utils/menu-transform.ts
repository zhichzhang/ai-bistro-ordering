// apps/mobile/src/utils/menu-transform.ts

import type {
    PromptMenuContext,
    PromptMenuCategory,
    PromptMenuItem,
} from "../types/menu.types";

// Raw backend types

type RawMenuJson = {
    restaurant_name: string;

    categories: {
        id: string;
        name: string;
        sort_order: number;

        items: {
            id: string;
            name: string;
            category: string;
            price: number;
            image_url: string;

            modifiers?: Record<
                string,
                string[]
            >;
        }[];
    }[];

    aliases?: Record<
        string,
        string[]
    >;
};

/**
 * Normalize backend modifier keys into prompt-safe modifier names.
 */
function normalizeModifiers(
    modifiers?: Record<
        string,
        string[]
    >
): Record<string, string[]> {
    return Object.fromEntries(
        Object.entries(
            modifiers ?? {}
        ).map(([key, value]) => {
            const normalizedKey =
                key.includes("__")
                    ? key.split("__")[1]
                    : key;

            return [
                normalizedKey,
                value,
            ];
        })
    );
}

/**
 * Transform a raw backend menu item into prompt context format.
 */
function transformMenuItem(
    item: RawMenuJson["categories"][number]["items"][number]
): PromptMenuItem {
    return {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image_url: item.image_url,

        modifiers:
            normalizeModifiers(
                item.modifiers
            ),
    };
}

/**
 * Transform a backend category into prompt context format.
 */
function transformCategory(
    category: RawMenuJson["categories"][number]
): PromptMenuCategory {
    return {
        id: category.id,
        name: category.name,

        sort_order:
        category.sort_order,

        items:
            category.items.map(
                transformMenuItem
            ),
    };
}

/**
 * Convert backend menu JSON into AI prompt context structure.
 */
export function transformMenuJson(
    raw: RawMenuJson
): PromptMenuContext {
    return {
        restaurant_name:
        raw.restaurant_name,

        aliases:
            raw.aliases ?? {},

        categories:
            raw.categories.map(
                transformCategory
            ),
    };
}