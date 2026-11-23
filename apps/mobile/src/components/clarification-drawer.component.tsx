import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";

type Clarification = { question: string; options: string[] };

type Props = {
    clarification: Clarification | null;
    loading: boolean;
    onSelect: (choice: string) => void;
};

/** A compact extension of the AI input surface, not a nested modal/card. */
export default function ClarificationDrawer({ clarification, loading, onSelect }: Props) {
    const progress = useRef(new Animated.Value(0)).current;
    const [rendered, setRendered] = useState<Clarification | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const locked = useRef(false);

    useEffect(() => {
        progress.stopAnimation();
        if (clarification) {
            locked.current = false;
            setSelected(null);
            setRendered(clarification);
            Animated.timing(progress, {
                toValue: 1,
                duration: 480,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        } else {
            Animated.timing(progress, {
                toValue: 0,
                duration: 400,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) {
                    setRendered(null);
                    setSelected(null);
                }
            });
        }
    }, [clarification, progress]);

    if (!rendered) return null;

    // One centered option per row, with natural-width pill buttons.
    const expandedMaxHeight = 180 + rendered.options.length * 60;

    return (
        <Animated.View
            style={[
                styles.drawer,
                {
                    maxHeight: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, expandedMaxHeight],
                    }),
                    opacity: progress.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0, 0.5, 1],
                    }),
                    transform: [{
                        translateY: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0],
                        }),
                    }],
                },
            ]}
        >
            <View style={styles.content}>
                <View style={styles.divider} />
                <Text style={styles.question}>{rendered.question}</Text>
                <View style={styles.options}>
                    {rendered.options.map((option) => {
                        const isSelected = selected === option;
                        return (
                            <Pressable
                                key={option}
                                accessibilityRole="button"
                                accessibilityLabel={option}
                                disabled={loading || selected !== null || locked.current}
                                onPress={() => {
                                    if (locked.current) return;
                                    locked.current = true;
                                    setSelected(option);
                                    onSelect(option);
                                }}
                                style={({ pressed }) => [
                                    styles.option,
                                    Platform.OS === "web" && ({ outlineStyle: "none" } as any),
                                    (pressed || isSelected) && styles.optionActive,
                                ]}
                            >
                                {({ pressed }) => (
                                    <Text style={[
                                        styles.optionText,
                                        (pressed || isSelected) && styles.optionTextActive,
                                    ]}>
                                        {option}
                                    </Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    drawer: {
        overflow: "hidden",
    },
    content: {
        paddingHorizontal: 6,
        paddingTop: 12,
        paddingBottom: 6,
    },
    divider: {
        height: 1,
        backgroundColor: "#E3E6D9",
        marginBottom: 16,
        marginHorizontal: 2,
    },
    question: {
        color: "#244229",
        fontSize: 16,
        lineHeight: 23,
        fontWeight: "700",
        letterSpacing: -0.2,
        marginHorizontal: 5,
        marginBottom: 14,
    },
    options: {
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 4,
    },
    option: {
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 9,
        paddingHorizontal: 15,
        backgroundColor: "#E8EFE4",
        borderWidth: 1,
        borderColor: "#D6E1D0",
        borderRadius: 999,
    },
    optionActive: {
        backgroundColor: "#244229",
        borderColor: "#244229",
    },
    optionText: {
        fontSize: 13,
        lineHeight: 17,
        fontWeight: "700",
        color: "#244229",
        textAlign: "center",
    },
    optionTextActive: {
        color: "#FFFFFF",
    },
});
