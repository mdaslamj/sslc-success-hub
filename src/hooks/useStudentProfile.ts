import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SessionType,
  StudentLearningProfile,
  Subject,
  Trend,
  PlannerOverrideEntry,
  DeferredPlannerTask,
} from "@/types/aura-engine-contracts";
import { appendSessionToProfile, type NewSessionInput } from "@/engines/sessionLogger";
import { queueOfflineWrite } from "@/lib/offlineQueue";

import seedProfile from "@/data/StudentLearningProfile.json";
import {
  DISPLAY_NAME_CHANGED_EVENT,
  migrateDemoProfileName,
  readGuestOnboardingName,
  resolveDisplayName,
  syncStudentDisplayName,
} from "@/lib/student-display-name";

export const PROFILE_STORAGE_KEY = "aura_profile";
export const PROFILE_VERSION_KEY = "aura_profile_version";
export const PROFILE_UPDATED_AT_KEY = "aura_profile_updated_at";
export const PROFILE_SCHEMA_VERSION = "2.0";
export const ACADEMIC_PROFILES_COLLECTION = "academic_profiles";

type MasteryReadingsMap = Record<string, number[]>;

type AcademicProfileDoc = {
  profile: AuraProfileStorage;
  updatedAt: string;
};

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

function ensureProfileVersion(storage: Storage): void {
  const version = storage.getItem(PROFILE_VERSION_KEY);
  if (version !== PROFILE_SCHEMA_VERSION) {
    storage.removeItem(PROFILE_STORAGE_KEY);
    storage.setItem(PROFILE_VERSION_KEY, PROFILE_SCHEMA_VERSION);
  }
}

export function readStoredProfile(): AuraProfileStorage | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    ensureProfileVersion(storage);
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuraProfileStorage) : null;
  } catch {
    return null;
  }
}

function readLocalUpdatedAt(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(PROFILE_UPDATED_AT_KEY);
}

export async function syncProfileToFirestore(
  stored: AuraProfileStorage,
  updatedAt: string,
): Promise<void> {
  try {
    const [{ doc, setDoc }, { auth, db }] = await Promise.all([
      import("firebase/firestore"),
      import("@/integrations/firebase/config"),
    ]);
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(
      doc(db, ACADEMIC_PROFILES_COLLECTION, user.uid),
      { profile: stored, updatedAt },
      { merge: true },
    );
  } catch {
    // Offline or rules mismatch — localStorage remains source of truth until retry.
  }
}

export async function readCloudProfile(
  userId: string,
): Promise<AcademicProfileDoc | null> {
  try {
    const [{ doc, getDoc }, { db }] = await Promise.all([
      import("firebase/firestore"),
      import("@/integrations/firebase/config"),
    ]);
    const snap = await getDoc(doc(db, ACADEMIC_PROFILES_COLLECTION, userId));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<AcademicProfileDoc>;
    if (!data.profile || !data.updatedAt) return null;
    return {
      profile: data.profile,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeStoredProfile(
  stored: AuraProfileStorage,
  options?: { updatedAt?: string; skipCloudSync?: boolean },
): void {
  const storage = getStorage();
  if (!storage) return;

  const updatedAt = options?.updatedAt ?? new Date().toISOString();

  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(stored));
    storage.setItem(PROFILE_VERSION_KEY, PROFILE_SCHEMA_VERSION);
    storage.setItem(PROFILE_UPDATED_AT_KEY, updatedAt);
    if (!options?.skipCloudSync) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        queueOfflineWrite({ type: "profile_sync", stored, updatedAt });
      } else {
        void syncProfileToFirestore(stored, updatedAt).catch(() => {
          queueOfflineWrite({ type: "profile_sync", stored, updatedAt });
        });
      }
    }
  } catch {
    // Never crash UI flows on storage failure.
  }
}

export function loadInitialProfileStorage(): AuraProfileStorage {
  const stored = readStoredProfile();
  if (stored) {
    const migrated = migrateDemoProfileName(stored);
    if (JSON.stringify(migrated) !== JSON.stringify(stored)) {
      writeStoredProfile(migrated);
    }
    return migrated;
  }

  const seed = loadSeedProfile();
  const resolvedName = resolveDisplayName({ guestName: readGuestOnboardingName() });
  const fresh = toProfileStorage(
    {
      ...seed,
      student: {
        ...seed.student,
        name: resolvedName,
      },
    },
    {},
  );
  writeStoredProfile(fresh);
  return fresh;
}

/** Cloud-first load for signed-in users; falls back to local/seed. */
export async function loadInitialProfileStorageAsync(
  userId: string | null = null,
): Promise<AuraProfileStorage> {
  const localStored = readStoredProfile();
  const localUpdatedAt = readLocalUpdatedAt();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (localStored) {
      return migrateDemoProfileName(localStored);
    }
    return loadInitialProfileStorage();
  }

  let resolvedUserId = userId;
  if (resolvedUserId == null) {
    try {
      const { auth } = await import("@/integrations/firebase/config");
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }
      resolvedUserId = auth.currentUser?.uid ?? null;
    } catch {
      resolvedUserId = null;
    }
  }

  if (resolvedUserId) {
    const cloud = await readCloudProfile(resolvedUserId);
    if (cloud) {
      const cloudNewer =
        !localUpdatedAt || cloud.updatedAt.localeCompare(localUpdatedAt) > 0;
      if (cloudNewer) {
        const migrated = migrateDemoProfileName(cloud.profile);
        writeStoredProfile(migrated, {
          updatedAt: cloud.updatedAt,
          skipCloudSync: true,
        });
        return migrated;
      }
    }

    if (localStored) {
      const migrated = migrateDemoProfileName(localStored);
      if (JSON.stringify(migrated) !== JSON.stringify(localStored)) {
        writeStoredProfile(migrated);
      } else if (!cloud) {
        void syncProfileToFirestore(migrated, localUpdatedAt ?? new Date().toISOString());
      }
      return migrated;
    }

    if (cloud) {
      const migrated = migrateDemoProfileName(cloud.profile);
      writeStoredProfile(migrated, {
        updatedAt: cloud.updatedAt,
        skipCloudSync: true,
      });
      return migrated;
    }
  }

  return loadInitialProfileStorage();
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

