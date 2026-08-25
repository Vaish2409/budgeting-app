import { SQLiteDatabase } from "expo-sqlite";
import { getDb } from "../client";
import { Category } from "../../types/models";
import { DEFAULT_CATEGORIES, DEFAULT_MERCHANT_KEYWORDS } from "../../constants/defaultCategories";
import { generateId } from "../../utils/id";

function rowToCategory(row: any): Category {
  return { ...row, isDefault: !!row.isDefault };
}

/** Seeds the default category list + starter merchant keyword rules, once. */
export async function seedDefaultCategories(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM categories"
  );
  if (existing && existing.count > 0) return;

  const nameToId: Record<string, string> = {};

  await db.withTransactionAsync(async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      const id = generateId();
      nameToId[cat.name] = id;
      await db.runAsync(
        `INSERT INTO categories (id, name, color, icon, isDefault, sortOrder) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, cat.name, cat.color, cat.icon, cat.isDefault ? 1 : 0, cat.sortOrder]
      );
    }
    for (const [keyword, categoryName] of Object.entries(DEFAULT_MERCHANT_KEYWORDS)) {
      const categoryId = nameToId[categoryName];
      if (!categoryId) continue;
      await db.runAsync(
        `INSERT OR IGNORE INTO merchant_category_rules (merchantPattern, categoryId, isUserDefined) VALUES (?, ?, 0)`,
        [keyword, categoryId]
      );
    }
  });
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync("SELECT * FROM categories ORDER BY sortOrder ASC");
  return rows.map(rowToCategory);
}

export async function createCategory(
  input: Omit<Category, "id" | "isDefault">
): Promise<Category> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO categories (id, name, color, icon, isDefault, sortOrder) VALUES (?, ?, ?, ?, 0, ?)`,
    [id, input.name, input.color, input.icon, input.sortOrder]
  );
  return { ...input, id, isDefault: false };
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, "name" | "color" | "icon" | "sortOrder">>
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (updates as any)[f]);
  await db.runAsync(`UPDATE categories SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM categories WHERE id = ?", [id]);
}
