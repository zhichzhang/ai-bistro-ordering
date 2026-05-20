// apps/mobile/src/types/app-state.types.ts

import type {
    PromptMenuContext,
} from "./menu.types";

import type {
    CartContextDto,
} from "./cart.types";

export type AppState = {

    //
    // menu
    //

    menu:
        PromptMenuContext | null;

    //
    // workflow ids
    //

    cartId:
        string | null;

    sessionId:
        string | null;

    //
    // canonical backend cart snapshot
    //

    cart:
        CartContextDto | null;

    //
    // setters
    //

    setMenu: (
        menu:
            PromptMenuContext | null
    ) => void;

    setCartId: (
        cartId:
            string | null
    ) => void;

    setSessionId: (
        sessionId:
            string | null
    ) => void;

    setCart: (
        cart:
            CartContextDto | null
    ) => void;
};