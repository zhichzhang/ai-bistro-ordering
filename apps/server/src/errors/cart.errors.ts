/** A submitted or otherwise inactive cart cannot be mutated or checked out again. */
export class CartNotActiveError extends Error {
    readonly code = "CART_NOT_ACTIVE";
    readonly status = 409;

    constructor(cartId: string) {
        super(`Cart ${cartId} is no longer active.`);
        this.name = "CartNotActiveError";
    }
}

/** An active cart must contain at least one item before checkout. */
export class EmptyCartCheckoutError extends Error {
    readonly code = "EMPTY_CART";
    readonly status = 400;

    constructor() {
        super("Cannot checkout empty cart.");
        this.name = "EmptyCartCheckoutError";
    }
}
