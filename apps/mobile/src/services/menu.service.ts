// apps/mobile/src/services/menu.service.ts

import { apiService } from "./api.service";

import type {
    MenuContextResponse,
    MenuCategoriesResponse,
    MenuItemsResponse,
    MenuItemResponse,
} from "../types/menu.types";

export const menuService = {
    /**
     * Fetch the full menu payload.
     */
    async getMenu() {
        return apiService.get<MenuContextResponse>(
            "/menu"
        );
    },

    /**
     * Fetch AI-oriented menu context.
     */
    async getMenuContext() {
        return apiService.get<MenuContextResponse>(
            "/menu/context"
        );
    },

    /**
     * Fetch all menu categories.
     */
    async getCategories() {
        return apiService.get<MenuCategoriesResponse>(
            "/menu/categories"
        );
    },

    /**
     * Fetch all menu items.
     */
    async getItems() {
        return apiService.get<MenuItemsResponse>(
            "/menu/items"
        );
    },

    /**
     * Fetch a single menu item.
     */
    async getItem(
        itemId: string
    ) {
        return apiService.get<MenuItemResponse>(
            `/menu/items/${itemId}`
        );
    },
};