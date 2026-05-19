import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { AnalyticsDailyDoc, StudySessionDoc } from "../types";

const dailyId = (userId: string, dayKey: string) => `${userId}_${dayKey}`;

/** Local YYYY-MM-DD key for a date. */
export function toDayKey(d: Date | number): string {
  const dt = typeof d === "number" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function upsertDailyAnalytics(
  input: Omit<AnalyticsDailyDoc, "id" | "updatedAt"> & { updatedAt?: number },
): Promise<AnalyticsDailyDoc> {
  const id = dailyId(input.userId, input.dayKey);
  const payload: Omit<AnalyticsDailyDoc, "id"> = {
    ...input,
    updatedAt: input.updatedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.ANALYTICS, id), payload, { merge: true });
  return { id, ...payload };
}

export async function fetchDailyAnalytics(
  userId: string,
  fromDayKey: string,
): Promise<AnalyticsDailyDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.ANALYTICS),
    where("userId", "==", userId),
    where("dayKey", ">=", fromDayKey),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AnalyticsDailyDoc, "id">) }));
}

// ---------------------------------------------------------------------------
// Pure analytics calculations — no I/O. Re-usable in hooks, server fns, tests.
// ---------------------------------------------------------------------------

/** Sum study minutes from raw sessions. */
export function sumStudyMinutes(sessions: Pick<StudySessionDoc, "durationMinutes">[]): number {
  return sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
}

/** Count completed focus sessions. */
export function countFocusSessions(sessions: Pick<StudySessionDoc, "kind">[]): number {
  return sessions.filter((s) => s.kind === "focus").length;
}

/** Group total minutes per day (returns sorted oldest→newest). */
export function groupMinutesByDay(
  sessions: Pick<StudySessionDoc, "dayKey" | "durationMinutes">[],
): { dayKey: string; minutes: number }[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    map.set(s.dayKey, (map.get(s.dayKey) ?? 0) + (s.durationMinutes ?? 0));
  }
  return Array.from(map.entries())
    .map(([dayKey, minutes]) => ({ dayKey, minutes }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/**
 * Compute current consecutive-day streak ending today (or yesterday if user
 * hasn't studied yet today). A "study day" = any session that day.
 */
export function computeStreak(
  sessions: Pick<StudySessionDoc, "dayKey">[],
  today: Date = new Date(),
): { current: number; longest: number } {
  const days = new Set(sessions.map((s) => s.dayKey));
  if (days.size === 0) return { current: 0, longest: 0 };

  // Longest streak — scan sorted unique days.
  const sorted = Array.from(days).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak — walk backwards from today.
  const todayKey = toDayKey(today);
  let cursor = new Date(today);
  let current = 0;
  if (!days.has(todayKey)) {
    // grace: if no study today, start from yesterday
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(toDayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest: Math.max(longest, current) };
}

/** Build a 7-day window (oldest→newest) of minutes for charting. */
export function buildWeeklyActivity(
  sessions: Pick<StudySessionDoc, "dayKey" | "durationMinutes">[],
  today: Date = new Date(),
): { dayKey: string; label: string; minutes: number }[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + s.durationMinutes);
  }
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const out: { dayKey: string; label: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDayKey(d);
    out.push({ dayKey: key, label: labels[d.getDay()], minutes: byDay.get(key) ?? 0 });
  }
  return out;
}