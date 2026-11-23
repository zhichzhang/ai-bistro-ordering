// apps/mobile/src/overlays/toast-host.overlay.tsx

import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Animated,
    StyleSheet,
    Text,
    View,
} from "react-native";

type ToastType =
    | "success"
    | "error"
    | "info";

type ToastInput = {
    type: ToastType;
    message: string;
};

type ToastContextValue = {
    showToast: (
        toast: ToastInput
    ) => void;
};

const ToastContext =
    createContext<ToastContextValue>({
        showToast: () => {},
    });

export function useToast() {
    return useContext(ToastContext);
}

type Props = {
    children: React.ReactNode;
};

/**
 * Global toast host for transient app feedback.
 */
export default function ToastHostOverlay({
                                             children,
                                         }: Props) {

    const [toast, setToast] =
        useState<ToastInput | null>(null);

    const opacity =
        useRef(new Animated.Value(0)).current;

    const translateY =
        useRef(new Animated.Value(-20)).current;

    const timeoutRef =
        useRef<NodeJS.Timeout | null>(null);

    /**
     * Display a transient toast notification with animated transitions.
     */
    const showToast =
        useCallback(
            (nextToast: ToastInput) => {

                setToast(nextToast);

                opacity.setValue(0);
                translateY.setValue(-20);

                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 220,
                        useNativeDriver: true,
                    }),

                    Animated.timing(translateY, {
                        toValue: 0,
                        duration: 220,
                        useNativeDriver: true,
                    }),
                ]).start();

                // setTimeout(() => {

                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                const duration =
                    nextToast.type === "success"
                        ? 2400
                        : nextToast.type === "info"
                            ? 4200
                            : 5200;

                timeoutRef.current = setTimeout(() => {

                    Animated.parallel([
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 220,
                            useNativeDriver: true,
                        }),

                        Animated.timing(translateY, {
                            toValue: -20,
                            duration: 220,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setToast(null);
                    });

                }, duration);

                // }, 2400);
            },
            [opacity, translateY],
        );

    const value =
        useMemo(
            () => ({
                showToast,
            }),
            [showToast],
        );

    const backgroundColor =
        toast?.type === "success"
            ? "#5F7A65"
            : toast?.type === "error"
                ? "#9C5A54"
                : "#556B5D";

    return (
        <ToastContext.Provider value={value}>

            {children}

            {
                toast && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.toast,
                            {
                                backgroundColor,

                                opacity,

                                transform: [
                                    {
                                        translateY,
                                    },
                                ],
                            },
                        ]}
                    >
                        <Text style={styles.text}>
                            {toast.message}
                        </Text>
                    </Animated.View>
                )
            }

        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: "absolute",

        top: 72,
        left: 20,
        right: 20,

        borderRadius: 16,

        paddingHorizontal: 18,
        paddingVertical: 14,

        shadowColor: "#000000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: {
            width: 0,
            height: 6,
        },

        elevation: 6,
    },

    text: {
        color: "#ffffff",

        fontSize: 15,
        fontWeight: "700",
    },
});