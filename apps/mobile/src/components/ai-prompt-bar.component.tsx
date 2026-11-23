import React, { useEffect, useRef } from 'react';

import {
    ActivityIndicator,
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
    value: string;

    onChange: (v: string) => void;

    onSubmit: () => void;

    loading?: boolean;

    disabled?: boolean;
};

/**
 * AI input bar with animated loading state transitions.
 */
export default function AIPromptBar({
                                        value,
                                        onChange,
                                        onSubmit,
                                        loading = false,
                                        disabled = false,
                                    }: Props) {
    const sweepAnim =
        useRef(
            new Animated.Value(-220)
        ).current;

    useEffect(() => {
        if (!loading) {
            sweepAnim.stopAnimation();

            sweepAnim.setValue(-220);

            return;
        }

        const loop =
            Animated.loop(
                Animated.timing(
                    sweepAnim,
                    {
                        toValue: 420,
                        duration: 1600,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }
                )
            );

        loop.start();

        return () => {
            loop.stop();
        };
    }, [
        loading,
        sweepAnim,
    ]);

    const submitDisabled =
        disabled ||
        loading ||
        !value.trim();

    const content = (
        <View
            style={[
                styles.inputWrap,

                loading &&
                styles.inputWrapLoading,
            ]}
        >
            {
                loading ? (
                    <View style={styles.loadingContainer}>
                        <Ionicons
                            name="sparkles"
                            size={16}
                            color="#557153"
                        />

                        <ActivityIndicator
                            size="small"
                            color="#557153"
                            style={styles.spinner}
                        />

                        <Text style={styles.loadingText}>
                            Updating your order...
                        </Text>
                    </View>
                ) : (
                    <>
                        <Ionicons
                            name="sparkles-outline"
                            size={18}
                            color="#557153"
                        />

                        <TextInput
                            placeholder="Ask AI to modify your cart..."
                            placeholderTextColor="#93A08F"
                            value={value}
                            onChangeText={onChange}
                            style={styles.input}
                            returnKeyType="send"
                            onSubmitEditing={onSubmit}
                            editable={!disabled && !loading}
                        />

                        <Pressable
                            style={[
                                styles.sendButton,

                                submitDisabled &&
                                styles.sendButtonDisabled,
                            ]}
                            onPress={onSubmit}
                            disabled={submitDisabled}
                        >
                            <Ionicons
                                name="arrow-up"
                                size={18}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </>
                )
            }
        </View>
    );

    return (
        <View style={styles.container}>
            {
                loading ? (
                    <View style={styles.gradientWrapper}>
                        <Animated.View
                            style={[
                                styles.rotatingGradient,

                                {
                                    transform: [
                                        {
                                            translateX:
                                            sweepAnim,
                                        },
                                    ],
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={[
                                    'transparent',
                                    'rgba(143,163,139,0.00)',
                                    'rgba(143,163,139,0.12)',
                                    '#557153',
                                    'rgba(143,163,139,0.12)',
                                    'rgba(143,163,139,0.00)',
                                    'transparent',
                                ]}
                                locations={[
                                    0,
                                    0.28,
                                    0.42,
                                    0.50,
                                    0.58,
                                    0.72,
                                    1,
                                ]}
                                start={{
                                    x: 0,
                                    y: 0,
                                }}
                                end={{
                                    x: 1,
                                    y: 1,
                                }}
                                style={styles.gradient}
                            />
                        </Animated.View>

                        <View style={styles.gradientMask}>
                            {content}
                        </View>
                    </View>
                ) : (
                    content
                )
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // paddingTop: 12,
    },

    gradientWrapper: {
        borderRadius: 22,
        overflow: 'hidden',
    },

    rotatingGradient: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 220,
    },

    gradient: {
        flex: 1,
    },

    gradientMask: {
        margin: 1.5,
        borderRadius: 20,
        overflow: 'hidden',
    },

    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FBFAF6',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D8E3D2',
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: 8,
    },

    inputWrapLoading: {
        borderColor: 'transparent',
    },

    input: {
        flex: 1,
        height: 42,
        fontSize: 14,
        lineHeight: 16,
        color: '#244229',
        fontWeight: '500',
        paddingHorizontal: 4,
        paddingVertical: 0,
        includeFontPadding: false,
        textAlignVertical: 'center',

        transform: [
            { translateY: 1.5 },
        ],
    },

    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#244229',
        alignItems: 'center',
        justifyContent: 'center',
    },

    sendButtonDisabled: {
        opacity: 0.45,
    },

    loadingContainer: {
        flex: 1,
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    spinner: {
        marginLeft: 6,
    },

    loadingText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#5F7358',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});