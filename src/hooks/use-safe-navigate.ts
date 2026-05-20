import { useCallback } from "react";
import { useNavigate, type NavigateOptions } from "@tanstack/react-router";
import { toast } from "sonner";
import { logQADiagnostic, isLikelyKnownPath } from "@/lib/qa/diagnostics";

/**
 * Wraps router navigate with try/catch, dead-route detection, and toast fallback.
 * Always resolves so callers don't have to wrap every call site in their own catch.
 */
export function useSafeNavigate() {
  const navigate = useNavigate();

  return useCallback(
    async (opts: NavigateOptions, fallback: NavigateOptions = { to: "/" }) => {
      const target = typeof opts.to === "string" ? opts.to : undefined;
      if (target && !isLikelyKnownPath(target)) {
        logQADiagnostic("NAVIGATION_MISSING_ROUTE", { target });
      }
      try {
        await navigate(opts);
        return true;
      } catch (error) {
        logQADiagnostic("NAVIGATION_FAILED", { target, error: String(error) });
        toast.error("Couldn't open that page. Returning home.");
        try {
          await navigate(fallback);
        } catch (fallbackError) {
          logQADiagnostic("NAVIGATION_FAILED", {
            target: fallback.to,
            stage: "fallback",
            error: String(fallbackError),
          });
        }
        return false;
      }
    },
    [navigate],
  );
}

/**
 * Wraps an async action with loading + error reporting. Returns a tuple of
 * `[trigger, isPending]` for component-local pressed/loading state.
 */
export async function runSafeAction<T>(
  label: string,
  fn: () => Promise<T> | T,
  options: { silent?: boolean; toastMessage?: string } = {},
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    logQADiagnostic("ACTION_FAILED", { label, error: String(error) });
    if (!options.silent) {
      toast.error(options.toastMessage ?? "Something went wrong. Please try again.");
    }
    return undefined;
  }
}