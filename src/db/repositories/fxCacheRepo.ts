import { getDb } from "../client";

export async function getCachedRate(
  currencyCode: string,
  date: string,
  baseCurrency: string
): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ rateToBase: number }>(
    "SELECT rateToBase FROM fx_rate_cache WHERE currencyCode = ? AND date = ? AND baseCurrency = ?",
    [currencyCode, date, baseCurrency]
  );
  return row?.rateToBase ?? null;
}

/** Most recent cached rate for this pair, regardless of date — used as an offline fallback (FR14). */
export async function getLatestCachedRate(
  currencyCode: string,
  baseCurrency: string
): Promise<{ rateToBase: number; date: string } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ rateToBase: number; date: string }>(
    `SELECT rateToBase, date FROM fx_rate_cache
     WHERE currencyCode = ? AND baseCurrency = ?
     ORDER BY date DESC LIMIT 1`,
    [currencyCode, baseCurrency]
  );
  return row ?? null;
}

export async function cacheRate(
  currencyCode: string,
  date: string,
  baseCurrency: string,
  rateToBase: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO fx_rate_cache (currencyCode, date, baseCurrency, rateToBase)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(currencyCode, date, baseCurrency) DO UPDATE SET rateToBase = excluded.rateToBase`,
    [currencyCode, date, baseCurrency, rateToBase]
  );
}
