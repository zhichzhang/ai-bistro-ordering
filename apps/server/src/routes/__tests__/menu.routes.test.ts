import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMenuRouter } from "../menu.routes";
import { MenuService } from "../../services/menu.service";

vi.mock("../../services/menu.service", () => ({
    MenuService: {
        listCategories: vi.fn(),
        listMenuItems: vi.fn(),
        getMenuItemById: vi.fn(),
        getPromptMenuContext: vi.fn(),
    },
}));

describe("menu routes", () => {
    const app = express();

    app.use(express.json());
    app.use("/menu", createMenuRouter());

    app.use(
        (
            err: unknown,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction
        ) => {
            const message =
                err instanceof Error ? err.message : "Internal Server Error";

            res.status(500).json({
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message,
                },
            });
        }
    );

    const categories = [
        {
            id: "cat_sandwiches",
            code: "sandwiches",
            name: "Sandwiches",
            sort_order: 1,
            created_at: "2026-05-16T00:00:00.000Z",
        },
        {
            id: "cat_drinks",
            code: "drinks",
            name: "Drinks",
            sort_order: 2,
            created_at: "2026-05-16T00:00:00.000Z",
        },
    ] as any[];

    const menuItems = [
        {
            idx: 0,
            id: "burger_beef",
            category_id: "cat_sandwiches",
            name: "Grilled Beef Sandwich",
            price_cents: 899,
            image_url: "https://example.com/burger.png",
            is_available: true,
            sort_order: 0,
            created_at: "2026-05-16T00:00:00.000Z",
            updated_at: "2026-05-16T00:00:00.000Z",
        },
        {
            idx: 1,
            id: "water_large",
            category_id: "cat_drinks",
            name: "Large Water",
            price_cents: 199,
            image_url: "https://example.com/water.png",
            is_available: true,
            sort_order: 1,
            created_at: "2026-05-16T00:00:00.000Z",
            updated_at: "2026-05-16T00:00:00.000Z",
        },
    ] as any[];

    const menuContext = {
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
                        image_url: "https://example.com/burger.png",
                        modifiers: [],
                    },
                ],
            },
            {
                id: "cat_drinks",
                name: "Drinks",
                sort_order: 2,
                items: [
                    {
                        id: "water_large",
                        name: "Large Water",
                        category: "Drinks",
                        price: 1.99,
                        image_url: "https://example.com/water.png",
                        modifiers: [],
                    },
                ],
            },
        ],
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("GET /menu should return categories", async () => {
        vi.mocked(MenuService.listCategories).mockResolvedValue(categories);

        const res = await request(app).get("/menu");

        expect(res.status).toBe(200);
        expect(res.body.categories).toHaveLength(2);
        expect(res.body.categories[0]).toMatchObject({
            id: "cat_sandwiches",
            name: "Sandwiches",
        });
        expect(res.body.categories[1]).toMatchObject({
            id: "cat_drinks",
            name: "Drinks",
        });
        expect(MenuService.listCategories).toHaveBeenCalledTimes(1);
    });

    it("GET /menu/categories should return categories", async () => {
        vi.mocked(MenuService.listCategories).mockResolvedValue(categories);

        const res = await request(app).get("/menu/categories");

        expect(res.status).toBe(200);
        expect(res.body.categories).toHaveLength(2);
        expect(res.body.categories[0]).toMatchObject({
            id: "cat_sandwiches",
            name: "Sandwiches",
        });
        expect(MenuService.listCategories).toHaveBeenCalledTimes(1);
    });

    it("GET /menu/items should return menu items", async () => {
        vi.mocked(MenuService.listMenuItems).mockResolvedValue(menuItems);

        const res = await request(app).get("/menu/items");

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(2);
        expect(res.body.items[0]).toMatchObject({
            id: "burger_beef",
            name: "Grilled Beef Sandwich",
            price_cents: 899,
            is_available: true,
        });
        expect(res.body.items[1]).toMatchObject({
            id: "water_large",
            name: "Large Water",
            price_cents: 199,
            is_available: true,
        });
        expect(MenuService.listMenuItems).toHaveBeenCalledTimes(1);
    });

    it("GET /menu/items/:itemId should return a single item", async () => {
        vi.mocked(MenuService.getMenuItemById).mockResolvedValue(menuItems[0]);

        const res = await request(app).get("/menu/items/burger_beef");

        expect(res.status).toBe(200);
        expect(res.body.item).toMatchObject({
            id: "burger_beef",
            name: "Grilled Beef Sandwich",
            price_cents: 899,
            is_available: true,
        });
        expect(MenuService.getMenuItemById).toHaveBeenCalledWith("burger_beef");
    });

    it("GET /menu/items/:itemId should return 404 when item not found", async () => {
        vi.mocked(MenuService.getMenuItemById).mockResolvedValue(null);

        const res = await request(app).get("/menu/items/missing-item");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: {
                code: "NOT_FOUND",
                message: "Menu item not found.",
            },
        });
        expect(MenuService.getMenuItemById).toHaveBeenCalledWith("missing-item");
    });

    it("GET /menu/context should return prompt context", async () => {
        vi.mocked(MenuService.getPromptMenuContext).mockResolvedValue(menuContext);

        const res = await request(app).get("/menu/context");

        expect(res.status).toBe(200);
        expect(res.body.context).toMatchObject({
            restaurant_name: "The Intelligent Bistro",
        });
        expect(res.body.context.categories).toHaveLength(2);
        expect(res.body.context.categories[0]).toMatchObject({
            name: "Sandwiches",
        });
        expect(res.body.context.categories[1]).toMatchObject({
            name: "Drinks",
        });
        expect(MenuService.getPromptMenuContext).toHaveBeenCalledTimes(1);
    });

    it("should forward service errors to middleware", async () => {
        vi.mocked(MenuService.listCategories).mockRejectedValue(
            new Error("DB failed")
        );

        const res = await request(app).get("/menu");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "DB failed",
            },
        });
    });
});