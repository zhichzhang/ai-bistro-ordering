import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartService } from "../cart.service";
import { CartRepository } from "../../db/repositories/cart.repository";
import { ChatRepository } from "../../db/repositories/chat.repository";
import { MenuRepository } from "../../db/repositories/menu.repository";
import { MenuService } from "../menu.service";
import type { ResolutionResult } from "../../types/prompt.types";
import type { CartExecutionContext } from "../../types/cart.types";

vi.mock("../../db/repositories/cart.repository", () => ({
    CartRepository: {
        createCart: vi.fn(),
        getCartById: vi.fn(),
        listCartItems: vi.fn(),
        listCartItemModifiers: vi.fn(),
        createCartItem: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        deleteCartItem: vi.fn(),
        deleteModifiersByCartItemId: vi.fn(),
        getCartItemById: vi.fn(),
        addCartItemModifier: vi.fn(),
    },
}));

vi.mock("../../db/repositories/chat.repository", () => ({
    ChatRepository: {
        updateChatMessageAction: vi.fn(),
    },
}));

vi.mock("../../db/repositories/menu.repository", () => ({
    MenuRepository: {
        listModifierGroups: vi.fn(),
        listModifierOptions: vi.fn(),
    },
}));

vi.mock("../menu.service", () => ({
    MenuService: {
        getMenuItemById: vi.fn(),
    },
}));

