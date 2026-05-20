// apps/mobile/src/components/cart-item-row.component.tsx

import React from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Image } from "expo-image";

import type {
  PromptMenuItem,
} from "../types/menu.types";

import QuantityStepper
  from "./quantity-stepper.component";

import {
  toDirectImageUrl,
} from "../utils/image";

type Props = {
  item: PromptMenuItem;

  quantity: number;

  modifiersSummary?: string;

  onIncrease?: () => void;

  onDecrease?: () => void;

  onPressItem?: () => void;
};

export default function CartItemRow({
                                      item,
                                      quantity,
                                      modifiersSummary,
                                      onIncrease,
                                      onDecrease,
                                      onPressItem,
                                    }: Props) {

  return (
      <View style={styles.container}>

        {/* IMAGE */}

          <Image
              source={
                  toDirectImageUrl(
                      item.image_url
                  )
              }
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
          />

        {/* CONTENT */}

        <View style={styles.content}>

          {/* NAME */}

          <Text
              style={styles.name}
              numberOfLines={1}
          >
            {item.name}
          </Text>

          {/* MODIFIERS */}

          {!!modifiersSummary && (
              <Text
                  style={styles.modifiers}
                  numberOfLines={1}
              >
                {modifiersSummary}
              </Text>
          )}

          {/* FOOTER */}

          <View style={styles.footer}>

            {/* PRICE */}

            <View style={styles.priceRow}>

              <Text style={styles.price}>
                $
                {(
                    item.price *
                    quantity
                ).toFixed(2)}
              </Text>

              {!!onPressItem && (
                  <Pressable
                      onPress={onPressItem}
                      hitSlop={10}
                      style={styles.editButton}
                  >
                    <Text style={styles.editText}>
                      Edit
                    </Text>
                  </Pressable>
              )}
            </View>

            {/* QUANTITY */}

            <QuantityStepper
                quantity={quantity}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
            />
          </View>
        </View>
      </View>
  );
}

const styles =
    StyleSheet.create({

      container: {
        flexDirection: "row",

        alignItems: "center",

        backgroundColor:
            "#FBFAF6",

        borderRadius: 22,

        padding: 12,

        marginBottom: 14,

        shadowColor: "#000",

        shadowOpacity: 0.04,

        shadowRadius: 8,

        shadowOffset: {
          width: 0,
          height: 4,
        },

        elevation: 2,
      },

      image: {
        width: 74,

        height: 74,

        borderRadius: 18,

        backgroundColor:
            "#E9EEE5",
      },

      content: {
        flex: 1,

        marginLeft: 14,

        justifyContent: "center",
      },

      name: {
        fontSize: 16,

        fontWeight: "800",

        color: "#244229",

        letterSpacing: -0.2,
      },

      modifiers: {
        marginTop: 5,

        fontSize: 12,

        color: "#7B8978",

        fontWeight: "600",
      },

      footer: {
        marginTop: 12,

        flexDirection: "row",

        alignItems: "center",

        justifyContent:
            "space-between",
      },

      priceRow: {
        flexDirection: "row",

        alignItems: "center",
      },

      price: {
        fontSize: 16,

        fontWeight: "900",

        color: "#244229",
      },

      editButton: {
        marginLeft: 10,

        paddingHorizontal: 4,

        paddingVertical: 2,
      },

      editText: {
        fontSize: 12,

        fontWeight: "700",

        color: "#6E8D67",

        letterSpacing: 0.2,
      },
    });