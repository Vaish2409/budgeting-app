import * as SecureStore from "expo-secure-store";

/**
 * OAuth tokens live in the platform Keychain/Keystore (NFR section 7), never
 * in plain AsyncStorage or SQLite.
 */
const ACCESS_TOKEN_KEY = "gmail_access_token";
const REFRESH_TOKEN_KEY = "gmail_refresh_token";
const EXPIRES_AT_KEY = "gmail_token_expires_at"; // epoch ms, stored as string

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
  await SecureStore.setItemAsync(EXPIRES_AT_KEY, String(tokens.expiresAt));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(EXPIRES_AT_KEY),
  ]);
  if (!accessToken || !expiresAtStr) return null;
  return { accessToken, refreshToken, expiresAt: Number(expiresAtStr) };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
  ]);
}
