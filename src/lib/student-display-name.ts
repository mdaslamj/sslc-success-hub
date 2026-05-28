/**
 * Single resolver for the student's display name across dashboard, profile,
 * planner, and engine UI. Auth profile is authoritative; guest onboarding is
 * the fallback for unauthenticated sessions.
 */

import {
  PROFILE_STORAGE_KEY,
  readStoredProfile,
  writeStoredProfile,
  type AuraProfileStorage,
} from "@/hooks/useStudentProfile";
import type { UserProfileDoc } from "@/integrations/firebase/types";
import type { User as FirebaseUser } from "firebase/auth";

export const GUEST_ONBOARDING_KEY = "aura.guest.onboarding.v1";
export const DISPLAY_NAME_CHANGED_EVENT = "aura:display-name-changed";

const DEMO_NAMES = new Set(["Arjun Kumar", "Arjun"]);

export type DisplayNameSources = {
  authProfile?: UserProfileDoc | null;
  firebaseUser?: FirebaseUser | null;
  guestName?: string | null;
};

export function readGuestOnboardingName(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(GUEST_ONBOARDING_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { name?: string };
    return typeof parsed.name === "string" ? parsed.name.trim() : "";
  } catch {
    return "";
  }
}

export function resolveDisplayName(sources: DisplayNameSources): string {
  const fromAuth =
    sources.authProfile?.studentName?.trim() ||
    sources.authProfile?.displayName?.trim() ||
    sources.firebaseUser?.displayName?.trim() ||
    "";
  if (fromAuth) return fromAuth;

  const guest = sources.guestName?.trim() || readGuestOnboardingName();
  if (guest) return guest;

  return "Student";
}

export function isDemoDisplayName(name: string | undefined | null): boolean {
  if (!name?.trim()) return false;
  return DEMO_NAMES.has(name.trim());
}

function patchStoredProfileName(stored: AuraProfileStorage, name: string): AuraProfileStorage {
  return {
    ...stored,
    student: {
      ...stored.student,
      name,
    },
  };
}

/** Persist display name into aura_profile and notify reactive hooks. */
export function syncStudentDisplayName(name: string): void {
  const trimmed = name.trim() || "Student";
  if (typeof window !== "undefined") {
    try {
      const guestRaw = localStorage.getItem(GUEST_ONBOARDING_KEY);
      if (guestRaw) {
        const parsed = JSON.parse(guestRaw) as Record<string, unknown>;
        localStorage.setItem(
          GUEST_ONBOARDING_KEY,
          JSON.stringify({ ...parsed, name: trimmed }),
        );
      }
    } catch {
      /* ignore guest patch failures */
    }
  }

  const stored = readStoredProfile();
  if (stored) {
    writeStoredProfile(patchStoredProfileName(stored, trimmed));
  } else if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuraProfileStorage;
        writeStoredProfile(patchStoredProfileName(parsed, trimmed));
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DISPLAY_NAME_CHANGED_EVENT, { detail: trimmed }));
  }
}

/** Strip legacy demo seed names from persisted learning profiles. */
export function migrateDemoProfileName(stored: AuraProfileStorage): AuraProfileStorage {
  const current = stored.student?.name?.trim() ?? "";
  if (!isDemoDisplayName(current)) return stored;

  const resolved = resolveDisplayName({
    guestName: readGuestOnboardingName(),
  });
  const nextName = resolved === "Student" ? "Student" : resolved;
  return patchStoredProfileName(stored, nextName);
}
