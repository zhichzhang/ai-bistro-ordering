import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Animated,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";

import type { PromptMenuItem } from "../types/menu.types";

import AIPromptBar from "../components/ai-prompt-bar.component";
import CartSheet from "../components/cart-sheet.component";
import CategoryRail from "../components/category-rail.component";
import MenuItemCard from "../components/menu-item-card.component";

import FloatingCartOverlay from "../overlays/floating-cart.overlay";
import ModifierSheet from "../overlays/modifier-sheet.overlay";
import { useToast } from "../overlays/toast-host.overlay";

import { orderingService } from "../services/ordering.service";
import { cartService } from "../services/cart.service";

import { useAppStore } from "../store/app-state.store";

import { formatUsd } from "../utils/currency";

/**
 * Build default modifier selections from menu definitions.
 */
function buildDefaultModifiers(
    item: PromptMenuItem
): Record<string, string> {

    return Object.entries(
        item.modifiers ?? {}
    ).reduce<
        Record<string, string>
    >(
        (acc, [group, options]) => {

            const normalizedGroup =
                group
                    .split("__")
                    .pop() ?? group;

            if (
                Array.isArray(options) &&
                options.length > 0
            ) {
                acc[normalizedGroup] =
                    options[0];
            }

            return acc;

        },
        {}
    );
}

/**
 * Normalize modifier values into stable comparison keys.
 */
function normalizeModifierCode(
    value: string
): string {

    return value
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");
}

/**
 * Main ordering experience screen coordinating menu, cart, and AI flows.
 */
