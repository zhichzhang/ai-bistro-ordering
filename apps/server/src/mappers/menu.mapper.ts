// src/mappers/menu.mapper.ts

import {
    CategoryRow,
    MenuItemRow,
    ModifierGroupRow,
    ModifierOptionRow,
} from "../types/db.types";

import {
    Category,
    MenuItem,
    ModifierGroup,
    ModifierOption,
} from "../types/domain.types";

export function toCategory(row: CategoryRow): Category {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
    };
}

export function toMenuItem(row: MenuItemRow): MenuItem {
    return {
        id: row.id,
        categoryId: row.category_id,
        name: row.name,
        priceCents: row.price_cents,
        imageUrl: row.image_url,
        isAvailable: row.is_available,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toModifierGroup(
    row: ModifierGroupRow
): ModifierGroup {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        isRequired: row.is_required,
        minSelect: row.min_select,
        maxSelect: row.max_select,
        createdAt: row.created_at,
    };
}

export function toModifierOption(
    row: ModifierOptionRow
): ModifierOption {
    return {
        id: row.id,
        modifierGroupId: row.modifier_group_id,
        code: row.code,
        name: row.name,
        priceDeltaCents: row.price_delta_cents,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
    };
}