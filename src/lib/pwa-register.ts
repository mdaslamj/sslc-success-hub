/** Client-side service worker registration (vite-plugin-pwa). */
export function registerPwaServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // vite-plugin-pwa may not emit sw.js in the TanStack Start client build.
  // Probing first avoids Lighthouse "404 when fetching the script" console errors.
  void fetch("/sw.js", { method: "HEAD", cache: "no-store" })
    .then((response) => {
      if (!response.ok) return;
      return import("virtual:pwa-register").then(({ registerSW }) => {
        registerSW({ immediate: true });
      });
    })
    .catch(() => {
      /* PWA plugin unavailable or sw.js not deployed */
    });
}