export type LogSessionParams = {
  subject: Subject;
  chapter: string;
  durationMinutes: number;
  questionsAttempted: number;
  questionsCorrect: number;
  hintsUsed: number;
  retriesOnWrong: number;
  completedPlan: boolean;
  panicSignal: boolean;
  engineType: SessionType;
};

export function logSessionOnStorage(
  stored: AuraProfileStorage,
  params: LogSessionParams,
): AuraProfileStorage {
  const { profile } = stripProfileStorage(stored);
  const score =
    params.questionsAttempted > 0
      ? Math.round((params.questionsCorrect / params.questionsAttempted) * 100)
      : 0;

  const current = profile.chapterMastery[params.subject]?.[params.chapter]?.mastery ?? 50;
  const newMastery = Math.min(100, Math.round(current * 0.7 + score * 0.3));

  const withSession = applyAppendSession(stored, {
    id: Date.now().toString(),
    date: new Date().toISOString().slice(0, 10),
    subject: params.subject,
    chapter: params.chapter,
    durationMinutes: params.durationMinutes,
    questionsAttempted: params.questionsAttempted,
    questionsCorrect: params.questionsCorrect,
    score,
    hintsUsed: params.hintsUsed,
    retriesOnWrong: params.retriesOnWrong,
    completedPlan: params.completedPlan,
    panicSignal: params.panicSignal,
    engineType: params.engineType,
  });

  return applyUpdateMastery(withSession, params.subject, params.chapter, newMastery);
}

function readLocalProfileOrSeed(): AuraProfileStorage {
  const stored = readStoredProfile();
  if (stored) {
    return migrateDemoProfileName(stored);
  }
  return loadInitialProfileStorage();
}

export function useStudentProfile() {
  const [stored, setStored] = useState<AuraProfileStorage>(() => readLocalProfileOrSeed());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const synced = await loadInitialProfileStorageAsync();
        if (cancelled) return;
        setStored((prev) => {
          const prevKey = JSON.stringify(prev);
          const nextKey = JSON.stringify(synced);
          if (prevKey === nextKey) return prev;
          return synced;
        });
      } catch {
        /* Firestore unavailable — cached profile is fine */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onNameChange = (event: Event) => {
      const name =
        (event as CustomEvent<string>).detail?.trim() ||
        resolveDisplayName({ guestName: readGuestOnboardingName() });
      setStored((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          student: { ...prev.student, name },
        };
        writeStoredProfile(next);
        return next;
      });
    };
    window.addEventListener(DISPLAY_NAME_CHANGED_EVENT, onNameChange);
    return () => window.removeEventListener(DISPLAY_NAME_CHANGED_EVENT, onNameChange);
  }, []);

  const profile = useMemo(
    () => (stored ? stripProfileStorage(stored).profile : loadSeedProfile()),
    [stored],
  );

  const persist = useCallback((next: AuraProfileStorage) => {
    setStored((prev) => {
      const prevKey = prev ? JSON.stringify(prev) : "";
      const nextKey = JSON.stringify(next);
      if (prevKey === nextKey) return prev;
      writeStoredProfile(next);
      return next;
    });
  }, []);

  const updateMastery = useCallback(
    (subject: Subject, chapter: string, newMastery: number) => {
      if (!stored) return;
      persist(applyUpdateMastery(stored, subject, chapter, newMastery));
    },
    [persist, stored],
  );

  const appendSession = useCallback(
    (session: NewSessionInput) => {
      if (!stored) return;
      persist(applyAppendSession(stored, session));
    },
    [persist, stored],
  );

  const updateProfile = useCallback(
    (patch: {
      student?: Partial<StudentLearningProfile["student"]>;
      subjectTargets?: Record<string, number>;
      overrideHistory?: PlannerOverrideEntry[];
      deferredTasks?: DeferredPlannerTask[];
    }) => {
      if (!stored) return;
      const { profile: current, masteryReadings } = stripProfileStorage(stored);
      persist(
        toProfileStorage(
          {
            ...current,
            student: patch.student
              ? { ...current.student, ...patch.student }
              : current.student,
            subjectTargets: patch.subjectTargets ?? current.subjectTargets,
            overrideHistory: patch.overrideHistory ?? current.overrideHistory,
            deferredTasks: patch.deferredTasks ?? current.deferredTasks,
          },
          masteryReadings,
        ),
      );
    },
    [persist, stored],
  );

  return {
    profile,
    isLoading,
    updateMastery,
    appendSession,
    updateProfile,
  };
}
