/**
 * Consistency — a calm, non-gamified replacement for "streak".
 *
 * Derived from the same `StudySessionDoc[]` the analytics hook already
 * loads. No new storage, no day-counter that resets, no fire emoji. The
 * score is simply how many of the last 14 days had any study activity at
 * all — a steady rhythm signal, not a punishment loop.
 */

import type { StudySessionDoc } from "@/integrations/firebase/types";
import { toDayKey } from "@/integrations/firebase/services/analytics";

export type ConsistencyLabel =
  | "Settling in"
  | "Steady"
  | "In rhythm"
  | "Deeply consistent";

export type Consistency = {
  /** 0..100 — share of the last 14 days that had any study activity. */
  score: number;
  daysActiveLast14: number;
  daysActiveLast7: number;
  windowDays: 14;
  label: ConsistencyLabel;
  /** Short, calm message — never punitive. */
  message: string;
};

const CALM_MESSAGES: Record<ConsistencyLabel, string> = {
  "Settling in": "A calm return today is enough.",
  Steady: "Quiet, steady days build understanding.",
  "In rhythm": "You're moving with a gentle rhythm.",
  "Deeply consistent": "A deeply steady practice — keep it kind.",
};

function labelFor(daysActiveLast14: number): ConsistencyLabel {
  if (daysActiveLast14 >= 12) return "Deeply consistent";
  if (daysActiveLast14 >= 8) return "In rhythm";
  if (daysActiveLast14 >= 4) return "Steady";
  return "Settling in";
}

export function computeConsistency(
  sessions: Pick<StudySessionDoc, "dayKey">[],
  today: Date = new Date(),
): Consistency {
  const active = new Set(sessions.map((s) => s.dayKey));

  let last14 = 0;
  let last7 = 0;
  const cursor = new Date(today);
  for (let i = 0; i < 14; i++) {
    const key = toDayKey(cursor);
    if (active.has(key)) {
      last14 += 1;
      if (i < 7) last7 += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const score = Math.round((last14 / 14) * 100);
  const label = labelFor(last14);
  return {
    score,
    daysActiveLast14: last14,
    daysActiveLast7: last7,
    windowDays: 14,
    label,
    message: CALM_MESSAGES[label],
  };
}