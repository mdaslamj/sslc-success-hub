## Problem

The app fails at boot with:
> Missing required env var VITE_FIREBASE_API_KEY

The current `src/integrations/firebase/config.ts` reads all Firebase web config from `VITE_FIREBASE_*` env vars and throws if any are missing. Lovable's secrets system **reserves the `VITE_` prefix** for managed/internal secrets — users cannot add `VITE_*` secrets via the secret manager. That's why every attempt to add them was rejected.

This is why the live published site (and now the preview) 500s on every route: Vite never inlines the `VITE_FIREBASE_*` values into the bundle, so `requireEnv` throws during SSR and client boot.

## Important context

Firebase web config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, optional `measurementId`/VAPID key) is **publishable**, not secret. Firebase explicitly documents that these values are safe to embed in client code — security is enforced by Firestore/Storage Security Rules + Firebase Auth domain allow‑list + (optional) App Check. So the right fix on Lovable is to **commit the values into the codebase**, not to try to inject them via env vars.

The server-side `FIREBASE_PROJECT_ID` secret (used by the JWT verifier in server functions / middleware) is already configured correctly and stays as-is.

## Plan

1. **Get the Firebase web config values from you.** I need you to paste the 6 required values from your local `.env` (the c-success-hub project):
   - `apiKey`
   - `authDomain` (= `c-success-hub.firebaseapp.com`)
   - `projectId` (= `c-success-hub`)
   - `storageBucket` (= `c-success-hub.firebasestorage.app`)
   - `messagingSenderId`
   - `appId`
   - `measurementId` (optional, only if present)
   - `VITE_FIREBASE_VAPID_KEY` (optional, only if you use web push)

2. **Refactor `src/integrations/firebase/config.ts`:**
   - Replace the `requireEnv(...)` block with a hardcoded `firebaseConfig` object using the values you provide.
   - Delete the `env` / `requireEnv` helper.
   - Keep everything below the config unchanged (`firebaseApp`, `db`, `auth`, lazy storage, all the `COLLECTIONS`/subcollection constants).
   - Add a brief comment explaining these are publishable values and security lives in Firestore Rules.

3. **Update the other `VITE_FIREBASE_*` consumers** to import from the new committed config instead of reading `import.meta.env` directly:
   - `src/lib/notifications.ts` — currently reads `VITE_FIREBASE_VAPID_KEY` (and possibly others). Switch to importing from `@/integrations/firebase/config`. VAPID stays a constant exported from `config.ts` (or `undefined` if you don't use FCM).
   - `src/scripts/generateWhyTexts.ts` and `src/scripts/extractMarkSchemes.ts` — these are Node scripts run locally; leave their `process.env` / local `.env` usage alone. (Will confirm by reading the files before editing.)
   - `src/vite-env.d.ts` — remove the now-unused `VITE_FIREBASE_*` type declarations (cosmetic; safe).

4. **Verify the fix:**
   - After the edit, the preview should boot without the `Missing required env var` error.
   - Republish so the live site at `sscl-guru-ai.lovable.app` picks up the committed config.

5. **Security note (no code change needed, just confirm):** Because the Firebase web config is now in the public bundle (as it always has been on any deployed Firebase web app), confirm your Firestore Security Rules and Firebase Auth authorized-domains list are properly locked down to your project. They almost certainly already are — but worth a glance in the Firebase console.

## What I need from you to proceed

Paste the values from your local `.env` for:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (if present)
- `VITE_FIREBASE_VAPID_KEY` (if present)

The other three (`authDomain`, `projectId`, `storageBucket`) you already gave me.

Once you paste them, I'll implement steps 2–4 in one go.
