import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db/prisma";
import type { PromptMenuContext } from "../types/menu.types";

function code(value: string): string {
    return value.toLowerCase().trim().replace(/\s+/g, "_");
}

async function main(): Promise<void> {
    const menuPath = path.resolve(process.cwd(), "../../packages/shared/menu.json");
    const menu = JSON.parse(await fs.readFile(menuPath, "utf8")) as PromptMenuContext;
    const pricingPath = path.resolve(process.cwd(), "../../packages/shared/menu-pricing.json");
    const pricing = JSON.parse(await fs.readFile(pricingPath, "utf8")) as {
        surcharges: Record<string, Record<string, Record<string, number>>>;
        add_ons: Record<string, string[]>;
    };

    for (const category of menu.categories) {
        const categoryRow = await prisma.category.upsert({
            where: { code: category.id },
            update: { name: category.name, sort_order: category.sort_order },
            create: { code: category.id, name: category.name, sort_order: category.sort_order },
        });

        for (const [position, item] of category.items.entries()) {
            const values = {
                category_id: categoryRow.id,
                name: item.name,
                price_cents: Math.round(item.price * 100),
                image_url: item.image_url ?? "",
                is_available: true,
                sort_order: position,
            };
            await prisma.menuItem.upsert({
                where: { id: item.id }, update: values, create: { id: item.id, ...values },
            });

            const modifiers = {
                ...item.modifiers,
                ...(pricing.add_ons[item.id] ? { add_on: pricing.add_ons[item.id] } : {}),
            };
            for (const [groupName, options] of Object.entries(modifiers)) {
                const groupCode = `${item.id}__${code(groupName)}`;
                const group = await prisma.modifierGroup.upsert({
                    where: { code: groupCode },
                    update: { name: groupName },
                    create: { code: groupCode, name: groupName },
                });
                await prisma.menuItemModifierGroup.upsert({
                    where: { menu_item_id_modifier_group_id: {
                        menu_item_id: item.id, modifier_group_id: group.id,
                    } },
                    update: {},
                    create: { menu_item_id: item.id, modifier_group_id: group.id },
                });
                for (const [optionPosition, option] of options.entries()) {
                    const priceDeltaCents =
                        pricing.surcharges[item.id]?.[groupName]?.[option] ?? 0;
                    await prisma.modifierOption.upsert({
                        where: { modifier_group_id_code: {
                            modifier_group_id: group.id, code: code(option),
                        } },
                        update: {
                            name: option,
                            sort_order: optionPosition,
                            price_delta_cents: priceDeltaCents,
                        },
                        create: {
                            modifier_group_id: group.id,
                            code: code(option), name: option, sort_order: optionPosition,
                            price_delta_cents: priceDeltaCents,
                        },
                    });
                }
            }
        }
    }

    for (const [alias, ids] of Object.entries(menu.aliases ?? {})) {
        for (const itemId of ids) {
            const identity = { alias: code(alias), menu_item_id: itemId };
            await prisma.menuAlias.upsert({
                where: { alias_menu_item_id: identity }, update: {}, create: identity,
            });
        }
    }
    console.log("Menu seed completed.");
}

main().catch(error => {
    console.error("Failed to seed menu:", error);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
