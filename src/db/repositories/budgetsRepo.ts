import { getDb } from "../client";
import { CategoryBudget } from "../../types/models";

export async function listBudgetsForMonth(month: string): Promise<CategoryBudget[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryBudget>(
    "SELECT * FROM category_budgets WHERE month = ?",
    [month]
  );
  return rows;
}

export async function setBudget(
  categoryId: string,
  month: string,
  limitAmountMinor: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO category_budgets (categoryId, month, limitAmountMinor)
     VALUES (?, ?, ?)
     ON CONFLICT(categoryId, month) DO UPDATE SET limitAmountMinor = excluded.limitAmountMinor`,
    [categoryId, month, limitAmountMinor]
  );
}

export async function deleteBudget(categoryId: string, month: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM category_budgets WHERE categoryId = ? AND month = ?", [
    categoryId,
    month,
  ]);
}

/**
 * Copies the previous month's budgets forward into `month` for any category
 * that doesn't already have one set (FR22 — budgets roll over per calendar month).
 */
export async function rolloverBudgetsIfNeeded(month: string, previousMonth: string): Promise<void> {
  const db = await getDb();
  const existing = await listBudgetsForMonth(month);
  if (existing.length > 0) return;

  const previous = await listBudgetsForMonth(previousMonth);
  if (previous.length === 0) return;

  await db.withTransactionAsync(async () => {
    for (const b of previous) {
      await db.runAsync(
        `INSERT OR IGNORE INTO category_budgets (categoryId, month, limitAmountMinor) VALUES (?, ?, ?)`,
        [b.categoryId, month, b.limitAmountMinor]
      );
    }
  });
}
