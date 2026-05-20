// apps/mobile/src/utils/menu-transform.ts

import type {
    PromptMenuContext,
    PromptMenuCategory,
    PromptMenuItem,
} from "../types/menu.types";

// ============================================
// RAW BACKEND TYPES
// ============================================

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

// ============================================
// NORMALIZE MODIFIERS
// ============================================

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

// ============================================
// TRANSFORM ITEM
// ============================================

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

// ============================================
// TRANSFORM CATEGORY
// ============================================

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

// ============================================
// MAIN TRANSFORM
// ============================================

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