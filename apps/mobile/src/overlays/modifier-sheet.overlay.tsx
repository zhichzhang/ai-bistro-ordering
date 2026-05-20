// apps/mobile/src/overlays/modifier-sheet.overlay.tsx

import React, {
    useEffect,
    useMemo,
    useRef, useState,
} from "react";

import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  PromptMenuItem,
} from "../types/menu.types";

type Props = {
  visible: boolean;

  item:
      | PromptMenuItem
      | null;

  value: Record<
      string,
      string
  >;

  addingToCart?: boolean;

  onChange: (
      next:
      Record<string, string>
  ) => void;

  onClose: () => void;

  onAdd: (
      next:
      Record<string, string>
  ) => void;
};

function normalizeModifierCode(
    value: string
): string {

    return value
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");
}

export default function ModifierSheet({
                                        visible,
                                        item,
                                        value,
                                          addingToCart,
                                        onChange,
                                        onClose,
                                        onAdd,
                                      }: Props) {

  const translateY =
      useRef(
          new Animated.Value(60)
      ).current;

  const opacity =
      useRef(
          new Animated.Value(0)
      ).current;

  const [
      mounted,
      setMounted,
  ] =
      useState(visible);

    useEffect(() => {

        if (visible) {

            setMounted(true);

            translateY.setValue(60);

            opacity.setValue(0);

            Animated.parallel([
                Animated.spring(
                    translateY,
                    {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 7,
                    }
                ),

                Animated.timing(
                    opacity,
                    {
                        toValue: 1,
                        duration: 180,
                        useNativeDriver: true,
                    }
                ),
            ]).start();

            return;
        }

        Animated.parallel([
            Animated.timing(
                opacity,
                {
                    toValue: 0,
                    duration: 140,
                    useNativeDriver: true,
                }
            ),

            Animated.timing(
                translateY,
                {
                    toValue: 40,
                    duration: 160,
                    useNativeDriver: true,
                }
            ),
        ]).start(() => {

            setMounted(false);
        });

    }, [visible]);

    const safeItem =
        item ?? {
            name: "",
            modifiers: {},
        };

    const modifierGroups =
        useMemo(() => {

            return Object.entries(
                safeItem.modifiers ?? {}
            );

        }, [safeItem]);

    if (!mounted) {
        return null;
    }

  return (
      <Modal
          visible={mounted}
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={onClose}
      >
        <View style={styles.backdrop}>

          {/* BACKDROP */}

          <Animated.View
              pointerEvents="auto"
              style={[
                StyleSheet.absoluteFillObject,

                {
                  backgroundColor:
                      "rgba(10,16,10,0.24)",

                  opacity,
                },
              ]}
          >
            <Pressable
                style={
                  StyleSheet.absoluteFillObject
                }
                onPress={onClose}
            />
          </Animated.View>

          {/* SHEET */}

          <Animated.View
              style={[
                styles.sheet,

                {
                  opacity,

                  transform: [
                    {
                      translateY,
                    },
                  ],
                },
              ]}
          >

            {/* HANDLE */}

            <View style={styles.handle} />

            {/* TITLE */}

            <Text style={styles.title}>
              Customize
            </Text>

            <Text style={styles.itemName}>
              {safeItem.name}
            </Text>

            {/* MODIFIERS */}

            <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.scrollContent
                }
            >
              {modifierGroups.map(
                  ([groupName, options]) => {

                    const selected =
                        value[groupName];

                    return (
                        <View
                            key={groupName}
                            style={
                              styles.group
                            }
                        >

                          {/* GROUP TITLE */}

                            <Text style={styles.groupTitle}>
                                {
                                    groupName
                                        .replace(/_/g, " ")
                                        .replace(
                                            /\b\w/g,
                                            (c) => c.toUpperCase()
                                        )
                                }
                            </Text>

                          {/* OPTIONS */}

                          <View
                              style={
                                styles.optionWrap
                              }
                          >
                            {options.map(
                                (option) => {

                                    const active =
                                        normalizeModifierCode(
                                            selected ?? ""
                                        ) ===
                                        normalizeModifierCode(option);

                                  return (
                                      <Pressable
                                          key={option}
                                          style={[
                                            styles.option,

                                            active &&
                                            styles.optionActive,
                                          ]}
                                          onPress={() =>
                                              onChange({
                                                ...value,

                                                  [groupName]:
                                                      normalizeModifierCode(option),
                                              })
                                          }
                                      >
                                        <Text
                                            style={[
                                              styles.optionText,

                                              active &&
                                              styles.optionTextActive,
                                            ]}
                                        >
                                            {
                                                option
                                                    .replace(/_/g, " ")
                                                    .replace(
                                                        /\b\w/g,
                                                        (c) => c.toUpperCase()
                                                    )
                                            }
                                        </Text>
                                      </Pressable>
                                  );
                                }
                            )}
                          </View>
                        </View>
                    );
                  }
              )}
            </ScrollView>

            {/* ACTIONS */}

            <View style={styles.footer}>

              <Pressable
                  style={
                    styles.cancelButton
                  }
                  onPress={onClose}
              >
                <Text
                    style={
                      styles.cancelText
                    }
                >
                  Cancel
                </Text>
              </Pressable>

                <Pressable
                    style={[
                        styles.addButton,

                        addingToCart &&
                        styles.addButtonDisabled,
                    ]}
                    disabled={addingToCart}
                    onPress={() => {

                        console.log(
                            "ADD TO CART PRESSED"
                        );

                        console.log(
                            "MODIFIER VALUE:",
                            value
                        );

                        onAdd(value);
                    }}
                >
                <Text
                    style={
                      styles.addText
                    }
                >
                  Add to cart
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
  );
}

