import { useEffect, useState } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { GOOGLE_OAUTH_CLIENT_ID, GMAIL_SCOPES, GOOGLE_DISCOVERY } from "./authConfig";
import { saveTokens, clearTokens, loadTokens, StoredTokens } from "./tokenStore";

WebBrowser.maybeCompleteAuthSession();

/**
 * Drives the Google OAuth PKCE flow (FR2 / section 4.2). No client secret is
 * used or needed — expo-auth-session generates the PKCE code verifier/challenge
 * and the redirect is handled by the app's own scheme (see app.json "scheme").
 */
export function useGoogleAuth() {
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "budgettracker" });
  const clientId = Platform.OS === "ios" ? GOOGLE_OAUTH_CLIENT_ID.ios : GOOGLE_OAUTH_CLIENT_ID.android;

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: GMAIL_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { access_type: "offline", prompt: "consent" },
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    loadTokens().then(setTokens);
  }, []);

  async function connect(): Promise<boolean> {
    setError(null);
    setIsConnecting(true);
    try {
      if (!request) {
        setError("Auth request not ready yet — try again in a moment.");
        return false;
      }
      const result = await promptAsync();
      if (result.type !== "success" || !result.params.code) {
        if (result.type !== "cancel") setError("Google sign-in did not complete.");
        return false;
      }

      const exchanged = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
        },
        GOOGLE_DISCOVERY
      );

      const newTokens: StoredTokens = {
        accessToken: exchanged.accessToken,
        refreshToken: exchanged.refreshToken ?? null,
        expiresAt: Date.now() + (exchanged.expiresIn ?? 3600) * 1000,
      };
      await saveTokens(newTokens);
      setTokens(newTokens);
      return true;
    } catch (e: any) {
      setError(e?.message ?? "Failed to connect to Gmail.");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnect(): Promise<void> {
    await clearTokens();
    setTokens(null);
  }

  return { tokens, isConnected: !!tokens, isConnecting, error, connect, disconnect };
}

/**
 * Returns a valid access token, refreshing it first if it's expired or about
 * to expire. Call this before every Gmail API request rather than reading
 * the stored token directly.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  const isExpiringSoon = Date.now() > tokens.expiresAt - 60_000;
  if (!isExpiringSoon) return tokens.accessToken;

  if (!tokens.refreshToken) return null;

  const clientId = Platform.OS === "ios" ? GOOGLE_OAUTH_CLIENT_ID.ios : GOOGLE_OAUTH_CLIENT_ID.android;
  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId, refreshToken: tokens.refreshToken },
      GOOGLE_DISCOVERY
    );
    const newTokens: StoredTokens = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      expiresAt: Date.now() + (refreshed.expiresIn ?? 3600) * 1000,
    };
    await saveTokens(newTokens);
    return newTokens.accessToken;
  } catch {
    return null;
  }
}
