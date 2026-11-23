// apps/mobile/App.tsx

import React, {
    useEffect,
    useState,
} from "react";

import {
    ActivityIndicator,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";

import {
    SafeAreaProvider,
} from "react-native-safe-area-context";

import HomeScreen
    from "./src/screens/home.screen";

import SplashScreen
    from "./src/screens/splash.screen";

import { menuService }
    from "./src/services/menu.service";

import { cartService }
    from "./src/services/cart.service";

import { useAppStore }
    from "./src/store/app-state.store";
import ToastHostOverlay from "./src/overlays/toast-host.overlay";

export default function App() {

    //
    // global store setters
    //

    const setMenu =
        useAppStore(
            (state) => state.setMenu
        );

    const setCartId =
        useAppStore(
            (state) => state.setCartId
        );

    const setSessionId =
        useAppStore(
            (state) => state.setSessionId
        );

    const setCart =
        useAppStore(
            (state) => state.setCart
        );

    //
    // local bootstrap state
    //

    const [
        bootstrapping,
        setBootstrapping,
    ] =
        useState(true);

    const [
        showSplash,
        setShowSplash,
    ] =
        useState(true);

    // const [
    //     splashVisible,
    //     setSplashVisible,
    // ] =
    //     useState(true);

    //
    // bootstrap application
    //

    useEffect(() => {

        const bootstrap =
            async () => {

                const start =
                    Date.now();

                try {

                    //
                    // load menu
                    //

                    const menu =
                        await menuService.getMenu();

                    setMenu(menu);

                    //
                    // create cart/session
                    //

                    const cartResponse =
                        await cartService.createCart();

                    setCartId(
                        cartResponse.cart.id
                    );

                    setSessionId(
                        cartResponse.chatSessionId
                    );

                    setCart({
                        cart:
                        cartResponse.cart,

                        items: [],
                    });

                } catch (error) {

                    console.error(
                        "App bootstrap failed:",
                        error
                    );

                } finally {

                    const elapsed =
                        Date.now() - start;

                    const remaining =
                        Math.max(
                            0,
                            1800 - elapsed
                        );

                    setTimeout(() => {

                        setBootstrapping(false);

                        //
                        // remove overlay
                        //

                        setTimeout(() => {

                            setShowSplash(false);

                        }, 700);

                    }, remaining);
                }
            };

        bootstrap();

    }, []);

    //
    // splash screen
    //

    // if (splashVisible) {
    //
    //     return (
    //         <SafeAreaProvider>
    //             <SplashScreen
    //                 onFinish={() =>
    //                     setSplashVisible(
    //                         false
    //                     )
    //                 }
    //             />
    //         </SafeAreaProvider>
    //     );
    // }

    //
    // loading fallback
    //

    // if (bootstrapping) {

        return (
            <SafeAreaProvider>

                <StatusBar
                    barStyle="light-content"
                />

                <ToastHostOverlay>

                    <HomeScreen />

                </ToastHostOverlay>

                {showSplash && (
                    <SplashScreen
                        fading={!bootstrapping}
                    />
                )}

            </SafeAreaProvider>
        );
    // }

    //
    // app
    //
}

const styles =
    StyleSheet.create({

        loadingContainer: {
            flex: 1,

            backgroundColor:
                "#F3F1E7",

            alignItems: "center",

            justifyContent: "center",
        },
    });