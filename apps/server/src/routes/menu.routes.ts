import { Router } from "express";
import { MenuService } from "../services/menu.service";

/**
 * Creates menu-related API routes.
 */
export function createMenuRouter(): Router {
    const router = Router();

    /**
     * GET /menu
     * Returns all menu categories.
     */
    router.get("/", async (_req, res, next) => {
        try {

            const context =
                await MenuService.getPromptMenuContext();

            res.json(context);

        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /menu/categories
     * Returns all menu categories.
     */
    router.get("/categories", async (_req, res, next) => {
        try {
            const categories = await MenuService.listCategories();

            res.json({ categories });
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /menu/items
     * Returns all menu items.
     */
    router.get("/items", async (_req, res, next) => {
        try {
            const items = await MenuService.listMenuItems();

            res.json({ items });
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /menu/items/:itemId
     * Returns a single menu item by id.
     */
    router.get("/items/:itemId", async (req, res, next) => {
        try {
            const item = await MenuService.getMenuItemById(
                req.params.itemId
            );

            if (!item) {
                res.status(404).json({
                    error: {
                        code: "NOT_FOUND",
                        message: "Menu item not found.",
                    },
                });

                return;
            }

            res.json({ item });
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /menu/context
     * Returns structured menu context for AI prompts.
     */
    router.get("/context", async (_req, res, next) => {
        try {
            const context =
                await MenuService.getPromptMenuContext();

            res.json({ context });
        } catch (error) {
            next(error);
        }
    });

    return router;
}