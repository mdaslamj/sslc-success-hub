import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  CalendarClock,
  BookOpen,
  FlaskConical,
  LineChart,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/",          label: "Home",      icon: Home,          match: (p: string) => p === "/" },
  { to: "/planner",   label: "Planner",   icon: CalendarClock, match: (p: string) => p.startsWith("/planner") || p.startsWith("/log") },
  { to: "/subjects",  label: "Subjects",  icon: BookOpen,      match: (p: string) => p.startsWith("/subjects") },
  { to: "/exams",     label: "Exams",     icon: FlaskConical,  match: (p: string) => p.startsWith("/exams") || p.startsWith("/exam-results") },
  { to: "/analytics", label: "Insights",  icon: LineChart,     match: (p: string) => p.startsWith("/analytics") || p.startsWith("/predictions") },
  { to: "/profile",   label: "Profile",   icon: UserIcon,      match: (p: string) => p.startsWith("/profile") },
] as const;

/**
 * Native-feel bottom tab bar. Mobile-only (md+ shows the sidebar instead).
 * Sticky to viewport bottom with safe-area inset padding.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-border/60 bg-background/85 backdrop-blur-xl"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-6 px-1 pt-1.5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.to} className="flex">
              <Link
                to={t.to}
                className={cn(
                  "press relative mx-auto flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-12 items-center justify-center rounded-2xl transition-colors",
                    active && "bg-secondary",
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px]", active && "stroke-[2.4]")} />
                </span>
                <span className="tracking-tight">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}