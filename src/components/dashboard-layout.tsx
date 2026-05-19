import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, Search, Sparkles, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";

export function DashboardLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, profile } = useAuth();
  const initial = (profile?.studentName || profile?.displayName || user?.displayName || user?.email || "S")
    .trim()
    .charAt(0)
    .toUpperCase();
  return (
    <SidebarProvider style={{ ["--sidebar-width" as never]: "16rem" } as React.CSSProperties}>
      <div className="flex min-h-[100dvh] w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl md:h-16 md:gap-3 md:px-6">
            <SidebarTrigger className="-ml-1 h-10 w-10" />
            <div className="hidden md:block">
              <h2 className="font-display text-sm font-semibold text-foreground/80">{title}</h2>
            </div>
            <h2 className="md:hidden truncate font-display text-sm font-semibold text-foreground/80">{title}</h2>
            <div className="relative ml-auto hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chapters, formulas, notes…"
                className="h-9 w-72 rounded-full border-border/60 bg-secondary/60 pl-9 text-sm"
              />
            </div>
            <Button size="icon" variant="ghost" className="md:hidden ml-auto h-10 w-10">
              <Search className="h-4 w-4" />
            </Button>
            <Button size="sm" className="hidden md:inline-flex gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90">
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </Button>
            <Button size="icon" variant="ghost" className="relative rounded-full h-10 w-10">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
            {user ? (
              <Link
                to="/profile"
                className="h-9 w-9 shrink-0 rounded-full gradient-brand flex items-center justify-center text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:scale-105 active:scale-95"
                aria-label="Profile"
              >
                {initial}
              </Link>
            ) : (
              <Button
                asChild
                size="sm"
                className="h-9 gap-1.5 rounded-full px-3 sm:px-4 gradient-brand text-brand-foreground shadow-glow hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Link to="/login">
                  <LogIn className="h-4 w-4" />
                  <span>Sign in</span>
                </Link>
              </Button>
            )}
          </header>
          <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8 pb-[max(env(safe-area-inset-bottom),1rem)]">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}