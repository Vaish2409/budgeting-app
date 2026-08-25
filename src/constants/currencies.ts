/**
 * Per-currency decimal precision (FR16). Most ISO 4217 currencies use 2 decimal
 * places, but a handful use 3, and a few use 0. Never hardcode 2 — always look
 * up the currency here (default falls back to 2 for anything not listed).
 *
 * Source: ISO 4217 minor unit table.
 */
export const CURRENCY_DECIMALS: Record<string, number> = {
  // 3 decimal places
  BHD: 3, // Bahraini Dinar
  KWD: 3, // Kuwaiti Dinar
  OMR: 3, // Omani Rial
  JOD: 3, // Jordanian Dinar
  TND: 3, // Tunisian Dinar

  // 0 decimal places
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,

  // everything else defaults to 2 (USD, EUR, GBP, INR, AED, SAR, QAR, etc.)
};

export const DEFAULT_DECIMALS = 2;

export function decimalsForCurrency(currencyCode: string): number {
  return CURRENCY_DECIMALS[currencyCode.toUpperCase()] ?? DEFAULT_DECIMALS;
}

/** Common currency symbols seen in bank SMS/email text, mapped to ISO codes. */
export const SYMBOL_TO_CURRENCY: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "₹": "INR",
  "¥": "JPY",
  "﷼": "SAR",
};

/** Currencies the user is likely to transact in; shown first in pickers. */
export const COMMON_CURRENCIES = [
  "BHD",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "SAR",
  "AED",
  "KWD",
  "OMR",
  "QAR",
];
