import { getDb } from "../client";
import { MerchantCategoryRule } from "../../types/models";

type MerchantRuleRow = Omit<MerchantCategoryRule, "isUserDefined"> & { isUserDefined: number };

export async function findCategoryForMerchant(text: string): Promise<string | null> {
  const db = await getDb();
  const rules = await db.getAllAsync<MerchantRuleRow>(
    "SELECT * FROM merchant_category_rules ORDER BY isUserDefined DESC"
  );
  const lower = text.toLowerCase();
  const match = rules.find((r) => lower.includes(r.merchantPattern.toLowerCase()));
  return match?.categoryId ?? null;
}

/**
 * Re-categorizing a merchant applies to future auto-matches for that merchant (FR19).
 * Stores/overwrites a user-defined rule, which takes priority over seeded defaults.
 */
export async function setMerchantRule(
  merchantPattern: string,
  categoryId: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO merchant_category_rules (merchantPattern, categoryId, isUserDefined)
     VALUES (?, ?, 1)
     ON CONFLICT(merchantPattern) DO UPDATE SET categoryId = excluded.categoryId, isUserDefined = 1`,
    [merchantPattern.toLowerCase(), categoryId]
  );
}
