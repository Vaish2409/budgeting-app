/**
 * Core data model, per Requirements Document section 6.
 * All monetary amounts are stored as integer minor units (cents/fils) to avoid
 * floating point drift; see src/utils/currency.ts for conversion helpers.
 */

export type SourceType = "auto" | "manual";

export interface Transaction {
  id: string;
  date: string; // ISO 8601, e.g. "2026-08-25T14:30:00.000Z"
  originalAmountMinor: number; // integer, in the original currency's minor unit
  originalCurrency: string; // ISO 4217 code, e.g. "USD", "BHD"
  baseAmountMinor: number; // integer, converted to Settings.baseCurrency's minor unit
  fxRateUsed: number | null; // rate applied at conversion time; null if same-currency
  merchant: string | null;
  bankSource: string | null; // e.g. "Bank of Bahrain" — identifies which bank sent it
  categoryId: string | null;
  note: string | null;
  sourceType: SourceType;
  sourceMessageId: string | null; // Gmail message id, for dedupe (FR8); null for manual
  spender: string | null; // whose spend this is, from the ParsingRule that matched (e.g. "Badri"); null for manual entries
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex, used for chart + badges
  icon: string; // name from the icon set used in the UI
  isDefault: boolean; // seeded defaults vs. user-created
  sortOrder: number;
}

export interface CategoryBudget {
  categoryId: string;
  month: string; // "YYYY-MM"
  limitAmountMinor: number; // in base currency's minor unit
}

export interface FxRateCache {
  currencyCode: string; // source currency
  date: string; // "YYYY-MM-DD", the day this rate was fetched for
  rateToBase: number; // multiply an amount in currencyCode by this to get base currency
  baseCurrency: string; // the base currency this rate was computed against
}

export interface MerchantCategoryRule {
  merchantPattern: string; // lowercase substring or keyword to match against merchant/body text
  categoryId: string;
  isUserDefined: boolean; // true once the user has corrected/confirmed it (FR19)
}

export interface Settings {
  baseCurrency: string; // ISO 4217, default "BHD"
  connectedInboxEmail: string | null;
  bankSenderAllowlist: string[]; // sender addresses/domains treated as valid transaction sources
  lastPolledAt: string | null; // ISO 8601
  onboardingComplete: boolean;
}

/** A bank/message-format parsing rule, config-driven per NFR (section 7). */
export interface ParsingRule {
  id: string;
  bankIdentifier: string; // display name, e.g. "Bank of Bahrain"
  senderMatch: string; // substring/domain to match the sender address
  isTransactionPattern: string; // regex; message must match to be treated as a transaction
  isNonTransactionPattern: string | null; // regex; if it matches, skip (OTPs, promos, etc.) — FR7
  amountPattern: string; // regex with a capture group for the amount
  currencyPattern: string | null; // regex with a capture group for the currency code/symbol
  debitCreditPattern: string | null; // regex distinguishing debit vs. credit
  merchantPattern: string | null; // regex with a capture group for merchant/payee
  lastFourPattern: string | null; // regex with a capture group for account last 4 digits
  spender: string | null; // whose spend messages matching this rule should be attributed to (e.g. "Badri")
  enabled: boolean;
}
