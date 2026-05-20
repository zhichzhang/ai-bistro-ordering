// apps/server/src/services/menu.service.ts
import { MenuRepository } from "../db/repositories/menu.repository";
import { toCategory, toMenuItem, toModifierGroup, toModifierOption } from "../mappers/menu.mapper";
import type { Category, MenuItem, ModifierGroup, ModifierOption } from "../types/domain.types";
import type { MenuMatchResult, PromptMenuCategory, PromptMenuContext, PromptMenuItem } from "../types/menu.types";

type MenuItemModifierGroupRow = {
    menu_item_id: string;
    modifier_group_id: string;
};

const RESTAURANT_NAME = "The Intelligent Bistro";

const PROMPT_ALIASES: Record<string, string[]> = {
    sandwich: ["burger_beef", "burger_chicken", "burger_veggie"],
    burger: ["burger_beef", "burger_chicken", "burger_veggie"],
    "beef sandwich": ["burger_beef"],
    "chicken sandwich": ["burger_chicken"],
    "veggie sandwich": ["burger_veggie"],
    fries: ["fries"],
    "truffle fries": ["fries"],
    nuggets: ["chicken_nuggets"],
    cola: ["coke"],
    coke: ["coke"],
    soda: ["coke", "sprite"],
    "lemon soda": ["sprite"],
    water: ["water"],
    "mineral water": ["water"],
    "ice cream": ["ice_cream"],
    dessert: ["ice_cream"],
};

export class MenuService {
    static async listCategories(): Promise<Category[]> {
        const rows = await MenuRepository.listCategories();
        return rows.map(toCategory);
    }

    static async listMenuItems(): Promise<MenuItem[]> {
        const rows = await MenuRepository.listMenuItems();
        return rows.map(toMenuItem);
    }

    static async getMenuItemById(id: string): Promise<MenuItem | null> {
        const row = await MenuRepository.getMenuItemById(id);
        return row ? toMenuItem(row) : null;
    }

    static async getPromptMenuContext(): Promise<PromptMenuContext> {
        const [categoryRows, menuItemRows, modifierGroupRows, modifierOptionRows, menuItemModifierGroupRows] = await Promise.all([
            MenuRepository.listCategories(),
            MenuRepository.listMenuItems(),
            MenuRepository.listModifierGroups(),
            MenuRepository.listModifierOptions(),
            MenuRepository.listMenuItemModifierGroups(),
        ]);

        const categories = categoryRows
            .map(toCategory)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        const menuItems = menuItemRows
            .map(toMenuItem)
            .filter((item) => item.isAvailable)
            .sort((a, b) => {
                if (a.categoryId !== b.categoryId) {
                    return a.categoryId.localeCompare(b.categoryId);
                }
                return a.sortOrder - b.sortOrder;
            });

        const modifierGroups = modifierGroupRows.map(toModifierGroup);
        const modifierOptions = modifierOptionRows.map(toModifierOption);

        const modifierGroupById = new Map<string, ModifierGroup>(
            modifierGroups.map((group) => [group.id, group])
        );

        const modifierOptionsByGroupId = groupBy(
            modifierOptions,
            (option) => option.modifierGroupId
        );

        const modifierGroupIdsByMenuItemId = groupByArray(
            menuItemModifierGroupRows,
            (row) => row.menu_item_id,
            (row) => row.modifier_group_id
        );

        const menuItemsByCategoryId = groupBy(menuItems, (item) => item.categoryId);

        const promptCategories: PromptMenuCategory[] = categories.map((category) => ({
            id: category.id,
            name: category.name,
            sort_order: category.sortOrder,
            items: (menuItemsByCategoryId.get(category.id) ?? [])
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    category: category.name,
                    price: centsToDollars(item.priceCents),
                    image_url: item.imageUrl,
                    modifiers: buildPromptModifiersForItem(
                        item.id,
                        modifierGroupIdsByMenuItemId,
                        modifierGroupById,
                        modifierOptionsByGroupId
                    ),
                })),
        }));

        return {
            restaurant_name: RESTAURANT_NAME,
            categories: promptCategories,
            aliases: clone(PROMPT_ALIASES),
        };
    }

    static async getPromptMenuContextJson(): Promise<string> {
        return JSON.stringify(await this.getPromptMenuContext(), null, 2);
    }

    static async getPromptMenuItems(): Promise<PromptMenuItem[]> {
        const context = await this.getPromptMenuContext();

        return context.categories.flatMap(
            (category: PromptMenuCategory) => category.items
        );
    }

    static async getPromptCategories(): Promise<PromptMenuCategory[]> {
        const context = await this.getPromptMenuContext();
        return context.categories;
    }

    static async getPromptMenuItemById(itemId: string): Promise<PromptMenuItem | null> {
        const items = await this.getPromptMenuItems();
        return items.find((item) => item.id === itemId) ?? null;
    }

    static async getAllowedModifiersForItem(itemId: string): Promise<Record<string, string[]> | null> {
        const item = await this.getPromptMenuItemById(itemId);
        return item ? item.modifiers : null;
    }

    static async isModifierAllowed(itemId: string, modifierName: string, modifierValue: string): Promise<boolean> {
        const modifiers = await this.getAllowedModifiersForItem(itemId);
        if (!modifiers) {
            return false;
        }
        const allowedValues = modifiers[normalizeLookupKey(modifierName)];
        if (!allowedValues) {
            return false;
        }
        return allowedValues.includes(normalizeLookupKey(modifierValue));
    }

    static async findMenuItemCandidates(query: string): Promise<PromptMenuItem[]> {
        const normalizedQuery = normalizeLookupKey(query);

        const context = await this.getPromptMenuContext();

        const items: PromptMenuItem[] = context.categories.flatMap(
            (category: PromptMenuCategory): PromptMenuItem[] => category.items
        );

        const exactIdMatches = items.filter(
            (item: PromptMenuItem) =>
                normalizeLookupKey(item.id) === normalizedQuery
        );

        if (exactIdMatches.length > 0) {
            return exactIdMatches;
        }

        const aliasMatches = context.aliases[normalizedQuery];

        if (aliasMatches?.length) {
            const matchedByAlias = items.filter(
                (item: PromptMenuItem) =>
                    aliasMatches.includes(item.id)
            );

            if (matchedByAlias.length > 0) {
                return dedupeById(matchedByAlias);
            }
        }

        const exactNameMatches = items.filter(
            (item: PromptMenuItem) =>
                normalizeLookupKey(item.name) === normalizedQuery
        );

        if (exactNameMatches.length > 0) {
            return exactNameMatches;
        }

        const partialNameMatches = items.filter(
            (item: PromptMenuItem) => {
                const itemName = normalizeLookupKey(item.name);

                return (
                    itemName.includes(normalizedQuery) ||
                    normalizedQuery.includes(itemName)
                );
            }
        );

        return dedupeById(partialNameMatches);
    }

    static async resolveMenuItem(query: string): Promise<MenuMatchResult> {
        const normalizedQuery = normalizeLookupKey(query);
        const candidates = await this.findMenuItemCandidates(query);

        if (candidates.length === 1) {
            return {
                query,
                normalizedQuery,
                candidates,
                item: candidates[0],
                ambiguous: false,
            };
        }

        return {
            query,
            normalizedQuery,
            candidates,
            item: null,
            ambiguous: candidates.length > 1,
        };
    }

    static async buildCompleteModifiers(
        menuItemId: string,
        partialModifiers: Record<string, string>,
    ): Promise<Record<string, string>> {

        const completed: Record<string, string> = {
            ...partialModifiers,
        };

        const modifierGroups =
            await MenuRepository.listModifierGroups();

        const modifierOptions =
            await MenuRepository.listModifierOptions();

        //
        // all groups for this menu item
        //

        const groupsForMenuItem =
            modifierGroups.filter(
                (group) =>
                    group.code.startsWith(
                        `${menuItemId}__`
                    )
            );

        for (const group of groupsForMenuItem) {

            const normalizedGroup =
                group.code.replace(
                    `${menuItemId}__`,
                    ""
                );

            //
            // preserve explicit modifier
            //

            if (completed[normalizedGroup]) {
                continue;
            }

            //
            // default option = sort_order 0
            //

            const defaultOption =
                modifierOptions
                    .filter(
                        (option) =>
                            option.modifier_group_id ===
                            group.id
                    )
                    .sort(
                        (a, b) =>
                            a.sort_order -
                            b.sort_order
                    )[0];

            if (defaultOption) {

                completed[normalizedGroup] =
                    defaultOption.code;
            }
        }

        return completed;
    }
}

