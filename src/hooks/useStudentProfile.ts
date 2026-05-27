import { useCallback, useMemo, useState } from "react";
import type {
  StudentLearningProfile,
  Subject,
  Trend,
} from "@/types/aura-engine-contracts";
import { appendSessionToProfile, type NewSessionInput } from "@/engines/sessionLogger";

import seedProfile from "@/data/StudentLearningProfile.json";

export const PROFILE_STORAGE_KEY = "aura_profile";

type MasteryReadingsMap = Record<string, number[]>;

export type AuraProfileStorage = StudentLearningProfile & {
  _masteryReadings?: MasteryReadingsMap;
};

function masteryKey(subject: Subject, chapter: string): string {
  return `${subject}:${chapter}`;
}

function clampMastery(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function deriveTrendFromReadings(previous: number[], next: number): Trend {
  const readings = previous.slice(-3);
  if (readings.length === 0) return "stable";

  const average = readings.reduce((sum, value) => sum + value, 0) / readings.length;
  if (next - average >= 3) return "improving";
  if (average - next >= 3) return "declining";
  return "stable";
}

export function stripProfileStorage(
  stored: AuraProfileStorage,
): { profile: StudentLearningProfile; masteryReadings: MasteryReadingsMap } {
  const { _masteryReadings, ...profile } = stored;
  return {
    profile: profile as StudentLearningProfile,
    masteryReadings: _masteryReadings ?? {},
  };
}

export function toProfileStorage(
  profile: StudentLearningProfile,
  masteryReadings: MasteryReadingsMap,
): AuraProfileStorage {
  return {
    ...profile,
    _masteryReadings: masteryReadings,
  };
}

export function loadSeedProfile(): StudentLearningProfile {
  return seedProfile as unknown as StudentLearningProfile;
}

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readStoredProfile(): AuraProfileStorage | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuraProfileStorage) : null;
  } catch {
    return null;
  }
}

export function writeStoredProfile(stored: AuraProfileStorage): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Never crash UI flows on storage failure.
  }
}

export function loadInitialProfileStorage(): AuraProfileStorage {
  return readStoredProfile() ?? toProfileStorage(loadSeedProfile(), {});
}

export function applyUpdateMastery(
  stored: AuraProfileStorage,
  subject: Subject,
  chapter: string,
  newMastery: number,
): AuraProfileStorage {
  const { profile, masteryReadings } = stripProfileStorage(stored);
  const key = masteryKey(subject, chapter);
  const existing = profile.chapterMastery[subject]?.[chapter];
  const previousReadings = masteryReadings[key] ?? (existing ? [existing.mastery] : []);
  const clamped = clampMastery(newMastery);
  const trend = deriveTrendFromReadings(previousReadings, clamped);
  const nextReadings = [...previousReadings, clamped].slice(-3);

  const subjectMastery = { ...(profile.chapterMastery[subject] ?? {}) };
  subjectMastery[chapter] = {
    mastery: clamped,
    trend,
    lastPracticed: new Date().toISOString().slice(0, 10),
    attemptCount: (existing?.attemptCount ?? 0) + 1,
  };

  return toProfileStorage(
    {
      ...profile,
      chapterMastery: {
        ...profile.chapterMastery,
        [subject]: subjectMastery,
      },
    },
    {
      ...masteryReadings,
      [key]: nextReadings,
    },
  );
}

export function applyAppendSession(
  stored: AuraProfileStorage,
  session: NewSessionInput,
): AuraProfileStorage {
  const { profile, masteryReadings } = stripProfileStorage(stored);
  const nextProfile = appendSessionToProfile(profile, session);

  const nextReadings = { ...masteryReadings };
  if (session.subject && session.chapter && session.questionsAttempted > 0) {
    const key = masteryKey(session.subject, session.chapter);
    const entry = nextProfile.chapterMastery[session.subject]?.[session.chapter];
    if (entry) {
      nextReadings[key] = [...(nextReadings[key] ?? []), entry.mastery].slice(-3);
    }
  }

  return toProfileStorage(nextProfile, nextReadings);
}

export function useStudentProfile() {
  const [stored, setStored] = useState<AuraProfileStorage>(() => loadInitialProfileStorage());

  const profile = useMemo(() => stripProfileStorage(stored).profile, [stored]);

  const persist = useCallback((next: AuraProfileStorage) => {
    setStored(next);
    writeStoredProfile(next);
  }, []);

  const updateMastery = useCallback(
    (subject: Subject, chapter: string, newMastery: number) => {
      persist(applyUpdateMastery(stored, subject, chapter, newMastery));
    },
    [persist, stored],
  );

  const appendSession = useCallback(
    (session: NewSessionInput) => {
      persist(applyAppendSession(stored, session));
    },
    [persist, stored],
  );

  return {
    profile,
    updateMastery,
    appendSession,
  };
}
