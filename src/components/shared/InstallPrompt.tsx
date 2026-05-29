import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "aura.pwa.install.dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* storage unavailable */
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2"
      role="region"
      aria-label="Install Aura"
    >
      <div
        className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-white/10 px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "#08080E" }}
      >
        <p className="text-sm text-white/90">
          Add Aura to your home screen for the best experience
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleDismiss}
          >
            Not now
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
            onClick={() => void handleInstall()}
          >
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
