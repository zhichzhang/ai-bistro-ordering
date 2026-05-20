// src/db/repositories/base.repository.ts

import type { PostgrestError } from "@supabase/supabase-js";

export class RepositoryError extends Error {
    constructor(
        message: string,
        public readonly cause?: PostgrestError
    ) {
        super(message);
        this.name = "RepositoryError";
    }
}

export function throwIfError(error: PostgrestError | null): void {
    if (error) {
        throw new RepositoryError(error.message, error);
    }
}