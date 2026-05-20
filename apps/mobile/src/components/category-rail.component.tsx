// apps/mobile/src/components/category-rail.component.tsx

import React from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Category = {
  id: string;

  name: string;
};

type Props = {
  categories: Category[];

  selectedCategoryId:
      string | null;

  onPressCategory: (
      categoryId: string
  ) => void;
};

export default function CategoryRail({
                                       categories,
                                       selectedCategoryId,
                                       onPressCategory,
                                     }: Props) {

  return (
      <View style={styles.wrapper}>

        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.content
            }
        >
          {categories.map(
              (category) => {

                const active =
                    category.id ===
                    selectedCategoryId;

                return (
                    <Pressable
                        key={category.id}
                        style={[
                          styles.pill,

                          active &&
                          styles.pillActive,
                        ]}
                        onPress={() =>
                            onPressCategory(
                                category.id
                            )
                        }
                    >
                      <Text
                          style={[
                            styles.pillText,

                            active &&
                            styles.pillTextActive,
                          ]}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                );
              }
          )}
        </ScrollView>
      </View>
  );
}

const styles =
    StyleSheet.create({

      wrapper: {
        marginTop: 2,

        marginBottom: 4,
      },

      content: {
        paddingHorizontal: 20,

        paddingVertical: 6,

        gap: 10,
      },

      pill: {
        paddingHorizontal: 14,

        paddingVertical: 8,

        borderRadius: 999,

        backgroundColor:
            "#E5EADF",

        borderWidth: 1,

        borderColor:
            "#D7E1D2",
      },

      pillActive: {
        backgroundColor:
            "#244229",

        borderColor:
            "#244229",

        shadowColor: "#000",

        shadowOpacity: 0.12,

        shadowRadius: 8,

        shadowOffset: {
          width: 0,
          height: 4,
        },

        elevation: 3,
      },

      pillText: {
        fontSize: 14,

        fontWeight: "700",

        color: "#4A5C49",

        letterSpacing: 0.2,
      },

      pillTextActive: {
        color: "#F6F3EA",
      },
    });