// apps/mobile/src/screens/splash.screen.tsx

import React, {
    useEffect,
    useRef,
} from "react";

import {
    Animated,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
    fading?: boolean;
};

/**
 * Initial branded loading screen with entrance and fade transitions.
 */
export default function SplashScreen({
                                         fading,
                                     }: Props) {
    const opacity =
        useRef(
            new Animated.Value(0)
        ).current;

    const translateY =
        useRef(
            new Animated.Value(20)
        ).current;

    const overlayOpacity =
        useRef(
            new Animated.Value(1)
        ).current;

    useEffect(() => {
        /**
         * Animate splash content into view.
         */
        Animated.parallel([
            Animated.timing(
                opacity,
                {
                    toValue: 1,
                    duration: 900,

                    easing:
                        Easing.out(
                            Easing.ease
                        ),

                    useNativeDriver: true,
                }
            ),

            Animated.timing(
                translateY,
                {
                    toValue: 0,
                    duration: 900,

                    easing:
                        Easing.out(
                            Easing.ease
                        ),

                    useNativeDriver: true,
                }
            ),
        ]).start();

        if (!fading) {
            return;
        }

        /**
         * Fade the splash overlay out during app handoff.
         */
        Animated.timing(
            overlayOpacity,
            {
                toValue: 0,
                duration: 650,

                easing:
                    Easing.out(
                        Easing.ease
                    ),

                useNativeDriver: true,
            }
        ).start();
    }, [fading]);

    return (
        <Animated.View
            style={[
                styles.container,

                {
                    opacity:
                    overlayOpacity,
                },
            ]}
        >
            <Animated.View
                style={{
                    opacity,

                    transform: [
                        {
                            translateY,
                        },
                    ],
                }}
            >
                <Image
                    source={require("../../assets/images/icon.png")}
                    style={styles.logo}
                />

                <Text style={styles.title}>
                    Grove & Grill
                </Text>

                <Text style={styles.subtitle}>
                    Crafted dining,
                    powered by AI
                </Text>

                <View style={styles.loadingRow}>
                    <Dot delay={0} />
                    <Dot delay={150} />
                    <Dot delay={300} />
                </View>
            </Animated.View>
        </Animated.View>
    );
}

/**
 * Animated loading indicator dot for splash state feedback.
 */
function Dot({
                 delay,
             }: {
    delay: number;
}) {
    const opacity =
        useRef(
            new Animated.Value(0.2)
        ).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(
                    opacity,
                    {
                        toValue: 1,
                        duration: 500,
                        delay,
                        useNativeDriver: true,
                    }
                ),

                Animated.timing(
                    opacity,
                    {
                        toValue: 0.2,
                        duration: 500,
                        useNativeDriver: true,
                    }
                ),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.dot,
                { opacity },
            ]}
        />
    );
}

const styles =
    StyleSheet.create({
        container: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            backgroundColor: "#1F3520",
            justifyContent: "center",
            alignItems: "center",
        },

        logo: {
            width: 220,
            height: 220,
            borderRadius: 48,
        },

        title: {
            marginTop: 28,
            fontSize: 34,
            fontWeight: "800",
            color: "#FFFFFF",
            textAlign: "center",
        },

        subtitle: {
            marginTop: 12,
            fontSize: 15,
            color: "#D8E2D0",
            textAlign: "center",
            letterSpacing: 0.3,
        },

        loadingRow: {
            marginTop: 36,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
        },

        dot: {
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: "#DDE8D5",
        },
    });