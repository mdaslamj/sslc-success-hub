/**
 * Firestore services for the authenticated user's profile, settings and
 * aggregated stats. Doc id == auth uid for all three so reads are O(1)
 * and writes idempotent.
 */

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  UserProfileDoc,
  UserSettingsDoc,
  UserStatsDoc,
} from "../types";

// ---------- Profile ----------

export async function fetchUserProfile(uid: string): Promise<UserProfileDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USER_PROFILES, uid));
  return snap.exists() ? (snap.data() as UserProfileDoc) : null;
}

export async function upsertUserProfile(
  profile: UserProfileDoc,
): Promise<UserProfileDoc> {
  await setDoc(
    doc(db, COLLECTIONS.USER_PROFILES, profile.uid),
    { ...profile, updatedAt: Date.now() },
    { merge: true },
  );
  return profile;
}

export async function patchUserProfile(
  uid: string,
  patch: Partial<Omit<UserProfileDoc, "uid" | "createdAt">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USER_PROFILES, uid), {
    ...patch,
    updatedAt: Date.now(),
  });
}

// ---------- Settings ----------

export async function fetchUserSettings(uid: string): Promise<UserSettingsDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USER_SETTINGS, uid));
  return snap.exists() ? (snap.data() as UserSettingsDoc) : null;
}

export async function upsertUserSettings(
  settings: UserSettingsDoc,
): Promise<UserSettingsDoc> {
  await setDoc(
    doc(db, COLLECTIONS.USER_SETTINGS, settings.uid),
    { ...settings, updatedAt: Date.now() },
    { merge: true },
  );
  return settings;
}

// ---------- Stats ----------

export async function fetchUserStats(uid: string): Promise<UserStatsDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USER_STATS, uid));
  return snap.exists() ? (snap.data() as UserStatsDoc) : null;
}

export async function upsertUserStats(
  stats: UserStatsDoc,
): Promise<UserStatsDoc> {
  await setDoc(
    doc(db, COLLECTIONS.USER_STATS, stats.uid),
    { ...stats, updatedAt: Date.now() },
    { merge: true },
  );
  return stats;
}

// ---------- Defaults / bootstrap ----------

export function defaultUserProfile(input: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}): UserProfileDoc {
  const now = Date.now();
  const isSchoolAccount = input.email.endsWith("@aura.school");
  return {
    uid: input.uid,
    displayName: input.displayName || input.email.split("@")[0] || "Student",
    email: input.email,
    photoURL: input.photoURL ?? null,
    studentName: input.displayName || "",
    classLevel: "10",
    targetScore: 90,
    preferredLanguage: "en",
    weakSubjects: [],
    studyGoals: [],
    role: isSchoolAccount ? "school" : "student",
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultUserSettings(uid: string): UserSettingsDoc {
  return {
    uid,
    notifications: {
      revisionReminders: true,
      dailyDigest: true,
      achievementAlerts: true,
      plannerAlerts: true,
    },
    studyWindow: { dailyMinutesTarget: 90, preferredStartHour: 18 },
    reminders: { studyReminderTime: "18:00", revisionReminderTime: "20:30" },
    focusTimer: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      autoStartBreaks: false,
      soundEnabled: true,
    },
    aiAssistant: {
      enabled: true,
      tone: "friendly",
      dailyTips: true,
    },
    theme: "system",
    updatedAt: Date.now(),
  };
}

export function defaultUserStats(uid: string): UserStatsDoc {
  return {
    uid,
    totalXp: 0,
    studyMinutes: 0,
    quizzesTaken: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    longestStreak: 0,
    chaptersCompleted: 0,
    achievementsUnlocked: 0,
    lastActiveAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Idempotent: creates the three docs on first sign-in, leaves them alone after. */
export async function ensureUserDocuments(input: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<UserProfileDoc> {
  const existing = await fetchUserProfile(input.uid);
  if (existing) return existing;
  const profile = defaultUserProfile(input);
  await Promise.all([
    upsertUserProfile(profile),
    upsertUserSettings(defaultUserSettings(input.uid)),
    upsertUserStats(defaultUserStats(input.uid)),
  ]);
  return profile;
}