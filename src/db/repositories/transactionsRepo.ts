import { getDb } from "../client";
import { Transaction } from "../../types/models";
import { generateId } from "../../utils/id";

function rowToTransaction(row: any): Transaction {
  return row as Transaction;
}

export interface TransactionFilters {
  categoryId?: string;
  currency?: string;
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
  search?: string; // matches merchant or note
}

export async function listTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: any[] = [];

  if (filters.categoryId) {
    clauses.push("categoryId = ?");
    params.push(filters.categoryId);
  }
  if (filters.currency) {
    clauses.push("originalCurrency = ?");
    params.push(filters.currency);
  }
  if (filters.dateFrom) {
    clauses.push("date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push("date <= ?");
    params.push(filters.dateTo);
  }
  if (filters.search) {
    clauses.push("(merchant LIKE ? OR note LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db.getAllAsync(
    `SELECT * FROM transactions ${where} ORDER BY date DESC`,
    params
  );
  return rows.map(rowToTransaction);
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync("SELECT * FROM transactions WHERE id = ?", [id]);
  return row ? rowToTransaction(row) : null;
}

/** Returns true if a transaction with this source message id already exists (FR8 dedupe). */
export async function transactionExistsForMessage(sourceMessageId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync(
    "SELECT id FROM transactions WHERE sourceMessageId = ?",
    [sourceMessageId]
  );
  return !!row;
}

export async function createTransaction(
  input: Omit<Transaction, "id" | "createdAt" | "updatedAt">
): Promise<Transaction> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transactions
      (id, date, originalAmountMinor, originalCurrency, baseAmountMinor, fxRateUsed,
       merchant, bankSource, categoryId, note, sourceType, sourceMessageId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.date,
      input.originalAmountMinor,
      input.originalCurrency,
      input.baseAmountMinor,
      input.fxRateUsed,
      input.merchant,
      input.bankSource,
      input.categoryId,
      input.note,
      input.sourceType,
      input.sourceMessageId,
      now,
      now,
    ]
  );
  return { ...input, id, createdAt: now, updatedAt: now };
}

export async function updateTransaction(
  id: string,
  updates: Partial<
    Pick<
      Transaction,
      "date" | "originalAmountMinor" | "originalCurrency" | "baseAmountMinor" | "fxRateUsed" | "merchant" | "categoryId" | "note"
    >
  >
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (updates as any)[f]);
  await db.runAsync(
    `UPDATE transactions SET ${setClause}, updatedAt = ? WHERE id = ?`,
    [...values, new Date().toISOString(), id]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}

/** Sum of baseAmountMinor per category, for a given "YYYY-MM" month. */
export async function spendByCategoryForMonth(
  month: string
): Promise<{ categoryId: string | null; totalMinor: number }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ categoryId: string | null; totalMinor: number }>(
    `SELECT categoryId, SUM(baseAmountMinor) as totalMinor
     FROM transactions
     WHERE strftime('%Y-%m', date) = ? AND baseAmountMinor > 0
     GROUP BY categoryId`,
    [month]
  );
  return rows;
}

/** Total spend (positive amounts only) for a given "YYYY-MM" month, in base currency minor units. */
export async function totalSpendForMonth(month: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(baseAmountMinor) as total FROM transactions
     WHERE strftime('%Y-%m', date) = ? AND baseAmountMinor > 0`,
    [month]
  );
  return row?.total ?? 0;
}
