/** Client-side service worker registration (vite-plugin-pwa). */
export function registerPwaServiceWorker(): void {
  if (typeof window === "undefined") return;

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* PWA plugin unavailable in this build */
    });
}
