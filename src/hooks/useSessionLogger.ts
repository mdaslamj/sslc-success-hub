import { useCallback, useMemo, useState } from "react";
import type { SessionRecord, StudentLearningProfile } from "@/types/aura-engine-contracts";
import { computeAnalyticsFromSessions } from "@/engines/analytics";
import {
  appendSessionToProfile,
  type NewSessionInput,
} from "@/engines/sessionLogger";

import seedProfile from "@/data/StudentLearningProfile.json";

const PROFILE_STORAGE_KEY = "aura_student_learning_profile";

function readStoredProfile(): StudentLearningProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudentLearningProfile) : null;
  } catch {
    return null;
  }
}

function writeStoredProfile(profile: StudentLearningProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Never crash practice flow on storage failure.
  }
}

export function loadInitialProfile(): StudentLearningProfile {
  return readStoredProfile() ?? (seedProfile as StudentLearningProfile);
}

export function useSessionLogger(initialProfile?: StudentLearningProfile) {
  const [profile, setProfile] = useState<StudentLearningProfile>(
    () => initialProfile ?? loadInitialProfile(),
  );

  const analytics = useMemo(
    () => computeAnalyticsFromSessions(profile.sessionHistory),
    [profile.sessionHistory],
  );

  const logSession = useCallback((input: NewSessionInput): StudentLearningProfile => {
    let nextProfile: StudentLearningProfile | null = null;

    setProfile((current) => {
      nextProfile = appendSessionToProfile(current, input);
      writeStoredProfile(nextProfile);
      return nextProfile;
    });

    return nextProfile!;
  }, []);

  const resetProfile = useCallback((nextProfile?: StudentLearningProfile) => {
    const value = nextProfile ?? (seedProfile as StudentLearningProfile);
    setProfile(value);
    writeStoredProfile(value);
  }, []);

  return {
    profile,
    analytics,
    sessionHistory: profile.sessionHistory as SessionRecord[],
    logSession,
    resetProfile,
  };
}
