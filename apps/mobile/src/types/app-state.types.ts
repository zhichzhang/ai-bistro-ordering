// apps/mobile/src/types/app-state.types.ts

import type { PromptMenuContext } from "./menu.types";
import type { CartContextDto } from "./cart.types";

export type AppState = {
    // Menu context
    menu: PromptMenuContext | null;

    // Workflow ids
    cartId: string | null;
    sessionId: string | null;

    // Canonical backend cart snapshot
    cart: CartContextDto | null;

    // State setters
    setMenu: (
        menu: PromptMenuContext | null
    ) => void;

    setCartId: (
        cartId: string | null
    ) => void;

    setSessionId: (
        sessionId: string | null
    ) => void;

    setCart: (
        cart: CartContextDto | null
    ) => void;
};