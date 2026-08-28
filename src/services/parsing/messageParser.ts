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
  spender: string | null; // from the matched rule's `spender` field
}

export type ParseResult =
  | { status: "parsed"; data: ParsedMessage }
  | { status: "not_a_transaction" } // FR7 — OTPs, promos, balance checks
  | { status: "no_matching_rule" }; // sender didn't match any configured bank

type RuleAttempt =
  | { kind: "parsed"; data: ParsedMessage }
  | { kind: "excluded" } // rule explicitly recognized this as a non-transaction (OTP, promo, etc.)
  | { kind: "no_match" }; // this rule just doesn't apply — caller should try the next candidate

function tryRule(rule: ParsingRule, text: string): RuleAttempt {
  if (rule.isNonTransactionPattern && new RegExp(rule.isNonTransactionPattern, "i").test(text)) {
    return { kind: "excluded" };
  }
  if (!new RegExp(rule.isTransactionPattern, "i").test(text)) {
    return { kind: "no_match" };
  }

  const amountMatch = text.match(new RegExp(rule.amountPattern, "i"));
  if (!amountMatch || !amountMatch[1]) return { kind: "no_match" };
  const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
  if (Number.isNaN(rawAmount)) return { kind: "no_match" };

  let currency: string | null = null;
  if (rule.currencyPattern) {
    const currencyMatch = text.match(new RegExp(rule.currencyPattern, "i"));
    currency = currencyMatch?.[1]?.toUpperCase() ?? null;
  }
  if (!currency) currency = detectCurrency(text);
  if (!currency) return { kind: "no_match" };

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
    kind: "parsed",
    data: {
      amountMinor: toMinorUnits(rawAmount, currency),
      currency,
      isDebit,
      merchant,
      lastFour,
      bankIdentifier: rule.bankIdentifier,
      spender: rule.spender,
    },
  };
}

/**
 * Parses a forwarded bank message against the user's configured ParsingRules
 * (NFR section 7 — config-driven, not hardcoded per bank). Rules are matched
 * by sender first; every enabled rule whose senderMatch fits is then tried in
 * order until one recognizes the message. This matters because messages are
 * typically relayed by a single phone-level "forward to Gmail" automation
 * (see docs/gmail-setup.md's SMS-forwarding setup), so every bank's alerts
 * usually share one sender — the phone's own Mail account, not the bank. A
 * single-bank sender domain (if the user forwards straight from the bank)
 * still works fine here, since there's then just one matching rule to try.
 */
export function parseMessage(
  sender: string,
  subject: string,
  body: string,
  rules: ParsingRule[]
): ParseResult {
  const text = `${subject}\n${body}`;
  const candidates = rules.filter(
    (r) => r.enabled && sender.toLowerCase().includes(r.senderMatch.toLowerCase())
  );
  if (candidates.length === 0) return { status: "no_matching_rule" };

  for (const rule of candidates) {
    const attempt = tryRule(rule, text);
    if (attempt.kind === "parsed") return { status: "parsed", data: attempt.data };
    if (attempt.kind === "excluded") return { status: "not_a_transaction" };
    // "no_match" — fall through and try the next candidate rule.
  }
  return { status: "not_a_transaction" };
}
