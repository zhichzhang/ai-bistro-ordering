import { describe, expect, it } from "vitest";

const test = process.env.DATABASE_URL ? it : it.skip;

describe("database connection", () => {
    test("reads menu categories", async () => {
        const { prisma } = await import("../prisma");
        const categories = await prisma.category.findMany({ take: 1 });
        expect(Array.isArray(categories)).toBe(true);
    });
});
