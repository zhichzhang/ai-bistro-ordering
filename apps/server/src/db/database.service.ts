// apps/server/src/db/database.service.ts

import { PostgrestError } from "@supabase/supabase-js";

export class DatabaseService {
    static async query<T>(
        promise: Promise<{
            data: T | null;
            error: PostgrestError | null;
        }>
    ): Promise<T> {
        const { data, error } = await promise;

        if (error) {
            console.error("Database error:", error);

            throw new Error(error.message);
        }

        return data as T;
    }
}