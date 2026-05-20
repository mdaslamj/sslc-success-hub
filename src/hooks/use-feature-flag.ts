import { useSyncExternalStore } from "react";
import {
  isFeatureEnabled,
  type FeatureFlag,
} from "@/lib/production/feature-flags";

const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith("aura:feature-flags")) {
      listeners.forEach((l) => l());
    }
  });
}

export function notifyFlagsChanged() {
  listeners.forEach((l) => l());
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => isFeatureEnabled(flag),
    () => false,
  );
}