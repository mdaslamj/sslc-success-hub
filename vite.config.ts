// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

function firebaseMessagingAssets(): Plugin {
  const writeSwConfig = (env: Record<string, string>, destDir: string) => {
    const apiKey = env.VITE_FIREBASE_API_KEY;
    const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = env.VITE_FIREBASE_PROJECT_ID;
    const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
    const appId = env.VITE_FIREBASE_APP_ID;

    if (!apiKey || !messagingSenderId || !appId) return;

    writeFileSync(
      resolve(destDir, "firebase-sw-config.js"),
      `// Auto-generated from VITE_FIREBASE_* env vars — do not edit.
self.FIREBASE_API_KEY = ${JSON.stringify(apiKey)};
self.FIREBASE_AUTH_DOMAIN = ${JSON.stringify(authDomain ?? "")};
self.FIREBASE_PROJECT_ID = ${JSON.stringify(projectId ?? "")};
self.FIREBASE_STORAGE_BUCKET = ${JSON.stringify(storageBucket ?? "")};
self.FIREBASE_MESSAGING_SENDER_ID = ${JSON.stringify(messagingSenderId)};
self.FIREBASE_APP_ID = ${JSON.stringify(appId)};
`,
      "utf8",
    );

    const manifestPath = resolve(process.cwd(), "public/manifest.json");
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
      manifest.gcm_sender_id = messagingSenderId;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    } catch {
      /* manifest unavailable during partial setup */
    }
  };

  const envFromProcess = (): Record<string, string> => {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("VITE_") && value) env[key] = value;
    }
    return env;
  };

  const syncSwConfigToClient = () => {
    const publicConfig = resolve(process.cwd(), "public/firebase-sw-config.js");
    const clientDir = resolve(process.cwd(), "dist/client");
    if (!existsSync(publicConfig) || !existsSync(clientDir)) return;
    copyFileSync(publicConfig, resolve(clientDir, "firebase-sw-config.js"));
  };

  return {
    name: "firebase-messaging-assets",
    configResolved(config) {
      writeSwConfig(config.env as Record<string, string>, resolve(process.cwd(), "public"));
    },
    buildStart() {
      writeSwConfig(envFromProcess(), resolve(process.cwd(), "public"));
    },
    closeBundle() {
      writeSwConfig(envFromProcess(), resolve(process.cwd(), "public"));
      syncSwConfigToClient();
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      firebaseMessagingAssets(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon-192.png", "icon-512.png", "apple-touch-icon.png"],
        manifest: false,
        injectRegister: null,
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,json}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com/,
              handler: "NetworkFirst",
              options: {
                cacheName: "firestore-cache",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  },
});
