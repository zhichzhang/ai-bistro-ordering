// apps/server/src/types/menu.types.ts

export type PromptMenuContext = {
    restaurant_name: string;
    categories: PromptMenuCategory[];

    // Alias dictionary used during menu resolution.
    aliases: Record<string, string[]>;
};

export type PromptMenuCategory = {
    id: string;
    name: string;
    sort_order: number;
    items: PromptMenuItem[];
};

export type PromptMenuItem = {
    id: string;
    name: string;
    category: string;
    price: number;
    image_url: string;

    // modifier_group -> modifier_options
    modifiers: Record<string, string[]>;
};

export type MenuMatchResult = {
    query: string;
    normalizedQuery: string;
    candidates: PromptMenuItem[];
    item: PromptMenuItem | null;
    ambiguous: boolean;
};