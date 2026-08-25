import { decimalsForCurrency } from "../constants/currencies";

/**
 * Amounts are stored as integer "minor units" (e.g. cents, fils) to avoid
 * floating-point rounding drift across repeated FX conversions. These helpers
 * convert between minor units and display/decimal amounts, respecting each
 * currency's actual precision (FR16) — never hardcode 2 decimal places.
 */

/** Convert a decimal amount (e.g. 12.5) into integer minor units for storage. */
export function toMinorUnits(amount: number, currencyCode: string): number {
  const decimals = decimalsForCurrency(currencyCode);
  return Math.round(amount * 10 ** decimals);
}

/** Convert integer minor units back into a decimal amount for math/display. */
export function fromMinorUnits(amountMinor: number, currencyCode: string): number {
  const decimals = decimalsForCurrency(currencyCode);
  return amountMinor / 10 ** decimals;
}

/** Format minor units as a locale-formatted string with the correct decimal precision. */
export function formatCurrency(amountMinor: number, currencyCode: string, locale = "en-US"): string {
  const decimals = decimalsForCurrency(currencyCode);
  const amount = fromMinorUnits(amountMinor, currencyCode);
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${currencyCode} ${formattedNumber}`;
}

/**
 * Convert an amount in minor units of `fromCurrency` into minor units of
 * `toCurrency`, using `rate` (units of toCurrency per 1 unit of fromCurrency).
 * Rounds to the target currency's own precision.
 */
export function convertMinorUnits(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amountMinor;
  }
  const fromAmount = fromMinorUnits(amountMinor, fromCurrency);
  const toAmount = fromAmount * rate;
  return toMinorUnits(toAmount, toCurrency);
}
