import { SYMBOL_TO_CURRENCY } from "../../constants/currencies";

const ISO_CODE_PATTERN = /\b([A-Z]{3})\b/;

/**
 * Detects a currency code from free text (FR10): a 3-letter ISO code like
 * "USD"/"BHD", or a common symbol like "$"/"€"/"£". Returns null if neither
 * is found — callers should fall back to the transaction's bank/account currency.
 */
export function detectCurrency(text: string, knownCodes?: string[]): string | null {
  if (knownCodes) {
    for (const code of knownCodes) {
      if (new RegExp(`\\b${code}\\b`, "i").test(text)) return code.toUpperCase();
    }
  }

  const codeMatch = text.match(ISO_CODE_PATTERN);
  if (codeMatch) return codeMatch[1];

  for (const [symbol, code] of Object.entries(SYMBOL_TO_CURRENCY)) {
    if (text.includes(symbol)) return code;
  }

  return null;
}
