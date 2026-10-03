import * as SecureStore from "expo-secure-store";

/**
 * The Gemini API key lives in the platform Keychain/Keystore, same trust tier
 * as the Gmail token (see gmail/tokenStore.ts) — never in the plaintext
 * `settings` table or anywhere in git. Its presence is also the sole on/off
 * switch for AI-assisted categorization (src/services/parsing/categorize.ts):
 * no key saved means the fallback never fires.
 */
const GEMINI_API_KEY = "gemini_api_key";

export async function saveGeminiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(GEMINI_API_KEY, key);
}

export async function loadGeminiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(GEMINI_API_KEY);
}

export async function clearGeminiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(GEMINI_API_KEY);
}
