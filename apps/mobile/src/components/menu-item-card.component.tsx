import React from "react";

import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import MenuPhoto from "./menu-photo.component";

import type { PromptMenuItem } from "../types/menu.types";

type Props = {
    item: PromptMenuItem;

    onPressAdd?: (
        item: PromptMenuItem
    ) => void;

    onPressItem?: (
        item: PromptMenuItem
    ) => void;
};

/**
 * Render a tappable menu item card with add-to-cart actions.
 */
export default function MenuItemCard({
                                         item,
                                         onPressAdd,
                                         onPressItem,
                                     }: Props) {
    return (
        <Pressable
            style={styles.card}
            onPress={() => onPressItem?.(item)}
        >
            <View>
                <MenuPhoto itemId={item.id} style={styles.image} />
            </View>

            <View style={styles.body}>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>
                            {item.name}
                        </Text>

                        <Text style={styles.price}>
                            ${item.price.toFixed(2)}
                        </Text>
                    </View>

                    <Pressable
                        style={styles.addButton}
                        onPress={() => onPressAdd?.(item)}
                    >
                        <Text style={styles.addButtonText}>
                            Add
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "#FBFAF6",
        marginBottom: 18,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 14,

        shadowOffset: {
            width: 0,
            height: 6,
        },

        elevation: 3,
    },

    image: {
        width: "100%",
        height: 190,
        backgroundColor: "#E8ECE4",
    },

    body: {
        paddingHorizontal: 18,
        paddingVertical: 16,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    name: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1F3A24",
        letterSpacing: -0.3,
    },

    price: {
        marginTop: 6,
        fontSize: 14,
        color: "#6E8D67",
        fontWeight: "700",
        letterSpacing: 0.2,
    },

    addButton: {
        backgroundColor: "#244229",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.10,
        shadowRadius: 8,

        shadowOffset: {
            width: 0,
            height: 4,
        },

        elevation: 3,
    },

    addButtonText: {
        color: "#F6F3EA",
        fontWeight: "800",
        fontSize: 13,
        letterSpacing: 0.2,
    },

    modifierHint: {
        marginTop: 10,
        fontSize: 11,
        color: "#8A9685",
        fontWeight: "600",
        letterSpacing: 0.2,
    },
});
