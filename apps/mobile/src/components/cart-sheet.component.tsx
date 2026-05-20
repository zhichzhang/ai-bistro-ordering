// apps/mobile/src/components/cart-sheet.component.tsx

import React, {
    useEffect,
    useMemo,
    useRef,
} from "react";

import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";

import type { PromptMenuItem } from "../types/menu.types";

import CartItemRow from "./cart-item-row.component";

type CartLine = {
    key: string;

    item: PromptMenuItem;

    quantity: number;

    modifiers: Record<
        string,
        string
    >;
};

type Props = {
    visible: boolean;

    items: CartLine[];

    onClose?: () => void;

    onIncrease?: (
        cartItemId: string,
        quantity: number
    ) => void;

    onDecrease?: (
        cartItemId: string
    ) => void;

    onPressItem?: (
        itemId: string
    ) => void;

    onCheckout?: () => void;
};

export default function CartSheet({
                                      visible,
                                      items,
                                      onClose,
                                      onIncrease,
                                      onDecrease,
                                      onPressItem,
                                      onCheckout,
                                  }: Props) {
    const subtotal =
        items.reduce(
            (sum, line) =>
                sum +
                line.item.price *
                line.quantity,
            0
        );

    const isCheckoutDisabled =
        items.length === 0;

    const { height } =
        useWindowDimensions();

    const sheetHeight =
        Math.round(height * 0.54);

    const translateY =
        useRef(
            new Animated.Value(
                sheetHeight
            )
        ).current;

    const backdropOpacity =
        useRef(
            new Animated.Value(0)
        ).current;

    /**
     * Convert modifier identifiers into display-safe labels.
     */
    const humanizeModifier =
        (value: string) => {
            return value
                .replace(/_/g, " ")
                .replace(
                    /\b\w/g,
                    (c) => c.toUpperCase()
                );
        };

    /**
     * Generate a compact modifier summary for cart display.
     */
    const formatModifierSummary =
        (
            modifiers:
            Record<string, string>
        ) => {
            const entries =
                Object.entries(
                    modifiers
                ).sort(([a], [b]) =>
                    a.localeCompare(b)
                );

            return entries
                .map(
                    ([group, option]) =>
                        `${humanizeModifier(group)}: ${humanizeModifier(option)}`
                )
                .join(" • ");
        };

    /**
     * Animate the cart sheet into view.
     */
    const openSheet = () => {
        translateY.setValue(
            sheetHeight
        );

        backdropOpacity.setValue(0);

        Animated.parallel([
            Animated.timing(
                backdropOpacity,
                {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }
            ),

            Animated.spring(
                translateY,
                {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 0,
                }
            ),
        ]).start();
    };

    /**
     * Animate the cart sheet out of view.
     */
    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(
                backdropOpacity,
                {
                    toValue: 0,
                    duration: 140,
                    useNativeDriver: true,
                }
            ),

            Animated.timing(
                translateY,
                {
                    toValue: sheetHeight,
                    duration: 180,
                    useNativeDriver: true,
                }
            ),
        ]).start(() => {
            onClose?.();
        });
    };

    useEffect(() => {
        if (visible) {
            openSheet();
        } else {
            backdropOpacity.setValue(0);

            translateY.setValue(
                sheetHeight
            );
        }
    }, [
        visible,
        sheetHeight,
        backdropOpacity,
        translateY,
    ]);

    /**
     * Handle drag-to-dismiss interactions for the sheet header.
     */
    const headerPanResponder =
        useMemo(
            () =>
                PanResponder.create({
                    onStartShouldSetPanResponder:
                        () => false,

                    onMoveShouldSetPanResponder:
                        (_, gestureState) => {
                            return (
                                Math.abs(
                                    gestureState.dy
                                ) > 8 &&
                                Math.abs(
                                    gestureState.dy
                                ) >
                                Math.abs(
                                    gestureState.dx
                                )
                            );
                        },

                    onPanResponderMove:
                        (_, gestureState) => {
                            const next =
                                Math.max(
                                    0,
                                    gestureState.dy
                                );

                            translateY.setValue(
                                next
                            );
                        },

                    onPanResponderRelease:
                        (_, gestureState) => {
                            if (
                                gestureState.dy > 36
                            ) {
                                closeSheet();

                                return;
                            }

                            Animated.spring(
                                translateY,
                                {
                                    toValue: 0,
                                    useNativeDriver: true,
                                    bounciness: 6,
                                }
                            ).start();
                        },

                    onPanResponderTerminate:
                        () => {
                            Animated.spring(
                                translateY,
                                {
                                    toValue: 0,
                                    useNativeDriver: true,
                                    bounciness: 6,
                                }
                            ).start();
                        },
                }),

            [
                translateY,
                onClose,
                sheetHeight,
            ]
        );

    /**
     * Confirm checkout before submitting the cart.
     */
    const handleCheckoutPress =
        () => {
            Alert.alert(
                "Confirm checkout",
                "Do you want to pay now?",
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                    },

                    {
                        text: "Pay now",
                        style: "default",

                        onPress: () => {
                            onCheckout?.();

                            closeSheet();
                        },
                    },
                ],

                {
                    cancelable: true,
                }
            );
        };

    if (!visible) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={closeSheet}
        >
            <View style={styles.backdrop}>
                <Animated.View
                    pointerEvents="auto"
                    style={[
                        StyleSheet.absoluteFillObject,

                        {
                            backgroundColor:
                                "rgba(10,16,10,0.34)",

                            opacity:
                            backdropOpacity,
                        },
                    ]}
                >
                    <Pressable
                        style={
                            StyleSheet.absoluteFillObject
                        }
                        onPress={closeSheet}
                    />
                </Animated.View>

                <KeyboardAvoidingView
                    style={
                        styles.keyboardAvoiding
                    }
                    behavior={
                        Platform.OS ===
                        "ios"
                            ? "padding"
                            : "height"
                    }
                >
                    <Animated.View
                        style={[
                            styles.sheet,

                            {
                                height: sheetHeight,

                                transform: [
                                    {
                                        translateY,
                                    },
                                ],
                            },
                        ]}
                    >
                        <View
                            style={
                                styles.headerTouchArea
                            }
                            {...headerPanResponder.panHandlers}
                        >
                            <View
                                style={styles.handle}
                            />

                            <View
                                style={styles.header}
                            >
                                <Text
                                    style={styles.title}
                                >
                                    Your Cart
                                </Text>

                                <Text
                                    style={styles.subtitle}
                                >
                                    {items.length} items
                                </Text>
                            </View>
                        </View>

                        <ScrollView
                            style={
                                styles.listScroll
                            }
                            showsVerticalScrollIndicator={
                                false
                            }
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            contentContainerStyle={
                                styles.list
                            }
                        >
                            {items.length === 0 ? (
                                <Text
                                    style={
                                        styles.empty
                                    }
                                >
                                    Your cart is empty.
                                </Text>
                            ) : (
                                items.map(
                                    (line) => (
                                        <CartItemRow
                                            key={line.key}
                                            item={line.item}
                                            quantity={
                                                line.quantity
                                            }
                                            modifiersSummary={formatModifierSummary(
                                                line.modifiers
                                            )}
                                            onIncrease={() =>
                                                onIncrease?.(
                                                    line.key,
                                                    line.quantity
                                                )
                                            }
                                            onDecrease={() =>
                                                onDecrease?.(
                                                    line.key
                                                )
                                            }
                                            onPressItem={() =>
                                                onPressItem?.(
                                                    line.key
                                                )
                                            }
                                        />
                                    )
                                )
                            )}
                        </ScrollView>

                        <View style={styles.footer}>
                            <View
                                style={
                                    styles.totalRow
                                }
                            >
                                <Text
                                    style={
                                        styles.totalLabel
                                    }
                                >
                                    Subtotal
                                </Text>

                                <Text
                                    style={
                                        styles.totalValue
                                    }
                                >
                                    $
                                    {subtotal.toFixed(
                                        2
                                    )}
                                </Text>
                            </View>

                            <Pressable
                                style={[
                                    styles.checkoutButton,

                                    isCheckoutDisabled &&
                                    styles.checkoutButtonDisabled,
                                ]}
                                onPress={
                                    isCheckoutDisabled
                                        ? undefined
                                        : handleCheckoutPress
                                }
                                disabled={
                                    isCheckoutDisabled
                                }
                            >
                                <Text
                                    style={[
                                        styles.checkoutText,

                                        isCheckoutDisabled &&
                                        styles.checkoutTextDisabled,
                                    ]}
                                >
                                    Checkout
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles =
    StyleSheet.create({
        backdrop: {
            flex: 1,
            justifyContent: "flex-end",
        },

        keyboardAvoiding: {
            width: "100%",
        },

        sheet: {
            backgroundColor: "#F8F5EC",
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 24,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#DCE4D7",
        },

        headerTouchArea: {
            paddingTop: 2,
            paddingBottom: 10,
        },

        handle: {
            alignSelf: "center",
            width: 42,
            height: 4,
            borderRadius: 999,
            backgroundColor: "#B8C7B2",
            marginBottom: 16,
        },

        header: {
            marginBottom: 10,
        },

        title: {
            fontSize: 24,
            fontWeight: "900",
            color: "#244229",
            letterSpacing: -0.4,
        },

        subtitle: {
            marginTop: 4,
            fontSize: 13,
            color: "#74826F",
            fontWeight: "600",
        },

        listScroll: {
            flex: 1,
        },

        list: {
            paddingBottom: 12,
            flexGrow: 1,
        },

        empty: {
            paddingVertical: 20,
            color: "#8A9685",
            fontSize: 14,
            textAlign: "center",
            fontWeight: "500",
        },

        footer: {
            paddingTop: 10,
        },

        totalRow: {
            marginBottom: 14,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },

        totalLabel: {
            fontSize: 15,
            fontWeight: "700",
            color: "#4E5F4D",
        },

        totalValue: {
            fontSize: 22,
            fontWeight: "900",
            color: "#244229",
            letterSpacing: -0.4,
        },

        checkoutButton: {
            width: "100%",
            height: 54,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#244229",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,

            shadowOffset: {
                width: 0,
                height: 4,
            },

            elevation: 3,
        },

        checkoutText: {
            color: "#F6F3EA",
            fontSize: 16,
            fontWeight: "800",
            letterSpacing: 0.2,
        },

        checkoutButtonDisabled: {
            backgroundColor: "#9FB19A",
            opacity: 0.72,
        },

        checkoutTextDisabled: {
            color: "#E8EFE4",
        },
    });