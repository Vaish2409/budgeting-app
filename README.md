# Budget Tracker

Personal, cross-platform (Android + iOS) budgeting app. Bank SMS alerts are forwarded by a
phone-level automation to a dedicated Gmail inbox; this app reads that inbox via the Gmail API,
parses transactions, and tracks spend against category budgets in a chosen base currency.

Full requirements: see the project's requirements document (section references like "FR12" or
"NFR" throughout the code point back to it).

## Status

This is a working scaffold: navigation, local SQLite storage, currency handling, budgets,
dashboard, manual transaction entry, and the Gmail OAuth/ingestion pipeline are all wired up and
type-check + bundle cleanly for both platforms. It has **not** been run on a simulator/device yet
in this environment — see "Known gaps" below.

## Running it

Because of the Gmail sign-in library (see below), this needs a custom dev client — plain Expo Go
won't work:

```bash
npm install
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

Subsequent runs can use `npx expo start` and reconnect to the dev client already installed on the
simulator/device/emulator.

## Before it's actually usable

1. **Google Cloud OAuth setup** (section 4.2 / FR2) — see [`docs/gmail-setup.md`](docs/gmail-setup.md)
   for the full walkthrough. Note this app uses `@react-native-google-signin/google-signin` (Google's
   currently-recommended path for native apps — it deprecated raw custom-URI-scheme redirects), which
   means **it needs a custom dev client and can't run in plain Expo Go**: `npx expo prebuild` then
   `npx expo run:ios` / `npx expo run:android`.
2. **Real sample forwarded messages** — the parser (`src/services/parsing/`) is config-driven
   (`ParsingRule` rows in SQLite) rather than hardcoded per bank, but no rules are seeded yet
   because we don't have real message samples. Once you have a few real forwarded emails from your
   bank(s), add a `ParsingRule` per bank (via `src/db/repositories/parsingRulesRepo.ts`, or a
   Settings UI for this can be added) with the actual regex patterns for that format.
3. **Node version** — this machine has Node v20.5.1; Expo SDK 57 / React Native 0.86 want
   `>=20.19.4`. Everything type-checks and bundles fine regardless (verified via `expo export` for
   both platforms), but you may hit issues running Metro long-term. Upgrading Node is recommended
   before real device testing.

## Project layout

```
src/
  types/models.ts          Data model (Transaction, Category, CategoryBudget, FxRateCache, Settings, ParsingRule)
  constants/                Default categories, currency decimal-precision table, common currencies
  db/                        SQLite client, migrations, repositories (one per table)
  services/
    fx/                      Frankfurter.dev rate fetching + daily cache + offline fallback (FR13/FR14)
    parsing/                 Config-driven message parser + currency detection (FR6/FR7/FR10)
    gmail/                   Google sign-in, token storage (Keychain/Keystore), Gmail REST calls, ingestion orchestration
  context/AppContext.tsx     App-wide settings + categories, backed by SQLite
  navigation/                Bottom-tab + stack navigation, onboarding gate
  screens/                   onboarding, dashboard, transactions, budgets, settings
  components/                Shared UI: progress bars, category chart, transaction list item
  utils/                     Currency minor-unit math (respects 3-decimal currencies — FR16), month helpers, id generation
```

## Design notes

- **Amounts are stored as integer minor units** (cents/fils), not floats, to avoid rounding drift
  across repeated FX conversions. `src/utils/currency.ts` converts to/from decimal for display,
  always looking up the currency's actual precision (BHD/KWD/OMR/JOD/TND = 3 decimals) rather than
  assuming 2.
- **Debit/credit sign convention**: `baseAmountMinor` and `originalAmountMinor` are positive for
  spend (debit) and negative for refunds/credit. Budget and dashboard totals sum only positive
  amounts.
- **Charts use `react-native-svg` directly** rather than a charting library — the only category
  breakdown needed is a handful of bars, and pulling in Victory Native would mean adding
  `@shopify/react-native-skia` + Reanimated + Gesture Handler for very little payoff on a personal
  app.
- **Dedupe** happens twice: Gmail messages get labeled `BudgetTracker/Processed` after parsing
  (FR9, so they're never re-fetched), and `sourceMessageId` has a unique index in SQLite (FR8, so
  even a re-fetched message can't create a duplicate transaction).
