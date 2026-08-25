import * as SQLite from "expo-sqlite";
import { runMigrations } from "./schema";
import { seedDefaultCategories } from "./repositories/categoriesRepo";

const DB_NAME = "budget_tracker.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens (once) and returns the app's local SQLite database, migrated and
 * seeded. Safe to call repeatedly — subsequent calls reuse the same instance.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await runMigrations(db);
    await seedDefaultCategories(db);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}