export default function HomeScreen() {

    // =====================================
    // GLOBAL STORE
    // =====================================

    const menu =
        useAppStore(
            (state) => state.menu
        );

    const cartId =
        useAppStore(
            (state) => state.cartId
        );

    const sessionId =
        useAppStore(
            (state) => state.sessionId
        );

    const cart =
        useAppStore(
            (state) => state.cart
        );

    const setCart =
        useAppStore(
            (state) => state.setCart
        );

    const { showToast } =
        useToast();

    const insets =
        useSafeAreaInsets();

    // =====================================
    // CATEGORIES
    // =====================================

    /**
     * Preserve backend category ordering for menu rendering.
     */
    const categories =
        useMemo(() => {

            if (!menu) {
                return [];
            }

            return [
                ...(menu.categories ?? []),
            ].sort(
                (a, b) =>
                    a.sort_order -
                    b.sort_order
            );

        }, [menu]);

    // =====================================
    // LOCAL STATE
    // =====================================

    const [
        selectedCategoryId,
        setSelectedCategoryId,
    ] =
        useState<string | null>(
            null
        );

    const [
        cartVisible,
        setCartVisible,
    ] =
        useState(false);

    const [
        selectedItem,
        setSelectedItem,
    ] =
        useState<
            PromptMenuItem | null
        >(null);

    const [
        prompt,
        setPrompt,
    ] =
        useState("");

    const [
        aiLoading,
        setAiLoading,
    ] =
        useState(false);

    const [
        customizationVisible,
        setCustomizationVisible,
    ] =
        useState(false);

    const [
        selectedModifiers,
        setSelectedModifiers,
    ] =
        useState<
            Record<string, string>
        >({});

    const [
        editingLineKey,
        setEditingLineKey,
    ] =
        useState<string | null>(
            null
        );

    const [
        checkoutAnimating,
        setCheckoutAnimating,
    ] =
        useState(false);

    const [
        addingToCart,
        setAddingToCart,
    ] =
        useState(false);

    const [
        suggestions,
        setSuggestions,
    ] =
        useState<string[]>([]);

    // =====================================
    // REFS
    // =====================================

    const scrollRef =
        useRef<
            ScrollView | null
        >(null);

    const categoryOffsets =
        useRef<
            Record<string, number>
        >({});

    const cartScale =
        useRef(
            new Animated.Value(1)
        ).current;

    const cartButtonRef =
        useRef<View | null>(
            null
        );

    // =====================================
    // INITIAL CATEGORY
    // =====================================

    useEffect(() => {

        if (
            categories.length > 0 &&
            !selectedCategoryId
        ) {
            setSelectedCategoryId(
                categories[0].id
            );
        }

    }, [categories]);

    // =====================================
    // COMPUTED
    // =====================================

    const cartCount =
        cart?.items.reduce(
            (sum, item) =>
                sum + item.quantity,
            0
        ) ?? 0;

    const subtotal =
        (cart?.items.reduce(
            (sum, item) =>
                sum +
                item.line_total_cents,
            0
        ) ?? 0) / 100;

    /**
     * Derive cart sheet display data from canonical cart state.
     */
    const cartSheetItems =
        useMemo(() => {

            if (!cart || !menu) {
                return [];
            }

            return cart.items
                .map((line) => {

                    const menuItem =
                        menu.categories
                            .flatMap(
                                (c) => c.items
                            )
                            .find(
                                (item) =>
                                    item.id ===
                                    line.menu_item_id
                            );

                    if (!menuItem) {
                        return null;
                    }

                    const modifiers =
                        Object.fromEntries(
                            (line.modifiers ?? []).map(
                                (modifier) => [
                                    modifier.modifier_group_code
                                        .replace(
                                            `${line.menu_item_id}__`,
                                            ""
                                        ),
                                    modifier.modifier_option_code,
                                ]
                            )
                        );

                    return {
                        key: line.id,
                        item: menuItem,
                        quantity:
                        line.quantity,
                        modifiers,
                    };
                })
                .filter(
                    (
                        item
                    ): item is {
                        key: string;

                        item: PromptMenuItem;

                        quantity: number;

                        modifiers: Record<string, string>;
                    } => item !== null
                );

        }, [cart, menu]);

    // =====================================
    // HELPERS
    // =====================================

    /**
     * Restrict AI ordering input to English-safe prompts.
     */
    const isEnglishPrompt = (
        text: string
    ): boolean => {

        return /^[a-zA-Z0-9\s.,!?'"()\-:;/&]+$/.test(
            text.trim()
        );
    };

    /**
     * Add a menu item into the active cart session.
     */
    const addItem =
        async (
            item: PromptMenuItem,
            modifiers:
            Record<string, string> = {}
        ) => {

            if (addingToCart) {
                return;
            }

            if (!cart?.cart.id) {
                return;
            }

            try {

                setAddingToCart(true);

                pulseCart("add");

                const updatedCart =
                    await cartService.addItem(
                        cart.cart.id,
                        {
                            menuItemId:
                            item.id,

                            quantity: 1,

                            modifiers,
                        }
                    );

                setCart(updatedCart);

            } finally {

                setAddingToCart(false);
            }
        };

    /**
     * Increase quantity for an existing cart item.
     */
    const increaseItem =
        async (
            cartItemId: string,
            quantity: number
        ) => {

            if (!cart?.cart.id) {
                return;
            }

            const updatedCart =
                await cartService.updateItemQuantity(
                    cart.cart.id,
                    cartItemId,
                    quantity + 1
                );

            setCart(updatedCart);

            pulseCart("add");
        };

    /**
     * Remove a cart item from the active cart.
     */
    const decreaseItem =
        async (
            cartItemId: string
        ) => {

            if (!cart?.cart.id) {
                return;
            }

            const updatedCart =
                await cartService.deleteItem(
                    cart.cart.id,
                    cartItemId
                );

            setCart(updatedCart);

            pulseCart("remove");
        };

    /**
     * Open modifier editing for an existing cart line.
     */
    const openModifierEditor = (
        key: string
    ) => {

        const line =
            cartSheetItems.find(
                (item) =>
                    item.key === key
            );

        if (!line) {
            return;
        }

        setCartVisible(false);

        setEditingLineKey(key);

        setSelectedItem(
            line.item
        );

        setSelectedModifiers(
            Object.fromEntries(
                Object.entries(
                    line.modifiers
                ).map(([k, v]) => [
                    k,
                    normalizeModifierCode(v),
                ])
            )
        );

        setTimeout(() => {

            setCustomizationVisible(
                true
            );

        }, 220);
    };

    /**
     * Replace modifier selections for a cart item.
     */
    const replaceModifiers =
        async (
            cartItemId: string,
            modifiers:
            Record<string, string>
        ) => {

            if (!cart?.cart.id) {
                return;
            }

            const updatedCart =
                await cartService.replaceItemModifiers(
                    cart.cart.id,
                    cartItemId,
                    modifiers
                );

            setCart(updatedCart);
        };

    // =====================================
    // ACTIONS
    // =====================================

    /**
     * Submit the active cart and rotate into a fresh ordering session.
     */
    const handleCheckout =
        async () => {

            if (!cart?.cart.id) {
                return;
            }

            try {

                setCheckoutAnimating(
                    true
                );

                const response =
                    await cartService.checkoutCart(
                        cart.cart.id
                    );

                setCart({
                    cart:
                    response.nextCart.cart,

                    items: [],
                });

                useAppStore
                    .getState()
                    .setCartId(
                        response.nextCart.cart.id
                    );

                useAppStore
                    .getState()
                    .setSessionId(
                        response.nextCart.chatSessionId
                    );

                setPrompt("");

                setSelectedItem(null);

                setSelectedModifiers({});

                setEditingLineKey(null);

                setCustomizationVisible(false);

                setCartVisible(false);

                showToast({
                    type: "success",
                    message:
                        `Order ${response.orderNumber} confirmed.`,
                });

            } catch (error) {

                console.error(
                    "CHECKOUT ERROR:",
                    error
                );

                showToast({
                    type: "error",
                    message:
                        "Checkout failed.",
                });

            } finally {

                setCheckoutAnimating(
                    false
                );
            }
        };

    /**
     * Trigger cart feedback animation after cart mutations.
     */
    const pulseCart = (
        type: "add" | "remove"
    ) => {

        const peak =
            type === "add"
                ? 1.08
                : 0.96;

        Animated.sequence([
            Animated.spring(
                cartScale,
                {
                    toValue: peak,
                    useNativeDriver: true,
                    friction: 4,
                }
            ),

            Animated.spring(
                cartScale,
                {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 5,
                }
            ),
        ]).start();
    };

    /**
     * Execute an AI ordering turn against the backend orchestration pipeline.
     */
    const handleAISubmit =
        async () => {

            if (!sessionId) {
                return;
            }

            if (!prompt.trim()) {
                return;
            }

            if (!isEnglishPrompt(prompt)) {

                showToast({
                    type: "error",
                    message:
                        "Please enter your request in English.",
                });

                return;
            }

            try {

                setAiLoading(true);

                const response =
                    await orderingService.sendMessage(
                        sessionId,
                        prompt,
                    );

                setCart(response.cart);

                setPrompt("");

                if (
                    response.status === "success"
                ) {

                    setSuggestions([]);

                    showToast({
                        type: "success",
                        message:
                        response.assistantMessage,
                    });
                }

                if (
                    response.status ===
                    "needs_clarification"
                ) {

                    const clarifySuggestions =
                        response.resolutions?.[0]
                            ?.suggestions ?? [];

                    setSuggestions(
                        clarifySuggestions,
                    );

                    showToast({
                        type: "info",
                        message:
                        response.assistantMessage,
                    });
                }

            } catch {

                showToast({
                    type: "error",
                    message:
                        "Unable to process request.",
                });

            } finally {

                setAiLoading(false);
            }
        };

    if (!menu) {
        return null;
    }

    // =====================================
    // RENDER
    // =====================================

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={[
                "top",
                "left",
                "right",
            ]}
        >
            <StatusBar
                backgroundColor="#1B311D"
                barStyle="light-content"
            />

            <View
                style={styles.container}
                pointerEvents={
                    aiLoading
                        ? "none"
                        : "auto"
                }
            >
                <View
                    style={{
                        marginTop: -insets.top,
                    }}
                >
                    <LinearGradient
                        colors={[
                            "#1B311D",
                            "#36563A",
                            "#4F6A4C",
                            "#F3F1E7",
                        ]}
                        locations={[
                            0,
                            0.66,
                            0.76,
                            1,
                        ]}
                        style={styles.header}
                    >
                        <View style={styles.titleGlow} />

                        <View style={styles.headerLine} />

                        <Text style={styles.titleShadow}>
                            Grove & Grill
                        </Text>

                        <Text style={styles.title}>
                            Grove & Grill
                        </Text>

                        <Text style={styles.tagline}>
                            Fresh flavors crafted daily
                        </Text>

                        <View style={styles.headerAccentRow}>
                            <View style={styles.headerAccentDot} />

                            <View style={styles.headerAccentDivider} />

                            <View style={styles.headerAccentDot} />
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.aiBar}>
                    {
                        suggestions.length > 0 && (
                            <View style={styles.chipsContainer}>
                                {
                                    suggestions.map((s) => (
                                        <Pressable
                                            key={s}
                                            style={styles.chip}
                                            onPress={() => {

                                                setPrompt(s);

                                                setSuggestions([]);

                                                setTimeout(() => {
                                                    void handleAISubmit();
                                                }, 120);
                                            }}
                                        >
                                            <Text style={styles.chipText}>
                                                {s}
                                            </Text>
                                        </Pressable>
                                    ))
                                }
                            </View>
                        )
                    }

                    <AIPromptBar
                        value={prompt}
                        onChange={setPrompt}
                        onSubmit={handleAISubmit}
                        loading={aiLoading}
                        disabled={aiLoading}
                    />
                </View>

                <CategoryRail
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onPressCategory={(
                        categoryId
                    ) => {

                        setSelectedCategoryId(
                            categoryId
                        );

                        const y =
                            categoryOffsets
                                .current[
                                categoryId
                                ];

                        if (y != null) {

                            scrollRef.current
                                ?.scrollTo({
                                    y: Math.max(
                                        0,
                                        y - 12
                                    ),

                                    animated: true,
                                });
                        }
                    }}
                />

                <ScrollView
                    ref={scrollRef}
                    style={styles.menuScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.menuContent}
                >
                    {categories.map(
                        (category) => (
                            <View
                                key={category.id}
                                style={styles.section}
                                onLayout={(e) => {

                                    categoryOffsets
                                        .current[
                                        category.id
                                        ] =
                                        e.nativeEvent
                                            .layout.y;
                                }}
                            >
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        {category.name}
                                    </Text>
                                </View>

                                {category.items.map(
                                    (item) => (
                                        <MenuItemCard
                                            key={item.id}
                                            item={item}
                                            onPressAdd={async (
                                                cardItem,
                                                {}
                                            ) => {

                                                const hasModifiers =
                                                    Object.keys(
                                                        cardItem.modifiers ?? {}
                                                    ).length > 0;

                                                if (
                                                    !hasModifiers
                                                ) {

                                                    await addItem(
                                                        cardItem,
                                                        {}
                                                    );

                                                    return;
                                                }

                                                setSelectedItem(
                                                    cardItem
                                                );

                                                setEditingLineKey(null);

                                                setSelectedModifiers(
                                                    buildDefaultModifiers(
                                                        cardItem
                                                    )
                                                );

                                                setCustomizationVisible(
                                                    true
                                                );

                                            }}
                                            onPressItem={(
                                                cardItem
                                            ) => {

                                                setEditingLineKey(
                                                    null
                                                );

                                                setSelectedItem(
                                                    cardItem
                                                );

                                                setSelectedModifiers(
                                                    buildDefaultModifiers(
                                                        cardItem
                                                    )
                                                );

                                                setCustomizationVisible(
                                                    true
                                                );
                                            }}
                                        />
                                    )
                                )}
                            </View>
                        )
                    )}

                    <View
                        style={{
                            height: 220,
                        }}
                    />
                </ScrollView>

                <FloatingCartOverlay
                    checkoutAnimating={
                        checkoutAnimating
                    }
                    animatedScale={cartScale}
                    ref={cartButtonRef}
                    count={cartCount}
                    onPress={() =>
                        setCartVisible(true)
                    }
                />

                <View style={styles.bottomDock}>
                    <Pressable
                        style={styles.aiDock}
                        onPress={() =>
                            setCartVisible(true)
                        }
                    >
                        <Text style={styles.aiDockText}>
                            Cart subtotal
                        </Text>

                        <Text style={styles.aiDockHint}>
                            {formatUsd(
                                subtotal
                            )}
                        </Text>
                    </Pressable>
                </View>

                <CartSheet
                    visible={cartVisible}
                    items={cartSheetItems}
                    onClose={() =>
                        setCartVisible(false)
                    }
                    onIncrease={increaseItem}
                    onDecrease={decreaseItem}
                    onPressItem={openModifierEditor}
                    onCheckout={handleCheckout}
                />

                <ModifierSheet
                    visible={customizationVisible}
                    item={selectedItem}
                    value={selectedModifiers}
                    addingToCart={addingToCart}
                    onChange={(next) =>
                        setSelectedModifiers(
                            next
                        )
                    }
                    onClose={() => {

                        setCustomizationVisible(
                            false
                        );

                        setTimeout(() => {

                            setSelectedItem(
                                null
                            );

                            setSelectedModifiers(
                                {}
                            );

                        }, 180);
                    }}
                    onAdd={async (
                        next
                    ) => {

                        if (
                            !selectedItem
                        ) {
                            return;
                        }

                        if (editingLineKey) {

                            replaceModifiers(
                                editingLineKey,
                                next
                            );

                            pulseCart("add");

                        } else {

                            await addItem(
                                selectedItem,
                                next
                            );
                        }

                        setCustomizationVisible(
                            false
                        );

                        setSelectedItem(
                            null
                        );

                        setSelectedModifiers(
                            {}
                        );

                        setEditingLineKey(
                            null
                        );
                    }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles =
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: "transparent",
        },

        container: {
            flex: 1,

            backgroundColor:
                "#F3F1E7",
        },

        header: {
            // justifyContent: "flex-start",
            paddingTop: 86,

            paddingBottom: 26,

            paddingHorizontal: 24,

            alignItems: "center",

            justifyContent: "center",

            overflow: "hidden",


            // borderBottomLeftRadius: 28,
            //
            // borderBottomRightRadius: 28,
        },

        titleGlow: {
            position: "absolute",

            width: 220,

            height: 220,

            borderRadius: 999,

            backgroundColor:
                "rgba(190,220,170,0.10)",

            top: -46,
        },

        headerLine: {
            width: 42,

            height: 2,

            borderRadius: 999,

            backgroundColor: "#B6C7AE",

            marginBottom: 18,
        },

        titleShadow: {
            position: "absolute",

            top: 106,

            fontSize: 34,

            fontWeight: "900",

            color: "rgba(0,0,0,0.16)",

            transform: [
                { translateY: 3 },
            ],
        },

        title: {
            fontSize: 34,

            fontWeight: "900",

            color: "#F5F1E8",

            letterSpacing: -1,

            textAlign: "center",

            textShadowColor:
                "rgba(0,0,0,0.18)",

            textShadowOffset: {
                width: 0,
                height: 3,
            },

            textShadowRadius: 8,
        },

        tagline: {
            marginTop: 12,

            fontSize: 11,

            color: "#D5DFCF",

            letterSpacing: 1.8,

            textTransform: "uppercase",

            fontWeight: "600",
        },

        headerAccentRow: {
            marginTop: 18,

            flexDirection: "row",

            alignItems: "center",

            justifyContent: "center",
        },

        headerAccentDot: {
            width: 7,

            height: 7,

            borderRadius: 999,

            backgroundColor: "#AFC3A5",
        },

        headerAccentDivider: {
            width: 58,

            height: 1,

            backgroundColor:
                "rgba(220,230,215,0.5)",

            marginHorizontal: 14,
        },

        logo: {
            width: 88,

            height: 88,

            borderRadius: 22,
        },

        aiBar: {
            justifyContent:
                "center",

            marginHorizontal: 20,

            marginBottom: 14,

            backgroundColor:
                "#FFFFFF",

            borderRadius: 20,

            borderWidth: 1,

            borderColor:
                "#D7E1D2",

            paddingHorizontal: 10,

            paddingVertical: 10,

            shadowColor: "#000",

            shadowOpacity: 0.04,

            shadowRadius: 8,

            shadowOffset: {
                width: 0,
                height: 4,
            },

            elevation: 2,
        },

        menuScroll: {
            flex: 1,
        },

        menuContent: {
            paddingBottom: 24,
        },

        section: {
            paddingHorizontal: 20,

            marginTop: 26,
        },

        sectionHeader: {
            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "space-between",

            marginBottom: 14,
        },

        sectionTitle: {
            fontSize: 24,

            fontWeight: "800",

            color: "#244229",

            letterSpacing: -0.4,
        },

        bottomDock: {
            position: "absolute",

            left: 0,

            right: 0,

            bottom: 0,

            paddingHorizontal: 18,

            paddingTop: 10,

            paddingBottom: 20,

            backgroundColor:
                "rgba(243,241,231,0.94)",

            borderTopWidth: 1,

            borderTopColor:
                "#D9E0D3",
        },

        aiDock: {
            backgroundColor:
                "#244229",

            borderRadius: 22,

            paddingHorizontal: 18,

            paddingVertical: 16,

            alignItems: "center",
        },

        aiDockText: {
            fontSize: 13,

            fontWeight: "700",

            color: "#DCE8D8",

            textTransform:
                "uppercase",

            letterSpacing: 1,
        },

        aiDockHint: {
            marginTop: 6,

            fontSize: 24,

            fontWeight: "800",

            color: "#FFFFFF",
        },
        chipsContainer: {
            flexDirection: "row",

            flexWrap: "wrap",

            justifyContent: "center",

            alignItems: "center",

            marginHorizontal: 16,

            marginBottom: 12,

            gap: 10,
        },

        chip: {
            backgroundColor: "#EEF4EA",

            borderRadius: 999,

            borderWidth: 1,

            borderColor: "#D7E1D2",

            paddingHorizontal: 16,
            paddingVertical: 11,

            shadowColor: "#000",

            shadowOpacity: 0.05,

            shadowRadius: 8,

            shadowOffset: {
                width: 0,
                height: 4,
            },

            elevation: 2,
        },

        chipText: {
            color: "#244229",

            fontWeight: "700",

            fontSize: 14,

            letterSpacing: 0.2,
        },
    });