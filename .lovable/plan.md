## Plan

Append six Firebase placeholder lines to the existing `.env` file (keeping the current Supabase entries intact):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

No other files need changes — `src/integrations/firebase/config.ts` already reads from these `VITE_FIREBASE_*` variables.

## Where to paste your Firebase values

1. Open the **Code Editor**:
   - **Desktop**: code icon at the top of the preview window
   - **Mobile**: … in the bottom-right (Chat mode) → Code Editor
2. Open `.env` at the project root.
3. Paste each value from **Firebase Console → Project settings (gear icon) → Your apps → Web app → SDK setup and configuration → Config** after the matching `=` (no quotes, no spaces), e.g.:
   ```
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_PROJECT_ID=aura-xxxxx
   ```
4. Save. The dev server will pick up the new values on reload.

Note: these are publishable web-config values (safe in the client bundle); security is enforced by your Firestore rules. Do **not** put them in the Cloud Secrets panel — that's only for private server-side keys.
