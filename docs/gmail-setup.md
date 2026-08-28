# Gmail OAuth setup

One-time setup, done under your own Google account in the Google Cloud Console. This can't be
driven by an agent — it needs your login — so follow it yourself, then paste the resulting IDs
into the two files noted at the end.

This app uses [`@react-native-google-signin/google-signin`](https://www.npmjs.com/package/@react-native-google-signin/google-signin)
rather than a hand-rolled OAuth flow, because Google has deprecated raw custom-URI-scheme redirects
for native apps (flagged as an app-impersonation risk) and now steers native apps toward its own
sign-in SDKs. That's a native module, so **this app cannot run in plain Expo Go** — you'll need a
[custom dev client](https://docs.expo.dev/develop/development-builds/introduction/) (`npx expo
prebuild` then `npx expo run:ios` / `npx expo run:android`).

## 1. Create the Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (or
   pick an existing one you're happy to dedicate to this).
2. **APIs & Services → Library** → search "Gmail API" → **Enable**.

## 2. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen**:

1. User type: **External** is fine — leave publishing status as **Testing** (this skips Google's
   app-review process entirely, which is what makes single-user "Testing" mode workable here).
2. Add yourself (`vrvaish2496@gmail.com`, or whichever address you'll use as the dedicated
   forwarding inbox) as a **test user**. Only test users can complete sign-in while the app is in
   Testing mode.
3. Under **Scopes**, add:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`

   (`gmail.modify` rather than `gmail.readonly` — the app needs to label messages processed after
   parsing them, per FR9.)

## 3. Create three OAuth client IDs

**APIs & Services → Credentials → Create Credentials → OAuth client ID.** Create all three, in the
same project:

### Web application
- No redirect URIs needed — leave that section empty.
- This is required by the sign-in library even though the app has no backend server; Android's
  Google Sign-In implementation uses it to validate the app. Copy the client ID
  (`...apps.googleusercontent.com`) → this is your **`webClientId`**.

### iOS
- Bundle ID: `com.budgettracker.app` (matches [app.json](../app.json)'s `ios.bundleIdentifier`).
- Copy the client ID → this is your **`iosClientId`**.

### Android
- Package name: `com.budgettracker.app` (matches [app.json](../app.json)'s `android.package`).
- SHA-1 certificate fingerprint — get this from your debug keystore for local development:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
  Copy the `SHA1:` line. (For a release build later, you'll need to add the release keystore's
  SHA-1 too — either your own, or the one EAS Build generates if you use `eas credentials` to
  fetch it.)
- This client ID isn't referenced anywhere in the app's code — Google matches requests to it
  server-side by package name + SHA-1, based on your app's actual signature.

## 4. Wire the IDs into the app

Edit two files:

**[`app.json`](../app.json)** — replace the plugin's `iosUrlScheme` with your iOS client ID,
reversed (Google's own format: reverse the numeric part and prefix
`com.googleusercontent.apps.`):

```json
["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.XXXXXXX" }]
```

**[`src/services/gmail/authConfig.ts`](../src/services/gmail/authConfig.ts)** — set:

```ts
export const GOOGLE_WEB_CLIENT_ID = "...apps.googleusercontent.com"; // the Web client
export const GOOGLE_IOS_CLIENT_ID = "...apps.googleusercontent.com"; // the iOS client
```

Then rebuild the native project so the config plugin picks up the new scheme:

```bash
npx expo prebuild --clean
npx expo run:ios      # or: npx expo run:android
```

## Known risk to verify on-device

Some Android builds of `@react-native-google-signin/google-signin` have open GitHub issues
reporting that `GoogleSignin.getTokens().accessToken` comes back empty, even though sign-in itself
succeeds. This wasn't something I could verify in the sandboxed environment this scaffold was built
in — no Android emulator or unlocked Xcode toolchain was available to actually run the app.

[`useGoogleAuth.ts`](../src/services/gmail/useGoogleAuth.ts) guards against this and throws a clear
error (rather than silently storing an empty token) if it happens. **If you hit this on Android**,
the fallback is to switch to a package built specifically around Android's `AuthorizationClient`
API (which is documented to reliably return a scoped access token) — e.g.
[`expo-google-credential-auth`](https://github.com/sagnik2001/expo-google-credential-auth) — note
it's a small, single-maintainer package, so weigh that against the alternative of adding a thin
backend to do the token exchange server-side, which is more work but drops that dependency risk.

## What to test once it builds

1. Settings → **Connect Gmail** → sign in with your test-user Google account → consent screen
   should list Gmail access, not just profile/email.
2. **Sync now** in Settings should succeed (0 imported is fine if the inbox is empty/has no
   parsing rules yet — see the main README's "before it's actually usable" section for that next
   step).
3. Force-quit and reopen the app, then **Sync now** again without reconnecting — this exercises the
   silent `signInSilently()` refresh path in `getValidAccessToken()`, confirming background polling
   won't need to re-prompt you every hour.
