import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { logQADiagnostic } from "@/lib/qa/diagnostics";
import {
  installAuraDevGlobals,
  runAuraStartupRecovery,
} from "@/lib/dev/aura-app-reset";
import { flushOfflineQueue } from "@/lib/offlineQueue";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import { NotificationProvider } from "@/components/NotificationProvider";
import { registerPwaServiceWorker } from "@/lib/pwa-register";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#8B5CF6" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Aura" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { title: "Aura — Project Aura" },
      { name: "description", content: "AI-powered preparation, target tracking, and result prediction for Karnataka SSLC Class 10 board exams." },
      { name: "author", content: "Aura" },
      { property: "og:title", content: "Aura — Project Aura" },
      { property: "og:description", content: "AI-powered preparation, target tracking, and result prediction for Karnataka SSLC Class 10 board exams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Aura — Project Aura" },
      { name: "twitter:description", content: "AI-powered preparation, target tracking, and result prediction for Karnataka SSLC Class 10 board exams." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d378c8e3-f66f-4354-afe1-4b5b3fc90d2d" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d378c8e3-f66f-4354-afe1-4b5b3fc90d2d" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    runAuraStartupRecovery();
    installAuraDevGlobals();
    registerPwaServiceWorker();
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void flushOfflineQueue();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SessionSync queryClient={queryClient}>
            <OnboardingGate>
              <GlobalInteractionGuard />
              <NotificationProvider />
              <Outlet />
            </OnboardingGate>
          </SessionSync>
          <Toaster richColors position="top-right" />
          <InstallPrompt />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * App-wide safety net for clickable elements:
 *  - Captures unhandled errors / promise rejections during user interactions
 *  - Detects dead clicks (anchors without href + buttons without handlers)
 *  - Logs everything through the QA diagnostics buffer
 */
function GlobalInteractionGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      logQADiagnostic("RUNTIME_ERROR", {
        message: event.message,
        source: event.filename,
        line: event.lineno,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      logQADiagnostic("UNHANDLED_REJECTION", { reason: String(event.reason) });
    };

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'a, button, [role="button"], [data-clickable]'
      ) as HTMLElement | null;
      if (!interactive) return;

      // Disabled controls — swallow + log, don't let the action run.
      const ariaDisabled = interactive.getAttribute("aria-disabled") === "true";
      const nativeDisabled =
        (interactive as HTMLButtonElement).disabled === true || ariaDisabled;
      if (nativeDisabled) {
        event.preventDefault();
        event.stopPropagation();
        logQADiagnostic("DEAD_CLICK", {
          reason: "disabled",
          tag: interactive.tagName,
          label: (interactive.textContent || "").trim().slice(0, 80),
        });
        return;
      }

      if (interactive.tagName === "A") {
        const href = (interactive as HTMLAnchorElement).getAttribute("href");
        if (!href || href === "#" || href.trim() === "") {
          logQADiagnostic("DEAD_CLICK", {
            reason: "anchor-missing-href",
            label: (interactive.textContent || "").trim().slice(0, 80),
          });
        }
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return null;
}

/**
 * Whenever the signed-in uid changes, clear the React Query cache and force
 * route loaders to re-run so the dashboard hydrates against the fresh
 * profile / planner / streaks / insights instead of stale guest data.
 */
function SessionSync({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  const { sessionEpoch } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (sessionEpoch === 0) return; // initial mount, nothing stale yet
    queryClient.clear();
    void router.invalidate();
  }, [sessionEpoch, queryClient, router]);
  return <>{children}</>;
}

/**
 * Redirects signed-in users without a completed onboarding flow to /onboarding.
 * Public auth routes are allow-listed so the flow itself is reachable.
 */
const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/onboarding",
  "/seed",
  "/privacy",
  "/join-group",
]);

const GUEST_KEY = "aura.guest.v1";
const GUEST_ONBOARDING_KEY = "aura.guest.onboarding.v1";
const SPLASH_SEEN_KEY = "aura.splash.seen.v1";

function Splash({ label = "Preparing your study space" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-6 text-center"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-soft">
        <span className="text-2xl" aria-hidden>🌱</span>
      </div>
      <h1 className="mt-5 text-lg font-semibold text-foreground">Aura</h1>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      <div className="mt-6 flex items-center gap-1.5" aria-hidden>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      </div>
      <span className="sr-only" role="status" aria-live="polite">Loading…</span>
    </div>
  );
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [splashHold, setSplashHold] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  // Minimum splash window on first paint so session restore feels smooth
  // instead of flashing the dashboard.
  useEffect(() => {
    const t = setTimeout(() => setSplashHold(false), 450);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading) {
      setAuthTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setAuthTimedOut(true), 2200);
    return () => window.clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.has(pathname);

    // Authenticated path — gate on profile completion.
    if (user) {
      if (!profile) return;
      if (profile.onboardingCompletedAt) {
        // Returning authenticated user landing on auth pages → dashboard.
        if (pathname === "/login" || pathname === "/onboarding") {
          navigate({ to: "/" });
        }
        return;
      }
      if (pathname === "/onboarding") return;
      navigate({ to: "/onboarding" });
      return;
    }

    if (isPublic) return;

    // Unauthenticated path — guest mode or redirect to login.
    let isGuest = false;
    let guestOnboarded = false;
    let splashSeen = false;
    try {
      isGuest = localStorage.getItem(GUEST_KEY) === "1";
      guestOnboarded = !!localStorage.getItem(GUEST_ONBOARDING_KEY);
      splashSeen = localStorage.getItem(SPLASH_SEEN_KEY) === "1";
    } catch {}
    if (!isGuest) {
      // First-time visitor → Splash → Onboarding → Auth.
      if (!splashSeen) {
        try { localStorage.setItem(SPLASH_SEEN_KEY, "1"); } catch {}
        navigate({ to: "/onboarding" });
      } else {
        navigate({ to: "/login" });
      }
      return;
    }
    if (!guestOnboarded) {
      navigate({ to: "/onboarding" });
    }
  }, [user, profile, loading, pathname, navigate]);

  // Prevent rendering protected content before auth/profile context is ready.
  const isPublic = PUBLIC_PATHS.has(pathname);
  const profilePending = !!user && !profile;
  const showSplash =
    splashHold ||
    (!isPublic && loading && !authTimedOut) ||
    (!isPublic && profilePending);

  if (showSplash) {
    return (
      <Splash
        label={
          loading || profilePending
            ? "Restoring your session…"
            : "Preparing your study space"
        }
      />
    );
  }

  return <>{children}</>;
}
