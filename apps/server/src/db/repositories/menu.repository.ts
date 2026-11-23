import { db } from "./cart.repository";
import { asRow } from "../row";
import type {
    CategoryRow, MenuItemModifierGroupRow, MenuItemRow,
    ModifierGroupRow, ModifierOptionRow,
}  from "../../types/db.types";

export class MenuRepository {
    static async listCategories(): Promise<CategoryRow[]> {
        return asRow(await db().category.findMany({ orderBy: { sort_order: "asc" } }));
    }

    static async listMenuItems(): Promise<MenuItemRow[]> {
        return asRow(await db().menuItem.findMany({ orderBy: { sort_order: "asc" } }));
    }

    static async getMenuItemById(id: string): Promise<MenuItemRow | null> {
        return asRow(await db().menuItem.findUnique({ where: { id } }));
    }

    static async listModifierGroups(): Promise<ModifierGroupRow[]> {
        return asRow(await db().modifierGroup.findMany({ orderBy: { created_at: "asc" } }));
    }

    static async listModifierOptions(): Promise<ModifierOptionRow[]> {
        return asRow(await db().modifierOption.findMany({ orderBy: { sort_order: "asc" } }));
    }

    static async listModifierOptionsByGroupId(modifierGroupId: string): Promise<ModifierOptionRow[]> {
        return asRow(await db().modifierOption.findMany({
            where: { modifier_group_id: modifierGroupId }, orderBy: { sort_order: "asc" },
        }));
    }

    static async listMenuItemModifierGroups(): Promise<MenuItemModifierGroupRow[]> {
        return asRow(await db().menuItemModifierGroup.findMany());
    }
}
