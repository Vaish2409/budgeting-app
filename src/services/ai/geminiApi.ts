import { loadGeminiKey } from "./geminiKeyStore";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function geminiFetch(body: object): Promise<any> {
  const key = await loadGeminiKey();
  if (!key) throw new Error("Gemini API key not configured — add one in Settings.");

  const res = await fetch(`${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini API failed: ${res.status} ${errBody}`);
  }
  return res.json();
}

/**
 * Asks Gemini to read a (redacted) bank transaction alert and name the
 * merchant plus pick the best-fitting category from the user's own category
 * list. Used only as a fallback — see src/services/parsing/categorize.ts —
 * when regex + the keyword table couldn't resolve one or the other on their
 * own. Uses structured JSON output (responseSchema) so there's no fragile
 * free-text parsing of the model's reply.
 */
export async function classifyTransaction(
  redactedText: string,
  categoryNames: string[]
): Promise<{ merchant: string | null; category: string | null }> {
  const data = await geminiFetch({
    contents: [
      {
        parts: [
          {
            text:
              `You extract data from a bank transaction alert. Message:\n"""${redactedText}"""\n\n` +
              `Return the merchant/payee name as plainly as a person would read it (strip prefixes ` +
              `like "TALABAT*"), and pick the single best-fitting category from this exact list: ` +
              `${categoryNames.join(", ")}. If nothing fits well, use "Other". If you can't ` +
              `determine a field, use null.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          merchant: { type: "STRING", nullable: true },
          category: { type: "STRING", nullable: true },
        },
        required: ["merchant", "category"],
      },
    },
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}
