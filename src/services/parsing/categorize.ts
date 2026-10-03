import { Category } from "../../types/models";
import { findCategoryForMerchant } from "../../db/repositories/merchantRulesRepo";
import { classifyTransaction } from "../ai/geminiApi";
import { redactSensitive } from "../ai/redact";

export interface CategorizeInput {
  merchant: string | null;
  rawText: string; // subject + body; redacted before it ever reaches the AI
  categories: Category[];
  aiKeyConfigured: boolean; // whether a Gemini key is saved — the only AI on/off switch
}

export interface CategorizeResult {
  categoryId: string | null; // null only if there's no "Other" category at all (user deleted it)
  merchant: string | null; // possibly filled in by AI if regex found none
  usedAi: boolean;
}

/**
 * Orchestrates keyword table -> AI fallback -> "Other" fallback, so a
 * transaction that reaches this point is never left uncategorized. AI
 * (Gemini, see ../ai/geminiApi.ts) is invoked only when regex + the keyword
 * table couldn't fully resolve merchant/category on their own — this is a
 * fallback, not a replacement, and never runs at all unless a Gemini key is
 * configured in Settings.
 */
export async function resolveCategory(input: CategorizeInput): Promise<CategorizeResult> {
  let merchant = input.merchant;
  let categoryId = merchant ? await findCategoryForMerchant(merchant) : null;
  let usedAi = false;

  if (input.aiKeyConfigured && (!merchant || !categoryId)) {
    try {
      const ai = await classifyTransaction(
        redactSensitive(input.rawText),
        input.categories.map((c) => c.name)
      );
      if (!merchant && ai.merchant) merchant = ai.merchant;
      if (ai.category) {
        const match = input.categories.find(
          (c) => c.name.toLowerCase() === ai.category!.toLowerCase()
        );
        if (match) categoryId = match.id;
      }
      usedAi = true;
    } catch {
      // AI unavailable (offline, bad key, free-tier rate limit) — degrade
      // silently to whatever regex/keyword-table found, then the Other
      // fallback below. Never blocks import on an AI failure.
    }
  }

  if (!categoryId) {
    categoryId = input.categories.find((c) => c.isDefault && c.name === "Other")?.id ?? null;
  }

  return { categoryId, merchant, usedAi };
}
