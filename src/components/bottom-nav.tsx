import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home,
  CalendarCheck,
  ClipboardCheck,
  BarChart2,
  Menu,
  BookOpen,
  Brain,
  Sparkles,
  GraduationCap,
  FlaskConical,
  Mic,
  Users,
  Settings,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreDrawer, type MoreDrawerItem } from "@/components/nav/MoreDrawer";
import { hasUnreadMoreNavUpdates } from "@/lib/more-nav-updates";
import { useAuthOptional } from "@/contexts/auth-context";

const MORE_MATCH = (p: string) =>
  p.startsWith("/subjects") ||
  p.startsWith("/predictions") ||
  p.startsWith("/profile") ||
  p.startsWith("/exam-simulation") ||
  p.startsWith("/teacher") ||
  p.startsWith("/parent-view") ||
  p.startsWith("/exams") ||
  p.startsWith("/exam-results") ||
  p.startsWith("/voice");

const MAIN_TABS = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    to: "/planner",
    label: "Planner",
    icon: CalendarCheck,
    match: (p: string) => p.startsWith("/planner") || p.startsWith("/log"),
  },
  {
    to: "/evaluate",
    label: "Evaluate",
    icon: ClipboardCheck,
    match: (p: string) => p.startsWith("/evaluate"),
  },
  {
    to: "/analytics",
    label: "Progress",
    icon: BarChart2,
    match: (p: string) => p.startsWith("/analytics"),
  },
] as const;

function buildMoreItems(isTeacher: boolean): MoreDrawerItem[] {
  return [
    { to: "/subjects", label: "Subjects", icon: BookOpen },
    { to: "/predictions", label: "War Room", icon: Brain },
    { to: "/profile", label: "Constellation", icon: Sparkles },
    { to: "/exam-simulation", label: "Exam Simulation", icon: GraduationCap },
    { to: "/exams", label: "Mock Exams", icon: FlaskConical },
    { to: "/voice", label: "Coach", icon: Mic },
    { to: "/teacher", label: "Teacher", icon: UserCheck, show: isTeacher },
    { to: "/parent-view", label: "Parent View", icon: Users },
    { to: "/profile", label: "Settings", icon: Settings },
  ];
}

/**
 * Native-feel bottom tab bar. Mobile-only (md+ shows the sidebar instead).
 * Sticky to viewport bottom with safe-area inset padding.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const auth = useAuthOptional();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showMoreDot, setShowMoreDot] = useState(false);

  const isTeacher =
    auth?.profile?.role === "teacher" || auth?.profile?.role === "admin";

  const moreItems = useMemo(() => buildMoreItems(isTeacher), [isTeacher]);
  const moreActive = MORE_MATCH(pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const refresh = () => setShowMoreDot(hasUnreadMoreNavUpdates(pathname));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [pathname]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-border/50 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5">
          {MAIN_TABS.map((t) => {
            const active = t.match(pathname);
            const Icon = t.icon;
            return (
              <li key={t.to} className="flex">
                <Link
                  to={t.to}
                  className={cn(
                    "press focus-ring relative mx-auto flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition-colors duration-200",
                    active ? "text-[#8B5CF6]" : "text-muted-foreground hover:text-foreground/80",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                      active && "animate-pill bg-[#8B5CF6]/15 shadow-soft",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-transform duration-300",
                        active && "stroke-[2.4] scale-110",
                      )}
                    />
                  </span>
                  <span className="tracking-tight transition-opacity duration-200">{t.label}</span>
                </Link>
              </li>
            );
          })}

          <li className="flex">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "press focus-ring relative mx-auto flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition-colors duration-200",
                moreActive ? "text-[#8B5CF6]" : "text-muted-foreground hover:text-foreground/80",
              )}
              aria-current={moreActive ? "page" : undefined}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
            >
              <span
                className={cn(
                  "relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                  moreActive && "animate-pill bg-[#8B5CF6]/15 shadow-soft",
                )}
              >
                <Menu
                  className={cn(
                    "h-[18px] w-[18px] transition-transform duration-300",
                    moreActive && "stroke-[2.4] scale-110",
                  )}
                />
                {showMoreDot ? (
                  <span
                    className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[#8B5CF6] ring-2 ring-background"
                    aria-label="New updates available"
                  />
                ) : null}
              </span>
              <span className="tracking-tight transition-opacity duration-200">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreDrawer open={moreOpen} onOpenChange={setMoreOpen} items={moreItems} />
    </>
  );
}
