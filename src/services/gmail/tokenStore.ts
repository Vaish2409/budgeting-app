import * as SecureStore from "expo-secure-store";

/**
 * The Gmail access token lives in the platform Keychain/Keystore (NFR section 7),
 * never in plain AsyncStorage or SQLite. There's no refresh token in this flow —
 * @react-native-google-signin/google-signin's requestAuthorization() is called
 * again to get a fresh token, silently, once the user has granted access once
 * (see useGoogleAuth.ts). `expiresAt` here is our own estimate (Google access
 * tokens are conventionally valid ~1 hour) since the library doesn't return an
 * explicit expiry — it's used to decide when to proactively re-authorize rather
 * than as a hard guarantee.
 */
const ACCESS_TOKEN_KEY = "gmail_access_token";
const EXPIRES_AT_KEY = "gmail_token_expires_at"; // epoch ms, stored as string
const CONNECTED_EMAIL_KEY = "gmail_connected_email";

export interface StoredTokens {
  accessToken: string;
  expiresAt: number; // epoch ms, estimated
  connectedEmail: string | null;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(EXPIRES_AT_KEY, String(tokens.expiresAt));
  if (tokens.connectedEmail) {
    await SecureStore.setItemAsync(CONNECTED_EMAIL_KEY, tokens.connectedEmail);
  }
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const [accessToken, expiresAtStr, connectedEmail] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(EXPIRES_AT_KEY),
    SecureStore.getItemAsync(CONNECTED_EMAIL_KEY),
  ]);
  if (!accessToken || !expiresAtStr) return null;
  return { accessToken, expiresAt: Number(expiresAtStr), connectedEmail };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
    SecureStore.deleteItemAsync(CONNECTED_EMAIL_KEY),
  ]);
}
