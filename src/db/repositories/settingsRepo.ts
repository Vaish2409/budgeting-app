import { getDb } from "../client";
import { Settings } from "../../types/models";

const DEFAULTS: Settings = {
  baseCurrency: "BHD",
  connectedInboxEmail: null,
  bankSenderAllowlist: [],
  lastPolledAt: null,
  onboardingComplete: false,
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string | null }>(
    "SELECT key, value FROM settings"
  );
  const stored: Record<string, string | null> = {};
  for (const row of rows) stored[row.key] = row.value;

  return {
    baseCurrency: stored.baseCurrency ?? DEFAULTS.baseCurrency,
    connectedInboxEmail: stored.connectedInboxEmail ?? DEFAULTS.connectedInboxEmail,
    bankSenderAllowlist: stored.bankSenderAllowlist
      ? JSON.parse(stored.bankSenderAllowlist)
      : DEFAULTS.bankSenderAllowlist,
    lastPolledAt: stored.lastPolledAt ?? DEFAULTS.lastPolledAt,
    onboardingComplete: stored.onboardingComplete === "true",
  };
}

export async function updateSettings(updates: Partial<Settings>): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(updates)) {
      const serialized =
        value === null || value === undefined
          ? null
          : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, serialized]
      );
    }
  });
}
