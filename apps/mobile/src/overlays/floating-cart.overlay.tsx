// apps/mobile/src/overlays/floating-cart.overlay.tsx

import React, {
    forwardRef,
    useEffect,
    useRef,
} from "react";

import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

type Props = {
    count: number;

    onPress?: () => void;

    animatedScale?: Animated.Value;

    checkoutAnimating?: boolean;
};

/**
 * Floating cart entry point with checkout transition animations.
 */
const FloatingCartOverlay =
    forwardRef<View, Props>(
        function FloatingCartOverlay(
            {
                count,
                onPress,
                animatedScale,
                checkoutAnimating,
            },
            ref
        ) {
            const translateX =
                useRef(
                    new Animated.Value(0)
                ).current;

            const scale =
                useRef(
                    new Animated.Value(1)
                ).current;

            const opacity =
                useRef(
                    new Animated.Value(1)
                ).current;

            useEffect(() => {
                if (!checkoutAnimating) {
                    Animated.parallel([
                        Animated.spring(
                            scale,
                            {
                                toValue: 1,
                                useNativeDriver: true,
                                friction: 4,
                            }
                        ),

                        Animated.timing(
                            opacity,
                            {
                                toValue: 1,
                                duration: 140,
                                useNativeDriver: true,
                            }
                        ),

                        Animated.spring(
                            translateX,
                            {
                                toValue: 0,
                                useNativeDriver: true,
                                friction: 5,
                            }
                        ),
                    ]).start();

                    return;
                }

                /**
                 * Animate the cart FAB out during checkout.
                 */
                Animated.parallel([
                    Animated.timing(
                        translateX,
                        {
                            toValue: 260,
                            duration: 240,
                            useNativeDriver: true,
                        }
                    ),

                    Animated.timing(
                        scale,
                        {
                            toValue: 0.82,
                            duration: 240,
                            useNativeDriver: true,
                        }
                    ),

                    Animated.timing(
                        opacity,
                        {
                            toValue: 0,
                            duration: 240,
                            useNativeDriver: true,
                        }
                    ),
                ]).start();
            }, [checkoutAnimating]);

            return (
                <View
                    pointerEvents="box-none"
                    style={
                        StyleSheet.absoluteFill
                    }
                >
                    <Animated.View
                        style={[
                            styles.fabContainer,

                            {
                                transform: [
                                    {
                                        translateX,
                                    },

                                    {
                                        scale:
                                            Animated.multiply(
                                                scale,
                                                animatedScale ??
                                                1
                                            ),
                                    },
                                ],

                                opacity,
                            },
                        ]}
                    >
                        <Pressable
                            ref={ref}
                            onPress={onPress}
                            style={styles.fab}
                        >
                            <View
                                style={styles.innerLight}
                            />

                            <Ionicons
                                name="cart"
                                size={24}
                                color="#F6F3EA"
                            />

                            {count > 0 && (
                                <View
                                    style={styles.badge}
                                >
                                    <Text
                                        style={
                                            styles.badgeText
                                        }
                                    >
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>
                </View>
            );
        }
    );

export default FloatingCartOverlay;

const styles =
    StyleSheet.create({
        fabContainer: {
            position: "absolute",
            right: 18,
            bottom: 128,
            zIndex: 200,
        },

        fab: {
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: "#244229",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.10,
            shadowRadius: 12,

            shadowOffset: {
                width: 0,
                height: 6,
            },

            elevation: 10,
        },

        innerLight: {
            position: "absolute",
            width: 90,
            height: 90,
            borderRadius: 999,
            backgroundColor:
                "rgba(255,255,255,0.05)",
        },

        badge: {
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 24,
            height: 24,
            borderRadius: 999,
            backgroundColor: "#DFAF6B",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 6,
            borderWidth: 1.5,
            borderColor: "#F6F3EA",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 4,

            shadowOffset: {
                width: 0,
                height: 2,
            },

            elevation: 2,
        },

        badgeText: {
            color: "#244229",
            fontSize: 11,
            fontWeight: "900",
        },
    });