import { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Soft fade-up wrapper that replays each time the pathname changes,
 * giving the app a native screen-transition feel without a heavy
 * animation library.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}