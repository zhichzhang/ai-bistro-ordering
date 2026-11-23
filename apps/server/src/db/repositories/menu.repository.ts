import { prisma } from "../prisma";
import { asRow } from "../row";
import type {
    CategoryRow, MenuItemModifierGroupRow, MenuItemRow,
    ModifierGroupRow, ModifierOptionRow,
} from "../../types/db.types";

export class MenuRepository {
    static async listCategories(): Promise<CategoryRow[]> {
        return asRow(await prisma.category.findMany({ orderBy: { sort_order: "asc" } }));
    }

    static async listMenuItems(): Promise<MenuItemRow[]> {
        return asRow(await prisma.menuItem.findMany({ orderBy: { sort_order: "asc" } }));
    }

    static async getMenuItemById(id: string): Promise<MenuItemRow | null> {
        return asRow(await prisma.menuItem.findUnique({ where: { id } }));
    }

    static async listModifierGroups(): Promise<ModifierGroupRow[]> {
        return asRow(await prisma.modifierGroup.findMany({ orderBy: { created_at: "asc" } }));
    }

    static async listModifierOptions(): Promise<ModifierOptionRow[]> {
        return asRow(await prisma.modifierOption.findMany({ orderBy: { sort_order: "asc" } }));
    }

    static async listModifierOptionsByGroupId(modifierGroupId: string): Promise<ModifierOptionRow[]> {
        return asRow(await prisma.modifierOption.findMany({
            where: { modifier_group_id: modifierGroupId }, orderBy: { sort_order: "asc" },
        }));
    }

    static async listMenuItemModifierGroups(): Promise<MenuItemModifierGroupRow[]> {
        return asRow(await prisma.menuItemModifierGroup.findMany());
    }
}
