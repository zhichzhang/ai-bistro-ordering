// apps/mobile/src/types/menu.types.ts

export type PromptMenuItem = {
    id: string;
    name: string;
    category: string;
    price: number;
    image_url: string;
    modifiers: Record<string, string[]>;
};

export type PromptMenuCategory = {
    id: string;
    name: string;
    sort_order: number;
    items: PromptMenuItem[];
};

export type PromptMenuContext = {
    restaurant_name: string;
    categories: PromptMenuCategory[];
    aliases: Record<string, string[]>;
};

// API responses

export type MenuContextResponse =
    PromptMenuContext;

export type MenuItemsResponse =
    PromptMenuItem[];

export type MenuCategoriesResponse =
    PromptMenuCategory[];

export type MenuItemResponse =
    PromptMenuItem;