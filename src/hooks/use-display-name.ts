import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthOptional } from "@/contexts/auth-context";
import {
  DISPLAY_NAME_CHANGED_EVENT,
  GUEST_ONBOARDING_KEY,
  readGuestOnboardingName,
  resolveDisplayName,
  syncStudentDisplayName,
} from "@/lib/student-display-name";

/**
 * Reactive display name for headers and dashboard chrome.
 * Reads auth profile first, then guest onboarding, then "Student".
 */
export function useDisplayName() {
  const auth = useAuthOptional();
  const [guestName, setGuestName] = useState(readGuestOnboardingName);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setGuestName(readGuestOnboardingName());
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const onNameChange = () => refresh();
    window.addEventListener(DISPLAY_NAME_CHANGED_EVENT, onNameChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_ONBOARDING_KEY || e.key === "aura_profile") {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(DISPLAY_NAME_CHANGED_EVENT, onNameChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const displayName = useMemo(
    () =>
      resolveDisplayName({
        authProfile: auth?.profile ?? null,
        firebaseUser: auth?.user ?? null,
        guestName,
      }),
    [auth?.profile, auth?.user, guestName, tick],
  );

  return { displayName, setDisplayName: syncStudentDisplayName, refresh };
}
