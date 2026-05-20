// apps/server/src/scripts/ingestion.script.ts

import fs from "fs/promises";
import path from "path";

import { supabase }
    from "../db/supabase";

import { throwIfError }
    from "../db/repositories/base.repository";

import type {
    PromptMenuCategory,
    PromptMenuContext,
    PromptMenuItem,
} from "../types/menu.types";

function priceToCents(
    price: number
): number {
    return Math.round(
        price * 100
    );
}

function normalizeCode(
    value: string
): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
}

function buildModifierGroupCode(
    itemId: string,
    groupName: string
): string {
    return `${itemId}__${normalizeCode(groupName)}`;
}

async function upsertCategory(
    category: PromptMenuCategory
) {
    const { data, error } =
        await supabase
            .from("categories")
            .upsert(
                {
                    code:
                    category.id,

                    name:
                    category.name,

                    sort_order:
                    category.sort_order,
                },
                {
                    onConflict: "code",
                }
            )
            .select("id, code")
            .single();

    throwIfError(error);

    if (!data) {
        throw new Error(
            `Failed to upsert category: ${category.id}`
        );
    }

    return data;
}

async function upsertMenuItem(
    item: PromptMenuItem,
    categoryId: string,
    sortOrder: number
) {
    const { error } =
        await supabase
            .from("menu_items")
            .upsert(
                {
                    id:
                    item.id,

                    category_id:
                    categoryId,

                    name:
                    item.name,

                    price_cents:
                        priceToCents(
                            item.price
                        ),

                    image_url:
                        item.image_url ?? "",

                    is_available:
                        true,

                    sort_order:
                    sortOrder,
                },
                {
                    onConflict: "id",
                }
            );

    throwIfError(error);
}

async function upsertModifierGroup(
    itemId: string,
    groupName: string
) {
    const code =
        buildModifierGroupCode(
            itemId,
            groupName
        );

    const { data, error } =
        await supabase
            .from("modifier_groups")
            .upsert(
                {
                    code,

                    name:
                    groupName,

                    is_required:
                        false,

                    min_select:
                        0,

                    max_select:
                        1,
                },
                {
                    onConflict: "code",
                }
            )
            .select("id, code")
            .single();

    throwIfError(error);

    if (!data) {
        throw new Error(
            `Failed to upsert modifier group: ${code}`
        );
    }

    return data;
}

async function upsertModifierOption(
    modifierGroupId: string,
    optionValue: string,
    sortOrder: number
) {
    const { error } =
        await supabase
            .from("modifier_options")
            .upsert(
                {
                    modifier_group_id:
                    modifierGroupId,

                    code:
                        normalizeCode(
                            optionValue
                        ),

                    name:
                    optionValue,

                    price_delta_cents:
                        0,

                    sort_order:
                    sortOrder,
                },
                {
                    onConflict:
                        "modifier_group_id,code",
                }
            );

    throwIfError(error);
}

async function linkItemAndModifierGroup(
    itemId: string,
    modifierGroupId: string
) {
    const { error } =
        await supabase
            .from("menu_item_modifier_groups")
            .upsert(
                {
                    menu_item_id:
                    itemId,

                    modifier_group_id:
                    modifierGroupId,
                },
                {
                    onConflict:
                        "menu_item_id,modifier_group_id",
                }
            );

    throwIfError(error);
}

async function main() {
    // Monorepo-safe shared menu path.
    const menuPath =
        path.resolve(
            process.cwd(),
            "../../packages/shared/menu.json"
        );

    const raw =
        await fs.readFile(
            menuPath,
            "utf-8"
        );

    const menu: PromptMenuContext =
        JSON.parse(raw);

    // Seed categories and menu items.
    for (const category of menu.categories) {
        const categoryRow =
            await upsertCategory(
                category
            );

        for (
            let itemIndex = 0;
            itemIndex < category.items.length;
            itemIndex++
        ) {
            const item =
                category.items[itemIndex];

            await upsertMenuItem(
                item,
                categoryRow.id,
                (item as any).sort_order ?? itemIndex
            );

            // Seed modifier groups and options.
            const modifierEntries =
                Object.entries(
                    item.modifiers ?? {}
                );

            for (
                const [
                    groupName,
                    options,
                ] of modifierEntries
                ) {
                const groupRow =
                    await upsertModifierGroup(
                        item.id,
                        groupName
                    );

                await linkItemAndModifierGroup(
                    item.id,
                    groupRow.id
                );

                for (
                    let optionIndex = 0;
                    optionIndex < options.length;
                    optionIndex++
                ) {
                    const option =
                        options[optionIndex];

                    await upsertModifierOption(
                        groupRow.id,
                        option,
                        optionIndex
                    );
                }
            }
        }
    }

    // Seed semantic aliases.
    if (menu.aliases) {
        for (
            const [
                alias,
                itemIds,
            ] of Object.entries(menu.aliases)
            ) {
            for (const itemId of itemIds) {
                const { error } =
                    await supabase
                        .from("menu_aliases")
                        .upsert(
                            {
                                alias:
                                    normalizeCode(alias),

                                menu_item_id:
                                itemId,
                            },
                            {
                                onConflict:
                                    "alias,menu_item_id",
                            }
                        );

                throwIfError(error);
            }
        }
    }

    console.log(
        "Menu seed completed."
    );
}

main().catch((err) => {
    console.error(
        "Failed to seed menu:",
        err
    );

    process.exit(1);
});