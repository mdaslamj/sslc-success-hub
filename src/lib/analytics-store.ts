/**
 * Local-first analytics store. Mirrors the Firestore service interface so
 * call sites stay stable once Firebase Auth + server writes are switched on.
 *
 * Today: writes/reads localStorage. Tomorrow: same functions also fan out to
 * Firestore (study-sessions / achievements / user-progress / analytics).
 */

import type {
  AchievementDoc,
  StudySessionDoc,
  StreakDoc,
  UserAchievementDoc,
  UserProgressDoc,
} from "@/integrations/firebase/types";

const SESSIONS_KEY = "vidyapath.analytics.sessions.v1";
const ACHIEVEMENTS_KEY = "vidyapath.analytics.achievements.v1";
const PROGRESS_KEY = "vidyapath.analytics.userProgress.v1";
const USER_ACHIEVEMENTS_KEY = "vidyapath.gamification.userAchievements.v1";
const STREAKS_KEY = "vidyapath.gamification.streaks.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / SSR / private mode — silently drop */
  }
}

// ---------- Sessions ----------

export function readSessions(userId: string): StudySessionDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<StudySessionDoc[]>(localStorage.getItem(SESSIONS_KEY), []);
  return all.filter((s) => s.userId === userId);
}

export function appendSession(input: Omit<StudySessionDoc, "id">): StudySessionDoc {
  const session: StudySessionDoc = {
    ...input,
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  };
  if (typeof window !== "undefined") {
    const all = safeParse<StudySessionDoc[]>(localStorage.getItem(SESSIONS_KEY), []);
    all.push(session);
    // Cap to last 1000 to avoid unbounded growth.
    safeWrite(SESSIONS_KEY, all.slice(-1000));
  }
  return session;
}

// ---------- Achievements ----------

export function readAchievements(userId: string): AchievementDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<AchievementDoc[]>(localStorage.getItem(ACHIEVEMENTS_KEY), []);
  return all.filter((a) => a.userId === userId);
}

export function unlockAchievementLocal(
  input: Omit<AchievementDoc, "id" | "unlockedAt"> & { unlockedAt?: number },
): AchievementDoc {
  const ach: AchievementDoc = {
    ...input,
    id: `${input.userId}_${input.code}`,
    unlockedAt: input.unlockedAt ?? Date.now(),
  };
  if (typeof window !== "undefined") {
    const all = safeParse<AchievementDoc[]>(localStorage.getItem(ACHIEVEMENTS_KEY), []);
    const next = all.filter((a) => a.id !== ach.id).concat(ach);
    safeWrite(ACHIEVEMENTS_KEY, next);
  }
  return ach;
}

// ---------- User progress snapshot ----------

export function readUserProgress(userId: string): UserProgressDoc | null {
  if (typeof window === "undefined") return null;
  const all = safeParse<Record<string, UserProgressDoc>>(
    localStorage.getItem(PROGRESS_KEY),
    {},
  );
  return all[userId] ?? null;
}

export function writeUserProgress(doc: UserProgressDoc): UserProgressDoc {
  if (typeof window !== "undefined") {
    const all = safeParse<Record<string, UserProgressDoc>>(
      localStorage.getItem(PROGRESS_KEY),
      {},
    );
    all[doc.userId] = doc;
    safeWrite(PROGRESS_KEY, all);
  }
  return doc;
}

// ---------- User achievements (gamification unlocks) ----------

export function readUserAchievements(userId: string): UserAchievementDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<UserAchievementDoc[]>(
    localStorage.getItem(USER_ACHIEVEMENTS_KEY),
    [],
  );
  return all.filter((a) => a.userId === userId);
}

export function unlockUserAchievementLocal(
  input: Omit<UserAchievementDoc, "id" | "unlockedAt"> & { unlockedAt?: number },
): UserAchievementDoc {
  const ach: UserAchievementDoc = {
    ...input,
    id: `${input.userId}_${input.code}`,
    unlockedAt: input.unlockedAt ?? Date.now(),
  };
  if (typeof window !== "undefined") {
    const all = safeParse<UserAchievementDoc[]>(
      localStorage.getItem(USER_ACHIEVEMENTS_KEY),
      [],
    );
    // Idempotent: skip if already unlocked.
    if (all.some((a) => a.id === ach.id)) {
      return all.find((a) => a.id === ach.id)!;
    }
    safeWrite(USER_ACHIEVEMENTS_KEY, all.concat(ach));
  }
  return ach;
}

// ---------- Streaks ledger ----------

export function readStreak(userId: string): StreakDoc | null {
  if (typeof window === "undefined") return null;
  const all = safeParse<Record<string, StreakDoc>>(
    localStorage.getItem(STREAKS_KEY),
    {},
  );
  return all[userId] ?? null;
}

export function writeStreak(doc: StreakDoc): StreakDoc {
  if (typeof window !== "undefined") {
    const all = safeParse<Record<string, StreakDoc>>(
      localStorage.getItem(STREAKS_KEY),
      {},
    );
    all[doc.userId] = doc;
    safeWrite(STREAKS_KEY, all);
  }
  return doc;
}