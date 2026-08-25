/**
 * Google OAuth config for Gmail access (section 4.2 / FR2).
 *
 * One-time setup (see docs/gmail-setup.md):
 *   1. Create a Google Cloud project.
 *   2. Enable the Gmail API.
 *   3. Create an OAuth client of type "iOS" and one of type "Android" (native
 *      apps use PKCE, not a client secret — that's why there's no secret here).
 *   4. Leave the OAuth consent screen in "Testing" mode (fine for single-user;
 *      skips Google's app-review process) and add your own Google account as
 *      a test user.
 *   5. Paste the generated client IDs below.
 *
 * These are safe to keep in the repo (unlike a client secret) — native OAuth
 * clients are identified by ID only, not a secret, and access is still gated
 * by the user consenting in the browser each time.
 */
export const GOOGLE_OAUTH_CLIENT_ID = {
  ios: "REPLACE_WITH_IOS_CLIENT_ID.apps.googleusercontent.com",
  android: "REPLACE_WITH_ANDROID_CLIENT_ID.apps.googleusercontent.com",
};

/**
 * gmail.modify (not just readonly) is required so the app can archive/label
 * messages as processed after parsing (FR9), not just read them.
 */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

/** The Gmail label the app looks for new forwarded transaction emails in. */
export const INGEST_LABEL_NAME = "INBOX";

/** Label applied after a message has been parsed, so it isn't reprocessed (FR9). */
export const PROCESSED_LABEL_NAME = "BudgetTracker/Processed";
