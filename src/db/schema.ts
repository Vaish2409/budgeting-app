import { SQLiteDatabase } from "expo-sqlite";

/**
 * Schema is versioned via PRAGMA user_version and migrated forward in order.
 * Add new migrations by appending to MIGRATIONS — never edit an already-shipped
 * migration once a build with it exists.
 */
const MIGRATIONS: string[] = [
  // v1 — initial schema, per Requirements Document section 6.
  `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    isDefault INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    originalAmountMinor INTEGER NOT NULL,
    originalCurrency TEXT NOT NULL,
    baseAmountMinor INTEGER NOT NULL,
    fxRateUsed REAL,
    merchant TEXT,
    bankSource TEXT,
    categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL,
    note TEXT,
    sourceType TEXT NOT NULL CHECK (sourceType IN ('auto', 'manual')),
    sourceMessageId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_sourceMessageId
    ON transactions(sourceMessageId) WHERE sourceMessageId IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);

  CREATE TABLE IF NOT EXISTS category_budgets (
    categoryId TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    limitAmountMinor INTEGER NOT NULL,
    PRIMARY KEY (categoryId, month)
  );

  CREATE TABLE IF NOT EXISTS fx_rate_cache (
    currencyCode TEXT NOT NULL,
    date TEXT NOT NULL,
    baseCurrency TEXT NOT NULL,
    rateToBase REAL NOT NULL,
    PRIMARY KEY (currencyCode, date, baseCurrency)
  );

  CREATE TABLE IF NOT EXISTS merchant_category_rules (
    merchantPattern TEXT PRIMARY KEY NOT NULL,
    categoryId TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    isUserDefined INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS parsing_rules (
    id TEXT PRIMARY KEY NOT NULL,
    bankIdentifier TEXT NOT NULL,
    senderMatch TEXT NOT NULL,
    isTransactionPattern TEXT NOT NULL,
    isNonTransactionPattern TEXT,
    amountPattern TEXT NOT NULL,
    currencyPattern TEXT,
    debitCreditPattern TEXT,
    merchantPattern TEXT,
    lastFourPattern TEXT,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,

  // v2 — per-rule/per-transaction "spender" label, so households sharing one
  // dedicated inbox across multiple phones (each forwarding under its own
  // personal address) can tell whose spend is whose.
  `
  ALTER TABLE parsing_rules ADD COLUMN spender TEXT;
  ALTER TABLE transactions ADD COLUMN spender TEXT;
  `,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let version = row?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    const migration = MIGRATIONS[version];
    await db.execAsync(migration);
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
