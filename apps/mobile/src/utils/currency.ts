// apps/mobile/src/utils/currency.ts

/**
 * Format a numeric value as a USD currency string.
 */
export function formatUsd(
    value: number
): string {
  return `$${value.toFixed(2)}`;
}