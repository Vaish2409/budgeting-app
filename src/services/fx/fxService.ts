import { getCachedRate, getLatestCachedRate, cacheRate } from "../../db/repositories/fxCacheRepo";

const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v1";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Returns the rate to convert 1 unit of `currencyCode` into `baseCurrency`.
 * Caches per calendar day (FR13) and falls back to the last cached rate for
 * that pair if a fresh fetch fails, e.g. offline (FR14). Returns null only if
 * there is no fresh rate AND nothing cached at all for the pair.
 */
export async function getRateToBase(
  currencyCode: string,
  baseCurrency: string
): Promise<{ rate: number; date: string; isFallback: boolean } | null> {
  const from = currencyCode.toUpperCase();
  const to = baseCurrency.toUpperCase();

  if (from === to) {
    return { rate: 1, date: todayIso(), isFallback: false };
  }

  const today = todayIso();
  const cachedToday = await getCachedRate(from, today, to);
  if (cachedToday !== null) {
    return { rate: cachedToday, date: today, isFallback: false };
  }

  try {
    const url = `${FRANKFURTER_BASE_URL}/latest?base=${from}&symbols=${to}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.[to];
    if (typeof rate !== "number") throw new Error(`No rate for ${from}->${to} in response`);

    await cacheRate(from, today, to, rate);
    return { rate, date: today, isFallback: false };
  } catch (err) {
    // Offline or API failure — fall back to the most recent cached rate (FR14).
    const fallback = await getLatestCachedRate(from, to);
    if (fallback) {
      return { rate: fallback.rateToBase, date: fallback.date, isFallback: true };
    }
    return null;
  }
}
