import { ParsingRule } from "../../types/models";
import { detectCurrency } from "./currencyDetection";
import { toMinorUnits } from "../../utils/currency";

export interface ParsedMessage {
  amountMinor: number;
  currency: string;
  isDebit: boolean; // false = credit/refund
  merchant: string | null;
  lastFour: string | null;
  bankIdentifier: string;
}

export type ParseResult =
  | { status: "parsed"; data: ParsedMessage }
  | { status: "not_a_transaction" } // FR7 — OTPs, promos, balance checks
  | { status: "no_matching_rule" }; // sender didn't match any configured bank

/**
 * Parses a forwarded bank message against the user's configured ParsingRules
 * (NFR section 7 — config-driven, not hardcoded per bank). Rules are matched
 * by sender first, then the message body is tested against that rule's patterns.
 */
export function parseMessage(
  sender: string,
  subject: string,
  body: string,
  rules: ParsingRule[]
): ParseResult {
  const text = `${subject}\n${body}`;
  const rule = rules.find((r) => r.enabled && sender.toLowerCase().includes(r.senderMatch.toLowerCase()));

  if (!rule) return { status: "no_matching_rule" };

  if (rule.isNonTransactionPattern && new RegExp(rule.isNonTransactionPattern, "i").test(text)) {
    return { status: "not_a_transaction" };
  }
  if (!new RegExp(rule.isTransactionPattern, "i").test(text)) {
    return { status: "not_a_transaction" };
  }

  const amountMatch = text.match(new RegExp(rule.amountPattern, "i"));
  if (!amountMatch || !amountMatch[1]) return { status: "not_a_transaction" };
  const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
  if (Number.isNaN(rawAmount)) return { status: "not_a_transaction" };

  let currency: string | null = null;
  if (rule.currencyPattern) {
    const currencyMatch = text.match(new RegExp(rule.currencyPattern, "i"));
    currency = currencyMatch?.[1]?.toUpperCase() ?? null;
  }
  if (!currency) currency = detectCurrency(text);
  if (!currency) return { status: "not_a_transaction" };

  let isDebit = true;
  if (rule.debitCreditPattern) {
    // Convention: pattern's capture group 1 being truthy/matched means "credit".
    // A rule author encodes this as e.g. "(credited|received|refund)".
    const match = text.match(new RegExp(rule.debitCreditPattern, "i"));
    isDebit = !match;
  }

  let merchant: string | null = null;
  if (rule.merchantPattern) {
    const merchantMatch = text.match(new RegExp(rule.merchantPattern, "i"));
    merchant = merchantMatch?.[1]?.trim() ?? null;
  }

  let lastFour: string | null = null;
  if (rule.lastFourPattern) {
    const lastFourMatch = text.match(new RegExp(rule.lastFourPattern, "i"));
    lastFour = lastFourMatch?.[1] ?? null;
  }

  return {
    status: "parsed",
    data: {
      amountMinor: toMinorUnits(rawAmount, currency),
      currency,
      isDebit,
      merchant,
      lastFour,
      bankIdentifier: rule.bankIdentifier,
    },
  };
}
