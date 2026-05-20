import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenuService } from "../menu.service";
import { MenuRepository } from "../../db/repositories/menu.repository";

vi.mock("../../db/repositories/menu.repository", () => ({
    MenuRepository: {
        listCategories: vi.fn(),
        listMenuItems: vi.fn(),
        getMenuItemById: vi.fn(),
        listModifierGroups: vi.fn(),
        listModifierOptions: vi.fn(),
        listMenuItemModifierGroups: vi.fn(),
    },
}));

describe("MenuService", () => {
    const sandwichCategoryRow = {
        id: "cat-sandwiches",
        code: "sandwiches",
        name: "Sandwiches",
        sort_order: 1,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const drinksCategoryRow = {
        id: "cat-drinks",
        code: "drinks",
        name: "Drinks",
        sort_order: 2,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const beefBurgerRow = {
        id: "burger_beef",
        category_id: "cat-sandwiches",
        name: "Grilled Beef Sandwich",
        price_cents: 899,
        image_url: "https://example.com/beef.png",
        is_available: true,
        sort_order: 0,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const colaRow = {
        id: "coke",
        category_id: "cat-drinks",
        name: "Classic Cola",
        price_cents: 250,
        image_url: "https://example.com/cola.png",
        is_available: true,
        sort_order: 0,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const unavailableRow = {
        id: "hidden_item",
        category_id: "cat-drinks",
        name: "Hidden Drink",
        price_cents: 999,
        image_url: "",
        is_available: false,
        sort_order: 99,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const modifierGroupRow = {
        id: "group-size",
        code: "size",
        name: "Size",
        is_required: false,
        min_select: 0,
        max_select: 1,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const modifierOptionRow = {
        id: "option-large",
        modifier_group_id: "group-size",
        code: "large",
        name: "Large",
        price_delta_cents: 50,
        sort_order: 0,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const menuItemModifierGroupRow = {
        menu_item_id: "coke",
        modifier_group_id: "group-size",
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("listCategories should map repository rows into domain categories", async () => {
        vi.mocked(MenuRepository.listCategories).mockResolvedValue([
            sandwichCategoryRow,
            drinksCategoryRow,
        ]);

        const result = await MenuService.listCategories();

        expect(result).toHaveLength(2);

        expect(result[0]).toEqual({
            id: "cat-sandwiches",
            code: "sandwiches",
            name: "Sandwiches",
            sortOrder: 1,
            createdAt: "2026-05-16T00:00:00.000Z",
        });

        expect(result[1].name).toBe("Drinks");
    });

    it("listMenuItems should map repository rows into domain menu items", async () => {
        vi.mocked(MenuRepository.listMenuItems).mockResolvedValue([
            beefBurgerRow,
            colaRow,
        ]);

        const result = await MenuService.listMenuItems();

        expect(result).toHaveLength(2);

        expect(result[0].id).toBe("burger_beef");
        expect(result[0].priceCents).toBe(899);

        expect(result[1].id).toBe("coke");
    });

    it("getMenuItemById should return mapped menu item", async () => {
        vi.mocked(MenuRepository.getMenuItemById).mockResolvedValue(
            beefBurgerRow
        );

        const result = await MenuService.getMenuItemById(
            "burger_beef"
        );

        expect(result).not.toBeNull();

        expect(result?.id).toBe("burger_beef");
        expect(result?.name).toBe("Grilled Beef Sandwich");
    });

    it("getMenuItemById should return null when item does not exist", async () => {
        vi.mocked(MenuRepository.getMenuItemById).mockResolvedValue(
            null
        );

        const result = await MenuService.getMenuItemById(
            "unknown"
        );

        expect(result).toBeNull();
    });

    it("getPromptMenuContext should build structured prompt context", async () => {
        vi.mocked(MenuRepository.listCategories).mockResolvedValue([
            sandwichCategoryRow,
            drinksCategoryRow,
        ]);

        vi.mocked(MenuRepository.listMenuItems).mockResolvedValue([
            beefBurgerRow,
            colaRow,
            unavailableRow,
        ]);

        vi.mocked(MenuRepository.listModifierGroups).mockResolvedValue([
            modifierGroupRow,
        ]);

        vi.mocked(MenuRepository.listModifierOptions).mockResolvedValue([
            modifierOptionRow,
        ]);

        vi.mocked(
            MenuRepository.listMenuItemModifierGroups
        ).mockResolvedValue([
            menuItemModifierGroupRow,
        ]);

        const result =
            await MenuService.getPromptMenuContext();

        expect(result.restaurant_name)
            .toBe("The Intelligent Bistro");

        expect(result.categories)
            .toHaveLength(2);

        expect(
            result.categories[0].items
        ).toHaveLength(1);

        expect(
            result.categories[1].items
        ).toHaveLength(1);

        expect(
            result.categories[1].items[0].modifiers
        ).toEqual({
            size: ["large"],
        });
    });

    it("getPromptMenuContext should exclude unavailable menu items", async () => {
        vi.mocked(MenuRepository.listCategories).mockResolvedValue([
            drinksCategoryRow,
        ]);

        vi.mocked(MenuRepository.listMenuItems).mockResolvedValue([
            unavailableRow,
        ]);

        vi.mocked(MenuRepository.listModifierGroups).mockResolvedValue(
            []
        );

        vi.mocked(MenuRepository.listModifierOptions).mockResolvedValue(
            []
        );

        vi.mocked(
            MenuRepository.listMenuItemModifierGroups
        ).mockResolvedValue([]);

        const result =
            await MenuService.getPromptMenuContext();

        expect(
            result.categories[0].items
        ).toHaveLength(0);
    });

    it("getPromptMenuContext should include aliases", async () => {
        vi.mocked(MenuRepository.listCategories).mockResolvedValue(
            []
        );

        vi.mocked(MenuRepository.listMenuItems).mockResolvedValue(
            []
        );

        vi.mocked(MenuRepository.listModifierGroups).mockResolvedValue(
            []
        );

        vi.mocked(MenuRepository.listModifierOptions).mockResolvedValue(
            []
        );

        vi.mocked(
            MenuRepository.listMenuItemModifierGroups
        ).mockResolvedValue([]);

        const result =
            await MenuService.getPromptMenuContext();

        expect(result.aliases.sandwich)
            .toContain("burger_beef");

        expect(result.aliases.cola)
            .toContain("coke");
    });

    it("getPromptMenuContext should sort categories by sort_order", async () => {
        vi.mocked(MenuRepository.listCategories).mockResolvedValue([
            drinksCategoryRow,
            sandwichCategoryRow,
        ]);

        vi.mocked(MenuRepository.listMenuItems).mockResolvedValue(
            []
        );

        vi.mocked(MenuRepository.listModifierGroups).mockResolvedValue(
            []
        );

        vi.mocked(MenuRepository.listModifierOptions).mockResolvedValue(
            []
        );

        vi.mocked(
            MenuRepository.listMenuItemModifierGroups
        ).mockResolvedValue([]);

        const result =
            await MenuService.getPromptMenuContext();

        expect(result.categories[0].name)
            .toBe("Sandwiches");

        expect(result.categories[1].name)
            .toBe("Drinks");
    });
});