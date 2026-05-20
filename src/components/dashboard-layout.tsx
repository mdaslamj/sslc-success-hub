import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, Search, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { BottomNav } from "@/components/bottom-nav";
import { PageTransition } from "@/components/page-transition";
import { Camera } from "lucide-react";
import { SyncStatusBanner } from "@/components/offline/sync-status-banner";

/**
 * Unified app shell. Mobile = native-style top bar + bottom tab nav.
 * Desktop (md+) = preserves the existing sidebar layout so deep routes
 * (focus, achievements, quizzes etc.) keep full navigation.
 */
export function DashboardLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, profile } = useAuth();
  const name = profile?.studentName || profile?.displayName || user?.displayName || "";
  const initial = (name || user?.email || "S").trim().charAt(0).toUpperCase();

  return (
    <SidebarProvider style={{ ["--sidebar-width" as never]: "16rem" } as React.CSSProperties}>
      <div className="flex min-h-[100dvh] w-full bg-background">
        {/* Desktop sidebar — hidden on mobile to free the entire viewport */}
        <div className="hidden md:flex">
          <AppSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar — minimal on mobile, full search on desktop */}
          <header
            className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/40 bg-background/85 px-4 backdrop-blur-xl md:h-16 md:gap-3 md:px-6"
            style={{ paddingTop: "max(env(safe-area-inset-top), 0)" }}
          >
            <div className="hidden md:flex md:items-center md:gap-3">
              <SidebarTrigger className="-ml-1 h-10 w-10" />
              <h2 className="font-display text-sm font-semibold text-foreground/80">{title}</h2>
            </div>

            {/* Mobile: greeting / page title */}
            <div className="md:hidden flex items-center gap-2">
              <Link
                to="/"
                className="flex h-9 w-9 items-center justify-center rounded-2xl gradient-brand text-brand-foreground font-display text-base font-bold shadow-soft"
                aria-label="Home"
              >
                🌱
              </Link>
              <div className="leading-tight">
                <div className="text-[11px] text-muted-foreground">Aura</div>
                <h2 className="font-display text-[15px] font-semibold text-foreground truncate max-w-[40vw]">
                  {title ?? "Today"}
                </h2>
              </div>
            </div>

            <div className="relative ml-auto hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chapters, formulas, notes…"
                className="h-9 w-72 rounded-full border-border/60 bg-secondary/60 pl-9 text-sm"
              />
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="ml-auto md:ml-0 relative rounded-full h-10 w-10 press"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>

            {user ? (
              <Link
                to="/profile"
                className="press h-9 w-9 shrink-0 rounded-full gradient-brand flex items-center justify-center text-sm font-semibold text-brand-foreground shadow-soft"
                aria-label="Profile"
              >
                {initial}
              </Link>
            ) : (
              <Button
                asChild
                size="sm"
                className="h-9 gap-1.5 rounded-full px-3 gradient-brand text-brand-foreground shadow-soft press"
              >
                <Link to="/login">
                  <LogIn className="h-4 w-4" />
                  <span>Sign in</span>
                </Link>
              </Button>
            )}
          </header>

          <main className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8">
            <SyncStatusBanner className="mb-3" />
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Premium Scan FAB — anchored above bottom nav, mobile-first */}
        <Link
          to="/scan"
          aria-label="Scan a question"
          className="press fixed right-4 z-40 md:right-8 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand text-brand-foreground shadow-glow"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}
        >
          <span className="absolute inset-0 rounded-2xl gradient-brand opacity-50 blur-lg" aria-hidden />
          <Camera className="relative h-6 w-6" />
        </Link>

        <BottomNav />
      </div>
    </SidebarProvider>
  );
}