import React from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";

const photos: Record<string, ImageSourcePropType> = {
    sandwich_beef: require("../../assets/images/menu-items/sandwich_beef.png"),
    sandwich_chicken: require("../../assets/images/menu-items/sandwich_chicken.png"),
    sandwich_veggie: require("../../assets/images/menu-items/sandwich_veggie.png"),
    fries: require("../../assets/images/menu-items/fries.png"),
    chicken_nuggets: require("../../assets/images/menu-items/chicken_nuggets.png"),
    coke: require("../../assets/images/menu-items/coke.png"),
    sprite: require("../../assets/images/menu-items/sprite.png"),
    water: require("../../assets/images/menu-items/water.png"),
    ice_cream: require("../../assets/images/menu-items/ice_cream.png"),
};

type Props = {
    itemId: string;
    style: StyleProp<ViewStyle>;
};

export default function MenuPhoto({ itemId, style }: Props) {
    const photo = photos[itemId];
    return (
        <View style={[styles.frame, style]}>
            {photo ? (
                <Image
                    source={photo}
                    resizeMode="cover"
                    style={styles.image}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    frame: {
        overflow: "hidden",
        backgroundColor: "#E8ECE4",
    },
    image: {
        width: "100%",
        height: "100%",
    },
});
