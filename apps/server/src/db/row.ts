export function asRow<T>(value: unknown): T {
    if (Array.isArray(value)) {
        return value.map(item => asRow(item)) as unknown as T;
    }
    if (!value || typeof value !== "object") {
        return value as T;
    }
    if (value instanceof Date) {
        return value.toISOString() as unknown as T;
    }
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(record)) {
        result[key] = item && typeof item === "object" &&
            "toNumber" in item && typeof item.toNumber === "function"
            ? item.toNumber() : asRow(item);
    }
    return result as unknown as T;
}
