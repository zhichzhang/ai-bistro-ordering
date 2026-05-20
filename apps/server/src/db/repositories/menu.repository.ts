// src/db/repositories/menu.repository.ts

import { supabase } from "../supabase";

import { throwIfError } from "./base.repository";

import type {
    CategoryRow,
    MenuItemModifierGroupRow,
    MenuItemRow,
    ModifierGroupRow,
    ModifierOptionRow,
} from "../../types/db.types";

export class MenuRepository {
    static async listCategories(): Promise<CategoryRow[]> {
        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .order("sort_order", { ascending: true });

        throwIfError(error);

        return (data ?? []) as CategoryRow[];
    }

    static async listMenuItems(): Promise<MenuItemRow[]> {
        const { data, error } = await supabase
            .from("menu_items")
            .select("*")
            .order("sort_order", { ascending: true });

        throwIfError(error);

        return (data ?? []) as MenuItemRow[];
    }

    static async getMenuItemById(
        id: string
    ): Promise<MenuItemRow | null> {
        const { data, error } = await supabase
            .from("menu_items")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        throwIfError(error);

        return (data as MenuItemRow | null) ?? null;
    }

    static async listModifierGroups(): Promise<ModifierGroupRow[]> {
        const { data, error } = await supabase
            .from("modifier_groups")
            .select("*")
            .order("created_at", { ascending: true });

        throwIfError(error);

        return (data ?? []) as ModifierGroupRow[];
    }

    static async listModifierOptions(): Promise<ModifierOptionRow[]> {
        const { data, error } = await supabase
            .from("modifier_options")
            .select("*")
            .order("sort_order", { ascending: true });

        throwIfError(error);

        return (data ?? []) as ModifierOptionRow[];
    }

    static async listModifierOptionsByGroupId(
        modifierGroupId: string
    ): Promise<ModifierOptionRow[]> {
        const { data, error } = await supabase
            .from("modifier_options")
            .select("*")
            .eq("modifier_group_id", modifierGroupId)
            .order("sort_order", { ascending: true });

        throwIfError(error);

        return (data ?? []) as ModifierOptionRow[];
    }

    /**
     * Load menu item to modifier group relationships.
     */
    static async listMenuItemModifierGroups(): Promise<MenuItemModifierGroupRow[]> {
        const { data, error } = await supabase
            .from("menu_item_modifier_groups")
            .select("*");

        throwIfError(error);

        return (data ?? []) as MenuItemModifierGroupRow[];
    }
}