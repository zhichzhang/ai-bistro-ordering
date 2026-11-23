import React, { useState } from "react";
import { Image, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

const menuGrid = require("../../assets/images/menu-grid.png");

const tiles: Record<string, [number, number]> = {
    sandwich_beef: [0, 0],
    sandwich_chicken: [1, 0],
    sandwich_veggie: [2, 0],
    fries: [0, 1],
    chicken_nuggets: [1, 1],
    coke: [2, 1],
    sprite: [0, 2],
    water: [1, 2],
    ice_cream: [2, 2],
};

type Props = {
    itemId: string;
    style: StyleProp<ViewStyle>;
};

export default function MenuPhoto({ itemId, style }: Props) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const tile = tiles[itemId];

    return (
        <View
            style={[style, { overflow: "hidden" }]}
            onLayout={({ nativeEvent: { layout } }) => {
                if (size.width !== layout.width || size.height !== layout.height) {
                    setSize({ width: layout.width, height: layout.height });
                }
            }}
        >
            {tile && size.width > 0 && size.height > 0 && (
                <Image
                    source={menuGrid}
                    resizeMode="stretch"
                    style={{
                        position: "absolute",
                        width: size.width * 3,
                        height: size.height * 3,
                        left: -tile[0] * size.width,
                        top: -tile[1] * size.height,
                    }}
                />
            )}
        </View>
    );
}
