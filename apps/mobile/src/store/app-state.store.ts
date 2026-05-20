import { create } from "zustand";

import type { PromptMenuContext } from "../types/menu.types";
import type { CartContextDto } from "../types/cart.types";
import type { AppState } from "../types/app-state.types";

export const useAppStore =
    create<AppState>((set) => ({
        menu: null,
        cartId: null,
        sessionId: null,
        cart: null,

        setMenu: (
            menu: PromptMenuContext | null
        ) =>
            set({ menu }),

        setCartId: (
            cartId: string | null
        ) =>
            set({ cartId }),

        setSessionId: (
            sessionId: string | null
        ) =>
            set({ sessionId }),

        setCart: (
            cart: CartContextDto | null
        ) =>
            set({ cart }),
    }));