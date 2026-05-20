// apps/server/src/db/supabase.ts

import path from "path";

import dotenv from "dotenv";

import { createClient } from "@supabase/supabase-js";

dotenv.config({
    path: path.resolve(process.cwd(), ".env"),
});

const supabaseUrl =
    process.env.SUPABASE_URL;

const supabaseKey =
    process.env.SUPABASE_KEY;

if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required");
}

if (!supabaseKey) {
    throw new Error("SUPABASE_KEY is required");
}

export const supabase =
    createClient(
        supabaseUrl,
        supabaseKey
    );