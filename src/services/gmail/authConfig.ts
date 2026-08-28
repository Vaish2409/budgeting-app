/**
 * Google OAuth config for Gmail access (section 4.2 / FR2), via
 * @react-native-google-signin/google-signin.
 *
 * Why this library instead of a hand-rolled expo-auth-session/PKCE flow: Google
 * has deprecated raw custom-URI-scheme redirects for native OAuth clients (flagged
 * as an app-impersonation risk) and now steers native apps toward its own sign-in
 * SDKs. This library wraps those SDKs — Google Sign-In on Android, GoogleSignIn
 * SDK on iOS. The Gmail scope is requested up front via configure({ scopes }), so
 * signIn() covers both identity and Gmail access, and getTokens() afterward
 * returns a real, client-usable access token — no backend server, no client
 * secret embedded in the app.
 *
 * Caveat (unverified in this environment — no device/emulator was available to
 * test on): some Android builds of this library have open issues reporting an
 * empty accessToken from getTokens(). src/services/gmail/useGoogleAuth.ts guards
 * against this and throws a clear error rather than silently failing — if you
 * hit it on-device, see docs/gmail-setup.md for the fallback.
 *
 * One-time setup (see docs/gmail-setup.md for the full walkthrough):
 *   1. Create a Google Cloud project; enable the Gmail API.
 *   2. Create THREE OAuth client IDs in the same project:
 *        - Web application  → used as `webClientId` below (required by the
 *          library even though we never use a backend — it's how Android's
 *          Credential Manager validates the app).
 *        - iOS              → bundle ID com.budgettracker.app → `iosClientId`.
 *        - Android           → package com.budgettracker.app + your SHA-1
 *          signing fingerprint. Not referenced in JS — Google matches it
 *          server-side against your app's signature.
 *   3. Leave the OAuth consent screen in "Testing" mode (single-user; skips
 *      Google's app-review process) and add your own Google account as a test
 *      user. Add every scope below to the consent screen's scope list.
 *   4. Paste the Web and iOS client IDs below, and the iOS one (reversed) into
 *      the `iosUrlScheme` config plugin entry in app.json.
 *
 * This module requires a custom dev client — it cannot run inside plain Expo Go
 * (`npx expo prebuild` then `npx expo run:ios` / `npx expo run:android`).
 */
export const GOOGLE_WEB_CLIENT_ID =
  "637136433143-r6tn95i7jrstsfbukdbqhvsgl1hktdnb.apps.googleusercontent.com";
export const GOOGLE_IOS_CLIENT_ID =
  "637136433143-f71hrqk81n7h9mfei9cb50g3jc0a2gj2.apps.googleusercontent.com";

/**
 * gmail.modify (not just readonly) is required so the app can archive/label
 * messages as processed after parsing (FR9), not just read them. Passed into
 * GoogleSignin.configure({ scopes }) so the initial sign-in consent screen
 * already covers Gmail access.
 */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** The Gmail label the app looks for new forwarded transaction emails in. */
export const INGEST_LABEL_NAME = "INBOX";

/** Label applied after a message has been parsed, so it isn't reprocessed (FR9). */
export const PROCESSED_LABEL_NAME = "BudgetTracker/Processed";
