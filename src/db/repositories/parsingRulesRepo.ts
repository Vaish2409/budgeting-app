import { getDb } from "../client";
import { ParsingRule } from "../../types/models";
import { generateId } from "../../utils/id";

function rowToRule(row: any): ParsingRule {
  return { ...row, enabled: !!row.enabled };
}

export async function listParsingRules(): Promise<ParsingRule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync("SELECT * FROM parsing_rules");
  return rows.map(rowToRule);
}

export async function createParsingRule(input: Omit<ParsingRule, "id">): Promise<ParsingRule> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO parsing_rules
      (id, bankIdentifier, senderMatch, isTransactionPattern, isNonTransactionPattern,
       amountPattern, currencyPattern, debitCreditPattern, merchantPattern, lastFourPattern, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.bankIdentifier,
      input.senderMatch,
      input.isTransactionPattern,
      input.isNonTransactionPattern,
      input.amountPattern,
      input.currencyPattern,
      input.debitCreditPattern,
      input.merchantPattern,
      input.lastFourPattern,
      input.enabled ? 1 : 0,
    ]
  );
  return { ...input, id };
}

export async function updateParsingRule(
  id: string,
  updates: Partial<Omit<ParsingRule, "id">>
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => {
    const v = (updates as any)[f];
    return typeof v === "boolean" ? (v ? 1 : 0) : v;
  });
  await db.runAsync(`UPDATE parsing_rules SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function deleteParsingRule(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM parsing_rules WHERE id = ?", [id]);
}
