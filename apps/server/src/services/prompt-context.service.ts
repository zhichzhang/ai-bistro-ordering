// apps/server/src/services/prompt-context.service.ts

import type {
    CartContext,
    CartContextItem,
    CartExecutionContext,
    CartExecutionPreviousAction,
} from "../types/cart.types";

import type {
    CartItemModifierRow,
    ChatMessageActionRow,
} from "../types/db.types";

import type {
    PromptMenuContext,
    PromptMenuItem,
} from "../types/menu.types";

export class PromptContextService {
    /**
     * Serialize the current cart into prompt-friendly text.
     */
    static serializeCartContext(
        cart: CartContext | null,
        menuContext: PromptMenuContext
    ): string {
        if (!cart || cart.items.length === 0) {
            return "Cart is empty.";
        }

        const sortedItems =
            [...cart.items].sort(
                (a, b) =>
                    a.position - b.position
            );

        return [
            "CURRENT CART:",
            "",
            ...sortedItems.map(
                (item) =>
                    this.serializeCartItem(
                        item,
                        menuContext
                    )
            ),
        ].join("\n");
    }

    /**
     * Serialize lightweight modifier availability context.
     */
    static serializeModifierContext(
        menuContext: PromptMenuContext
    ): string {
        const lines: string[] = [];

        for (const category of menuContext.categories) {
            for (const item of category.items) {
                lines.push(item.name);

                const modifierKeys =
                    Object.keys(item.modifiers);

                if (modifierKeys.length === 0) {
                    lines.push("- no modifiers");
                    lines.push("");

                    continue;
                }

                for (const key of modifierKeys) {
                    lines.push(`- ${key}`);
                }

                lines.push("");
            }
        }

        return lines.join("\n");
    }

    /**
     * Serialize a single cart item into structured prompt context.
     */
    private static serializeCartItem(
        item: CartContextItem,
        menuContext: PromptMenuContext
    ): string {
        const modifiers =
            this.serializeModifiers(
                item.modifiers
            );

        const itemName =
            this.resolveMenuItemName(
                item.menu_item_id,
                menuContext
            );

        return [
            "------------------------------------------------",
            "",
            `[POSITION=${item.position}]`,
            `[CART_ITEM_ID=${item.id}]`,
            `[MENU_ITEM_ID=${item.menu_item_id}]`,
            "",
            itemName,
            "",
            `quantity: ${item.quantity}`,
            "",
            `canonical identity: ${
                item.canonical_identity
            }`,
            "modifiers:",
            modifiers,
            "",
        ].join("\n");
    }

    /**
     * Serialize modifier selections into stable prompt text.
     */
    private static serializeModifiers(
        modifiers: CartItemModifierRow[]
    ): string {
        if (
            !modifiers ||
            modifiers.length === 0
        ) {
            return "- none";
        }

        return [...modifiers]
            .sort((a, b) =>
                a.modifier_group_code.localeCompare(
                    b.modifier_group_code
                )
            )
            .map((modifier) => {
                const group =
                    modifier.modifier_group_code
                        .split("__")
                        .pop() ??
                    modifier.modifier_group_code;

                return `- ${group}: ${modifier.modifier_option_code}`;
            })
            .join("\n");
    }

    /**
     * Serialize recent action history for prompt grounding.
     */
    static serializeRecentActions(
        actions: ChatMessageActionRow[]
    ): string {
        if (
            actions.length === 0
        ) {
            return "No recent actions.";
        }

        return [
            "RECENT ACTIONS:",
            "",
            ...actions.map(
                (action, index) => {
                    const lines = [
                        `${index}.`,
                        `type: ${
                            action.action_type
                        }`,
                        `status: ${
                            action.status
                        }`,
                    ];

                    const summary =
                        (
                            action.resolved_action as any
                        )?.name;

                    if (summary) {
                        lines.push(
                            `summary: ${summary}`
                        );
                    }

                    lines.push("");

                    return lines.join("\n");
                }
            ),
        ].join("\n");
    }

    /**
     * Serialize execution references for chained action resolution.
     */
    static serializeExecutionContext(
        executionContext:
            CartExecutionContext | null
    ): string {
        if (
            !executionContext ||
            executionContext.previousActions.length === 0
        ) {
            return "No execution context.";
        }

        return [
            "EXECUTION CONTEXT:",
            "",
            ...executionContext.previousActions.map(
                (action) =>
                    this.serializeExecutionAction(
                        action
                    )
            ),
        ].join("\n");
    }

    /**
     * Serialize a single execution reference entry.
     */
    private static serializeExecutionAction(
        action: CartExecutionPreviousAction
    ): string {
        return [
            `Action ${action.action_index}`,
            `type: ${
                action.action_type ??
                "unknown"
            }`,
            `target: ${
                action.target_text ??
                "unknown"
            }`,
            `summary: ${
                action.summary ??
                "none"
            }`,
            `resolved cart item id: ${
                action.resolved_cart_item_id ??
                "none"
            }`,
            `referenced cart item id: ${
                action.referenced_cart_item_id ??
                "none"
            }`,
            "",
        ].join("\n");
    }

    /**
     * Resolve menu item names for human-readable prompt context.
     */
    private static resolveMenuItemName(
        menuItemId: string,
        menuContext: PromptMenuContext
    ): string {
        const allItems:
            PromptMenuItem[] =
            menuContext.categories.flatMap(
                (category) =>
                    category.items
            );

        const item =
            allItems.find(
                (candidate) =>
                    candidate.id ===
                    menuItemId
            );

        if (!item) {
            return this.humanizeMenuItemId(
                menuItemId
            );
        }

        return item.name;
    }

    /**
     * Humanize unresolved menu item identifiers.
     */
    private static humanizeMenuItemId(
        menuItemId: string
    ): string {
        return menuItemId
            .replace(/_/g, " ")
            .replace(
                /\b\w/g,
                (char) =>
                    char.toUpperCase()
            );
    }
}