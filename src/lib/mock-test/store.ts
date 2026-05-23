/**
 * Phase-1 Mock Test storage — localStorage only.
 *
 * Holds the active test definition (so the runner survives refresh) plus
 * a rolling list of completed attempts that powers the lightweight stats
 * shown on the selector page (latest score + overall accuracy).
 *
 * Intentionally tiny and dependency-free. Future phases can promote this
 * to Firestore by swapping the read/write helpers without touching the UI.
 */

import type { MockTest, MockTestKind, MockTestResult } from "./engine";

const TEST_KEY = (id: string) => `mt:test:${id}`;
const ATTEMPTS_KEY = "mt:attempts";
const MAX_ATTEMPTS = 50;

export type MockTestAttempt = {
  testId: string;
  kind: MockTestKind;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  title: string;
  endedAt: number;
  durationSeconds: number;
  result: MockTestResult;
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// ---- Active test cache ----------------------------------------------------

export function cacheTest(test: MockTest): void {
  safe(() => localStorage.setItem(TEST_KEY(test.id), JSON.stringify(test)), undefined);
}

export function readCachedTest(id: string): MockTest | null {
  return safe(() => {
    const v = localStorage.getItem(TEST_KEY(id));
    return v ? (JSON.parse(v) as MockTest) : null;
  }, null);
}

// ---- Attempts -------------------------------------------------------------

export function listAttempts(): MockTestAttempt[] {
  return safe(() => {
    const v = localStorage.getItem(ATTEMPTS_KEY);
    if (!v) return [] as MockTestAttempt[];
    const arr = JSON.parse(v) as MockTestAttempt[];
    return Array.isArray(arr) ? arr : [];
  }, [] as MockTestAttempt[]);
}

export function recordAttempt(a: MockTestAttempt): void {
  safe(() => {
    const all = [a, ...listAttempts()].slice(0, MAX_ATTEMPTS);
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  }, undefined);
}

export type MockTestStats = {
  totalAttempts: number;
  latestScorePct: number | null;
  avgAccuracyPct: number | null;
};

export function computeStats(attempts: MockTestAttempt[] = listAttempts()): MockTestStats {
  if (attempts.length === 0) {
    return { totalAttempts: 0, latestScorePct: null, avgAccuracyPct: null };
  }
  const latest = attempts[0];
  const avg = Math.round(
    attempts.reduce((s, x) => s + x.result.accuracyPct, 0) / attempts.length,
  );
  return {
    totalAttempts: attempts.length,
    latestScorePct: latest.result.scorePct,
    avgAccuracyPct: avg,
  };
}