const styles =
    StyleSheet.create({

      // ====================================
      // BACKDROP
      // ====================================

      backdrop: {
        flex: 1,

        justifyContent:
            "flex-end",
      },

      // ====================================
      // SHEET
      // ====================================

      sheet: {
        backgroundColor:
            "#F8F5EC",

        borderTopLeftRadius: 34,

        borderTopRightRadius: 34,

        paddingHorizontal: 22,

        paddingTop: 12,

        paddingBottom: 20,

        minHeight: "42%",

        borderWidth: 1,

        borderColor:
            "#DCE4D7",
      },

      // ====================================
      // HANDLE
      // ====================================

      handle: {
        alignSelf: "center",

        width: 42,

        height: 4,

        borderRadius: 999,

        backgroundColor:
            "#B8C7B2",

        marginBottom: 16,
      },

      // ====================================
      // TITLE
      // ====================================

      title: {
        fontSize: 14,

        fontWeight: "700",

        color: "#74826F",

        textTransform:
            "uppercase",

        letterSpacing: 1.4,

        textAlign: "center",
      },

      itemName: {
        marginTop: 6,

        fontSize: 24,

        fontWeight: "900",

        color: "#244229",

        letterSpacing: -0.5,

        textAlign: "center",
      },

      // ====================================
      // CONTENT
      // ====================================

      scrollContent: {
        paddingTop: 18,

        paddingBottom: 8,
      },

      group: {
        marginBottom: 20,
      },

      groupTitle: {
        fontSize: 13,

        fontWeight: "800",

        color: "#4E5F4D",

        marginBottom: 10,

        textTransform:
            "capitalize",
      },

      optionWrap: {
        flexDirection: "row",

        flexWrap: "wrap",

        gap: 10,
      },

      // ====================================
      // OPTION
      // ====================================

      option: {
        paddingHorizontal: 14,

        paddingVertical: 8,

        borderRadius: 999,

        backgroundColor:
            "#E8EFE4",

        borderWidth: 1,

        borderColor:
            "#D8E3D2",
      },

      optionActive: {
        backgroundColor:
            "#244229",

        borderColor:
            "#244229",
      },

      optionText: {
        fontSize: 13,

        fontWeight: "700",

        color: "#4A5C49",
      },

      optionTextActive: {
        color: "#F6F3EA",
      },

      // ====================================
      // FOOTER
      // ====================================

      footer: {
        marginTop: 6,

        flexDirection: "row",

        gap: 12,
      },

      cancelButton: {
        flex: 1,

        height: 46,

        borderRadius: 16,

        alignItems: "center",

        justifyContent: "center",

        backgroundColor:
            "#E8EFE4",
      },

      cancelText: {
        fontSize: 14,

        fontWeight: "800",

        color: "#4A5C49",
      },

      addButton: {
        flex: 1,

        height: 46,

        borderRadius: 16,

        alignItems: "center",

        justifyContent: "center",

        backgroundColor:
            "#244229",

        shadowColor: "#000",

        shadowOpacity: 0.08,

        shadowRadius: 8,

        shadowOffset: {
          width: 0,
          height: 4,
        },

        elevation: 3,
      },

      addText: {
        color: "#F6F3EA",

        fontSize: 14,

        fontWeight: "900",
      },
      addButtonDisabled: {
        opacity: 0.6,
      },
    });