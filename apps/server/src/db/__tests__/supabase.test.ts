import { describe, it, expect } from "vitest";
import { supabase } from "../supabase";

describe("supabase connection", () => {
    it("should connect to supabase", async () => {
        const { data, error } = await supabase
            .from("carts")
            .select("*");

        expect(error).toBeNull();

        console.log(data);
    });
});