function buildPromptModifiersForItem(
    menuItemId: string,
    modifierGroupIdsByMenuItemId: Map<string, string[]>,
    modifierGroupById: Map<string, ModifierGroup>,
    modifierOptionsByGroupId: Map<string, ModifierOption[]>
): Record<string, string[]> {

    const modifierGroupIds =
        modifierGroupIdsByMenuItemId.get(
            menuItemId
        ) ?? [];

    const sortedGroupIds =
        [...modifierGroupIds].sort((a, b) => {

            const groupA =
                modifierGroupById.get(a);

            const groupB =
                modifierGroupById.get(b);

            return (
                groupA?.code ?? a
            ).localeCompare(
                groupB?.code ?? b
            );
        });

    const result:
        Record<string, string[]> = {};

    for (const modifierGroupId of sortedGroupIds) {

        const group =
            modifierGroupById.get(
                modifierGroupId
            );

        if (!group) {
            continue;
        }

        const options =
            (
                modifierOptionsByGroupId.get(
                    modifierGroupId
                ) ?? []
            )
                .slice()
                .sort(
                    (a, b) =>
                        a.sortOrder -
                        b.sortOrder
                );

        //
        // IMPORTANT:
        // frontend-facing semantic name
        // NOT canonical persistence code
        //

        result[group.name] =
            options.map(
                (option) =>
                    option.name
            );
    }

    return result;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of items) {
        const key = keyFn(item);
        const bucket = map.get(key);
        if (bucket) {
            bucket.push(item);
        } else {
            map.set(key, [item]);
        }
    }
    return map;
}

function groupByArray<T, K, V>(
    items: T[],
    keyFn: (item: T) => K,
    valueFn: (item: T) => V
): Map<K, V[]> {
    const map = new Map<K, V[]>();
    for (const item of items) {
        const key = keyFn(item);
        const value = valueFn(item);
        const bucket = map.get(key);
        if (bucket) {
            bucket.push(value);
        } else {
            map.set(key, [value]);
        }
    }
    return map;
}

function normalizeLookupKey(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ");
}

function dedupeById(items: PromptMenuItem[]): PromptMenuItem[] {
    const seen = new Set<string>();
    const result: PromptMenuItem[] = [];
    for (const item of items) {
        if (seen.has(item.id)) {
            continue;
        }
        seen.add(item.id);
        result.push(item);
    }
    return result;
}

function centsToDollars(value: number): number {
    return Math.round((value / 100) * 100) / 100;
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