describe("CartService", () => {
    const service = new CartService();

    const cartId = "550e8400-e29b-41d4-a716-446655440000";
    const cartItemId = "550e8400-e29b-41d4-a716-446655440001";
    const otherCartItemId = "550e8400-e29b-41d4-a716-446655440002";

    const cartRow = {
        id: cartId,
        status: "active",
        revision: 1,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const cartItemRow = {
        id: cartItemId,
        cart_id: cartId,
        menu_item_id: "burger_beef",
        quantity: 1,
        unit_price_cents: 899,
        line_total_cents: 899,
        note: null,
        position: 0,
        source_chat_message_id: null,
        source_action_index: null,
        source_chat_message_action_id: null,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const otherCartItemRow = {
        id: otherCartItemId,
        cart_id: cartId,
        menu_item_id: "fries",
        quantity: 2,
        unit_price_cents: 350,
        line_total_cents: 700,
        note: null,
        position: 1,
        source_chat_message_id: null,
        source_action_index: null,
        source_chat_message_action_id: null,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const cartItemModifierRow = {
        id: "modifier-row-1",
        cart_item_id: cartItemId,
        modifier_group_id: "group-cheese",
        modifier_option_id: "option-cheese-yes",
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const modifierGroupRow = {
        id: "group-cheese",
        code: "cheese",
        name: "Cheese",
        is_required: false,
        min_select: 0,
        max_select: 1,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    const modifierOptionRow = {
        id: "option-cheese-yes",
        modifier_group_id: "group-cheese",
        code: "yes",
        name: "Yes",
        price_delta_cents: 50,
        sort_order: 0,
        created_at: "2026-05-16T00:00:00.000Z",
    } as any;

    function makeResolution(
        type: ResolutionResult["action"]["type"],
        overrides: Partial<ResolutionResult> & {
            action?: Partial<ResolutionResult["action"]>;
        } = {}
    ): ResolutionResult {
        const { action: actionOverrides, ...rest } = overrides;

        return {
            intent: type as any,
            status: "success",
            action: {
                type,
                target_text: "",
                menu_item_id: "burger_beef",
                name: "Grilled Beef Sandwich",
                quantity: 1,
                modifiers: {},
                reference_resolution: {
                    type: "none",
                    action_index: null,
                    cart_item_id: null,
                    position: null,
                    text: null,
                },
                ...(actionOverrides ?? {}),
            } as any,
            question: "",
            message: "",
            suggestions: [],
            error_type: "",
            confidence: 0.99,
            ...rest,
        } as ResolutionResult;
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("createCart should delegate to CartRepository", async () => {
        vi.mocked(CartRepository.createCart).mockResolvedValue(cartRow);

        const result = await service.createCart("chat-session-1");

        expect(result).toBe(cartRow);
        expect(CartRepository.createCart).toHaveBeenCalledWith("chat-session-1");
    });

    it("getCartContext should return null when cart does not exist", async () => {
        vi.mocked(CartRepository.getCartById).mockResolvedValue(null);

        const result = await service.getCartContext(cartId);

        expect(result).toBeNull();
        expect(CartRepository.listCartItems).not.toHaveBeenCalled();
    });

    it("getCartContext should return cart with items and modifiers", async () => {
        vi.mocked(CartRepository.getCartById).mockResolvedValue(cartRow);
        vi.mocked(CartRepository.listCartItems).mockResolvedValue([
            cartItemRow,
            otherCartItemRow,
        ]);
        vi.mocked(CartRepository.listCartItemModifiers)
            .mockResolvedValueOnce([cartItemModifierRow])
            .mockResolvedValueOnce([]);

        const result = await service.getCartContext(cartId);

        expect(result).not.toBeNull();
        expect(result?.cart).toBe(cartRow);
        expect(result?.items).toHaveLength(2);
        expect(result?.items[0].id).toBe(cartItemId);
        expect(result?.items[0].modifiers).toEqual([cartItemModifierRow]);
        expect(result?.items[1].id).toBe(otherCartItemId);
        expect(result?.items[1].modifiers).toEqual([]);
    });

    it("addItem should create a cart item without modifiers", async () => {
        vi.mocked(MenuService.getMenuItemById).mockResolvedValue({
            id: "burger_beef",
            priceCents: 899,
        } as any);
        vi.mocked(CartRepository.createCartItem).mockResolvedValue(cartItemRow);

        const result = await service.addItem(cartId, {
            menuItemId: "burger_beef",
            quantity: 1,
            modifiers: {},
        });

        expect(result).toBe(cartItemRow);
        expect(MenuService.getMenuItemById).toHaveBeenCalledWith("burger_beef");
        expect(CartRepository.createCartItem).toHaveBeenCalledWith({
            cartId,
            menuItemId: "burger_beef",
            quantity: 1,
            unitPriceCents: 899,
        });
        expect(MenuRepository.listModifierGroups).not.toHaveBeenCalled();
        expect(MenuRepository.listModifierOptions).not.toHaveBeenCalled();
        expect(CartRepository.addCartItemModifier).not.toHaveBeenCalled();
    });

    it("addItem should resolve and attach normalized modifiers", async () => {
        vi.mocked(MenuService.getMenuItemById).mockResolvedValue({
            id: "burger_beef",
            priceCents: 899,
        } as any);
        vi.mocked(CartRepository.createCartItem).mockResolvedValue(cartItemRow);
        vi.mocked(MenuRepository.listModifierGroups).mockResolvedValue([
            modifierGroupRow,
        ]);
        vi.mocked(MenuRepository.listModifierOptions).mockResolvedValue([
            modifierOptionRow,
        ]);
        vi.mocked(CartRepository.addCartItemModifier).mockResolvedValue({
            id: "modifier-row-1",
        } as any);

        await service.addItem(cartId, {
            menuItemId: "burger_beef",
            quantity: 1,
            modifiers: {
                Cheese: "YES",
            },
        });

        expect(MenuRepository.listModifierGroups).toHaveBeenCalledTimes(1);
        expect(MenuRepository.listModifierOptions).toHaveBeenCalledTimes(1);
        expect(CartRepository.addCartItemModifier).toHaveBeenCalledWith({
            cartItemId,
            modifierGroupId: "group-cheese",
            modifierOptionId: "option-cheese-yes",
            priceDeltaCents: 50,
        });
    });

    it("addItem should throw when menu item does not exist", async () => {
        vi.mocked(MenuService.getMenuItemById).mockResolvedValue(null);

        await expect(
            service.addItem(cartId, {
                menuItemId: "unknown_item",
                quantity: 1,
                modifiers: {},
            })
        ).rejects.toThrow("Menu item not found: unknown_item");
    });

    it("removeItemById should delete modifiers before deleting the cart item", async () => {
        await service.removeItemById(cartItemId);

        expect(CartRepository.deleteModifiersByCartItemId).toHaveBeenCalledWith(
            cartItemId
        );
        expect(CartRepository.deleteCartItem).toHaveBeenCalledWith(cartItemId);
        expect(CartRepository.deleteModifiersByCartItemId).toHaveBeenCalledTimes(1);
        expect(CartRepository.deleteCartItem).toHaveBeenCalledTimes(1);
    });

    it("replaceItemModifiers should clear old modifiers and attach new ones", async () => {
        vi.mocked(MenuRepository.listModifierGroups).mockResolvedValue([
            modifierGroupRow,
        ]);
        vi.mocked(MenuRepository.listModifierOptions).mockResolvedValue([
            modifierOptionRow,
        ]);
        vi.mocked(CartRepository.addCartItemModifier).mockResolvedValue({
            id: "modifier-row-1",
        } as any);

        await service.replaceItemModifiers(cartItemId, "burger_beef", {
            cheese: "yes",
        });

        expect(CartRepository.deleteModifiersByCartItemId).toHaveBeenCalledWith(
            cartItemId
        );
        expect(CartRepository.addCartItemModifier).toHaveBeenCalledTimes(1);
    });

    it("clearCart should delete modifiers and items for every cart item", async () => {
        vi.mocked(CartRepository.listCartItems).mockResolvedValue([
            cartItemRow,
            otherCartItemRow,
        ]);

        await service.deleteCart(cartId);

        expect(CartRepository.listCartItems).toHaveBeenCalledWith(cartId);
        expect(CartRepository.deleteModifiersByCartItemId).toHaveBeenNthCalledWith(
            1,
            cartItemId
        );
        expect(CartRepository.deleteCartItem).toHaveBeenNthCalledWith(
            1,
            cartItemId
        );
        expect(CartRepository.deleteModifiersByCartItemId).toHaveBeenNthCalledWith(
            2,
            otherCartItemId
        );
        expect(CartRepository.deleteCartItem).toHaveBeenNthCalledWith(
            2,
            otherCartItemId
        );
    });

    it("executeResolvedAction should dispatch add_item to addItem", async () => {
        const addItemSpy = vi
            .spyOn(service, "addItem")
            .mockResolvedValue(cartItemRow);

        await service.executeResolvedAction({
            cartId,
            chatMessageActionId: "action-1",
            resolution: makeResolution("add_item"),
        });

        expect(addItemSpy).toHaveBeenCalledWith(cartId, {
            menuItemId: "burger_beef",
            quantity: 1,
            modifiers: {},
        });
        expect(ChatRepository.updateChatMessageAction).toHaveBeenCalledWith(
            "action-1",
            {
                resolved_cart_item_id: cartItemId,
            }
        );
    });

    it("executeResolvedAction should resolve cart_position for remove_item", async () => {
        vi.mocked(CartRepository.listCartItems).mockResolvedValue([
            cartItemRow,
            otherCartItemRow,
        ]);
        const removeSpy = vi
            .spyOn(service, "removeItemById")
            .mockResolvedValue(undefined);

        const resolution = makeResolution("remove_item", {
            action: {
                reference_resolution: {
                    type: "cart_position",
                    action_index: null,
                    cart_item_id: null,
                    position: 1,
                    text: null,
                },
            } as any,
        });

        expect(resolution.action.type).toBe("remove_item");
        expect(resolution.action.reference_resolution.type).toBe("cart_position");
        expect(resolution.action.reference_resolution.position).toBe(1);

        await service.executeResolvedAction({
            cartId,
            chatMessageActionId: "action-2",
            resolution,
        });

        expect(removeSpy).toHaveBeenCalledWith(otherCartItemId);
        expect(ChatRepository.updateChatMessageAction).toHaveBeenCalledWith(
            "action-2",
            {
                resolved_cart_item_id: otherCartItemId,
            }
        );
    });

    it("executeResolvedAction should resolve previous_action for update_quantity", async () => {
        const updateSpy = vi
            .spyOn(service, "updateItemQuantity")
            .mockResolvedValue(cartItemRow);

        const executionContext: CartExecutionContext = {
            previousActions: [
                {
                    action_index: 7,
                    resolved_cart_item_id: cartItemId,
                    referenced_cart_item_id: null,
                },
            ],
        };

        await service.executeResolvedAction({
            cartId,
            chatMessageActionId: "action-3",
            resolution: makeResolution("update_quantity", {
                action: {
                    quantity: 3,
                    reference_resolution: {
                        type: "previous_action",
                        action_index: 7,
                        cart_item_id: null,
                        position: null,
                        text: null,
                    },
                } as any,
            }),
            executionContext,
        });

        expect(updateSpy).toHaveBeenCalledWith(cartItemId, 3);
        expect(ChatRepository.updateChatMessageAction).toHaveBeenCalledWith(
            "action-3",
            {
                resolved_cart_item_id: cartItemId,
            }
        );
    });

    it("executeResolvedAction should resolve explicit_cart_reference for modify_item", async () => {
        const replaceSpy = vi
            .spyOn(service, "replaceItemModifiers")
            .mockResolvedValue(undefined);

        vi.mocked(CartRepository.listCartItems).mockResolvedValue([
            cartItemRow,
        ]);

        await service.executeResolvedAction({
            cartId,
            chatMessageActionId: "action-4",
            resolution: makeResolution("modify_item", {
                action: {
                    menu_item_id: "burger_beef",
                    modifiers: {
                        cheese: "yes",
                    },
                    reference_resolution: {
                        type: "explicit_cart_reference",
                        action_index: null,
                        cart_item_id: null,
                        position: null,
                        text: "the beef sandwich",
                    },
                } as any,
            }),
        });

        expect(replaceSpy).toHaveBeenCalledWith(cartItemId, "burger_beef", {
            cheese: "yes",
        });
        expect(ChatRepository.updateChatMessageAction).toHaveBeenCalledWith(
            "action-4",
            {
                resolved_cart_item_id: cartItemId,
            }
        );
    });

    it("executeResolvedAction should clear the cart for clear_cart", async () => {
        const clearSpy = vi.spyOn(service, "deleteCart").mockResolvedValue(undefined);

        await service.executeResolvedAction({
            cartId,
            chatMessageActionId: "action-5",
            resolution: makeResolution("clear_cart"),
        });

        expect(clearSpy).toHaveBeenCalledWith(cartId);
    });

    it("executeResolvedAction should ignore non-success results", async () => {
        const addSpy = vi.spyOn(service, "addItem");

        await service.executeResolvedAction({
            cartId,
            chatMessageActionId: "action-6",
            resolution: {
                ...makeResolution("view_cart"),
                status: "needs_clarification",
            } as any,
        });

        expect(addSpy).not.toHaveBeenCalled();
        expect(CartRepository.createCartItem).not.toHaveBeenCalled();
        expect(ChatRepository.updateChatMessageAction).not.toHaveBeenCalled();
    });
});