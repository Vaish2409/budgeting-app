import { listNewMessages, getMessage, markProcessed } from "./gmailApi";
import { parseMessage } from "../parsing/messageParser";
import { listParsingRules } from "../../db/repositories/parsingRulesRepo";
import { transactionExistsForMessage, createTransaction } from "../../db/repositories/transactionsRepo";
import { findCategoryForMerchant } from "../../db/repositories/merchantRulesRepo";
import { getSettings, updateSettings } from "../../db/repositories/settingsRepo";
import { getRateToBase } from "../fx/fxService";
import { convertMinorUnits } from "../../utils/currency";

export interface IngestionResult {
  fetched: number;
  imported: number;
  skippedDuplicate: number;
  skippedNonTransaction: number;
  skippedNoRule: number;
  errors: string[];
}

/**
 * Polls the connected Gmail inbox for new forwarded bank messages (FR5),
 * parses each one, dedupes, converts currency, auto-categorizes, and stores
 * it as a Transaction. Safe to call repeatedly (e.g. every 5–15 min, or on
 * app foreground) — already-processed messages are skipped via the Gmail
 * label (FR9) and a local dedupe check on sourceMessageId (FR8).
 */
export async function pollAndImport(): Promise<IngestionResult> {
  const result: IngestionResult = {
    fetched: 0,
    imported: 0,
    skippedDuplicate: 0,
    skippedNonTransaction: 0,
    skippedNoRule: 0,
    errors: [],
  };

  const settings = await getSettings();
  const rules = await listParsingRules();
  const summaries = await listNewMessages(settings.bankSenderAllowlist);
  result.fetched = summaries.length;

  for (const summary of summaries) {
    try {
      const alreadyExists = await transactionExistsForMessage(summary.id);
      if (alreadyExists) {
        result.skippedDuplicate++;
        await markProcessed(summary.id);
        continue;
      }

      const message = await getMessage(summary.id);
      const parsed = parseMessage(message.sender, message.subject, message.body, rules);

      if (parsed.status === "not_a_transaction") {
        result.skippedNonTransaction++;
        await markProcessed(summary.id);
        continue;
      }
      if (parsed.status === "no_matching_rule") {
        result.skippedNoRule++;
        continue; // leave unlabeled — surfaced to the user to add a parsing rule
      }

      const { data } = parsed;
      const categoryId = data.merchant ? await findCategoryForMerchant(data.merchant) : null;

      const fx = await getRateToBase(data.currency, settings.baseCurrency);
      const baseAmountMinor = fx
        ? convertMinorUnits(data.amountMinor, data.currency, settings.baseCurrency, fx.rate)
        : data.amountMinor; // last resort: no rate available at all, store unconverted

      const signedOriginal = data.isDebit ? data.amountMinor : -data.amountMinor;
      const signedBase = data.isDebit ? baseAmountMinor : -baseAmountMinor;

      await createTransaction({
        date: new Date(Number(message.internalDate)).toISOString(),
        originalAmountMinor: signedOriginal,
        originalCurrency: data.currency,
        baseAmountMinor: signedBase,
        fxRateUsed: fx?.rate ?? null,
        merchant: data.merchant,
        bankSource: data.bankIdentifier,
        categoryId,
        note: null,
        sourceType: "auto",
        sourceMessageId: summary.id,
        spender: data.spender,
      });

      await markProcessed(summary.id);
      result.imported++;
    } catch (err: any) {
      result.errors.push(`${summary.id}: ${err?.message ?? String(err)}`);
    }
  }

  await updateSettings({ lastPolledAt: new Date().toISOString() });
  return result;
}
