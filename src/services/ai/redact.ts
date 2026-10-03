/**
 * Best-effort, regex-anchored redaction applied before any message text is
 * sent to the Gemini API (see geminiApi.ts). Same philosophy as the
 * config-driven ParsingRule regexes elsewhere in this app: strip only the
 * digit runs that sit right next to a recognizable "sensitive" keyword
 * (card number, credit limit, balance), leaving everything else — merchant
 * name, the actual transaction amount — intact for the AI to read. This
 * won't catch every bank's phrasing, but it keeps the common ones (e.g.
 * "card ending 9088", "available credit limit is BHD 4911.311") out of a
 * third-party API call.
 */
export function redactSensitive(text: string): string {
  return text
    .replace(/\b(card\s+(?:ending|ending in|no\.?)\s*)(\d{3,6})\b/gi, "$1****")
    .replace(
      /\b((?:available\s+)?(?:credit\s+)?limit\s*(?:is|:)?\s*)[A-Za-z]{0,3}\s?[\d,]+\.?\d*/gi,
      "$1[redacted]"
    )
    .replace(
      /\b((?:available\s+)?balance\s*(?:is|:)?\s*)[A-Za-z]{0,3}\s?[\d,]+\.?\d*/gi,
      "$1[redacted]"
    );
}
