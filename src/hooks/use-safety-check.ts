import { useCallback, useState } from "react";
import {
  checkAllPages,
  type SafetyCheckResult,
} from "@/lib/contentSafety";

export type { SafetyCheckResult };

export function useSafetyCheck() {
  const [safetyResult, setSafetyResult] = useState<SafetyCheckResult | null>(null);

  const checkAndProceed = useCallback((pages: string[], onSafe: () => void) => {
    const result = checkAllPages(pages);
    if (result.action === "proceed") {
      onSafe();
    } else {
      setSafetyResult(result);
    }
  }, []);

  const clearSafety = useCallback(() => {
    setSafetyResult(null);
  }, []);

  return { safetyResult, checkAndProceed, clearSafety };
}
