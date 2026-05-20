// apps/mobile/src/services/menu.service.ts

import { apiService }
    from "./api.service";

import type {
    MenuContextResponse,
    MenuCategoriesResponse,
    MenuItemsResponse,
    MenuItemResponse,
} from "../types/menu.types";

export const menuService = {

    //
    // FULL MENU CONTEXT
    //

    async getMenu() {

        return apiService.get<MenuContextResponse>(
            "/menu"
        );
    },

    //
    // MENU CONTEXT FOR AI
    //

    async getMenuContext() {

        return apiService.get<MenuContextResponse>(
            "/menu/context"
        );
    },

    //
    // CATEGORIES
    //

    async getCategories() {

        return apiService.get<MenuCategoriesResponse>(
            "/menu/categories"
        );
    },

    //
    // ITEMS
    //

    async getItems() {

        return apiService.get<MenuItemsResponse>(
            "/menu/items"
        );
    },

    //
    // SINGLE ITEM
    //

    async getItem(
        itemId: string
    ) {

        return apiService.get<MenuItemResponse>(
            `/menu/items/${itemId}`
        );
    },
};