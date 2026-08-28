import { useCallback, useEffect, useState } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GMAIL_SCOPES } from "./authConfig";
import { saveTokens, loadTokens, clearTokens, StoredTokens } from "./tokenStore";

// Google access tokens are conventionally valid ~1 hour; refresh a bit early.
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;

let isConfigured = false;
function ensureConfigured() {
  if (isConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false, // no backend — the app itself polls while it holds a live session
    scopes: GMAIL_SCOPES, // requested up front so signIn() itself covers Gmail access
  });
  isConfigured = true;
}

/**
 * Reads the accessToken off getTokens(), guarding against the empty-string
 * case some Android builds of this library are known to return for it (see
 * open issues against @react-native-google-signin/google-signin — unverified
 * on-device in this environment; flagged in docs/gmail-setup.md).
 */
async function fetchAccessToken(): Promise<string> {
  const { accessToken } = await GoogleSignin.getTokens();
  if (!accessToken) {
    throw new Error(
      "Google Sign-In returned no access token. This is a known issue on some Android " +
        "builds of @react-native-google-signin/google-signin — see docs/gmail-setup.md " +
        "for the fallback if this happens on your device."
    );
  }
  return accessToken;
}

/**
 * Drives Google sign-in + Gmail authorization (FR2 / section 4.2). The Gmail
 * scope is requested up front via configure({ scopes }), so a single signIn()
 * covers both identity and Gmail access — getTokens() afterward returns an
 * access token already carrying that scope.
 */
export function useGoogleAuth() {
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureConfigured();
    loadTokens().then(setTokens);
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    ensureConfigured();
    setError(null);
    setIsConnecting(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type !== "success") {
        return false; // user cancelled
      }

      const accessToken = await fetchAccessToken();
      const newTokens: StoredTokens = {
        accessToken,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS,
        connectedEmail: signInResult.data.user.email,
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
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
    } catch {
      // already signed out on the native side — fine, just clear our local copy
    }
    await clearTokens();
    setTokens(null);
  }, []);

  return { tokens, isConnected: !!tokens, isConnecting, error, connect, disconnect };
}

/**
 * Returns a valid Gmail access token, silently re-signing-in first if the
 * cached one is expired or about to expire. signInSilently() restores the
 * session without prompting the user, so this should never interrupt a
 * background poll (FR5) with a UI prompt. Returns null if there's no prior
 * grant to restore from, meaning the caller should prompt the user to
 * reconnect from Settings.
 */
export async function getValidAccessToken(): Promise<string | null> {
  ensureConfigured();
  const cached = await loadTokens();
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }

  try {
    if (!GoogleSignin.hasPreviousSignIn()) return null;

    const silentResult = await GoogleSignin.signInSilently();
    if (silentResult.type !== "success") return null;

    const accessToken = await fetchAccessToken();
    const newTokens: StoredTokens = {
      accessToken,
      expiresAt: Date.now() + TOKEN_LIFETIME_MS,
      connectedEmail: cached?.connectedEmail ?? silentResult.data.user.email,
    };
    await saveTokens(newTokens);
    return newTokens.accessToken;
  } catch {
    return null;
  }
}
