// apps/mobile/src/components/quantity-stepper.component.tsx

import React from "react";

import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    Ionicons,
} from "@expo/vector-icons";

type Props = {
    quantity: number;

    onIncrease?: () => void;

    onDecrease?: () => void;
};

export default function QuantityStepper({
                                            quantity,
                                            onIncrease,
                                            onDecrease,
                                        }: Props) {
    console.log(
        "[STEPPER]",
        quantity
    );

    return (
        <View style={styles.container}>

            {/* DECREASE */}

            <Pressable
                style={styles.button}
                onPress={onDecrease}
                hitSlop={8}
            >
                <Ionicons
                    name="remove"
                    size={16}
                    color="#244229"
                />
            </Pressable>

            {/* VALUE */}

            <View style={styles.valueWrap}>
                <Text style={styles.value}>
                    {quantity}
                </Text>
            </View>

            {/* INCREASE */}

            <Pressable
                style={[
                    styles.button,
                    styles.buttonActive,
                ]}
                onPress={onIncrease}
                hitSlop={8}
            >
                <Ionicons
                    name="add"
                    size={16}
                    color="#F6F3EA"
                />
            </Pressable>
        </View>
    );
}

const styles =
    StyleSheet.create({

        container: {
            flexDirection: "row",

            alignItems: "center",

            backgroundColor:
                "#EEF3EA",

            borderRadius: 999,

            paddingHorizontal: 6,

            paddingVertical: 6,

            borderWidth: 1,

            borderColor:
                "#D5E0CF",
        },

        button: {
            width: 30,

            height: 30,

            borderRadius: 999,

            alignItems: "center",

            justifyContent: "center",

            backgroundColor:
                "#F8FAF5",
        },

        buttonActive: {
            backgroundColor:
                "#244229",

            shadowColor: "#000",

            shadowOpacity: 0.08,

            shadowRadius: 6,

            shadowOffset: {
                width: 0,
                height: 3,
            },

            elevation: 2,
        },

        valueWrap: {
            minWidth: 36,

            alignItems: "center",

            justifyContent: "center",

            paddingHorizontal: 4,
        },

        value: {
            fontSize: 15,

            fontWeight: "900",

            color: "#244229",

            letterSpacing: 0.2,
        },
    });