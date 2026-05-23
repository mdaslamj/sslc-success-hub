/**
 * Emotional Progress Layer — local-only, lightweight.
 *
 * Generates calm, supportive emotional reflections from existing learning
 * signals (weakAreaTracker, adaptiveRevision, mock exam attempts).
 *
 * No new storage keys. No streaks, rankings, or gamification. Just gentle
 * encouragement that helps students feel seen without pressure.
 *
 * Public helpers:
 *   - getEmotionalSummary()
 *   - getConsistencyReflection()
 *   - getConfidenceEncouragement()
 *   - getGentleProgressSummary()
 *   - getRecoveryEncouragement()
 */

import {
  listChapterAccuracy,
  listConfidence,
  listWrongAnswers,
} from "@/lib/weakAreaTracker";
import { getRevisionSummary } from "@/lib/adaptiveRevision";
import { listAttempts } from "@/lib/mock-test/store";

export type EmotionalSummary = {
  /** Overall one-line emotional headline. */
  headline: string;
  /** Consistency-focused reflection. */
  consistency: string;
  /** Confidence-building encouragement. */
  confidence: string;
  /** Gentle overall progress summary. */
  progress: string;
  /** Recovery-oriented encouragement (empty when no weak areas). */
  recovery: string;
  /** Short label for dashboard / card chips. */
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(ts: number): number {
  if (!ts) return Infinity;
  return Math.max(0, Math.floor((Date.now() - ts) / DAY_MS));
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// ---- Internal signal readers ---------------------------------------------

function readSignals() {
  const chapters = safe(listChapterAccuracy, []);
  const confidences = safe(listConfidence, []);
  const wrongs = safe(listWrongAnswers, []);
  const attempts = safe(listAttempts, []);
  const summary = safe(() => getRevisionSummary(), {
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    message: "",
  });
  return { chapters, confidences, wrongs, attempts, summary };
}

// ---- Consistency ---------------------------------------------------------

function consistencyTone(attempts: ReturnType<typeof listAttempts>): string {
  const count = attempts.length;
  const lastAt = attempts[0]?.endedAt ?? 0;
  const days = daysSince(lastAt);

  if (count === 0) {
    return "A single practice session is a meaningful beginning.";
  }
  if (days <= 1) {
    if (count >= 5) {
      return "You’re building a calm, steady rhythm. Consistency matters more than speed.";
    }
    return "You’re building steady progress — one session at a time.";
  }
  if (days <= 3) {
    return "A short session today will gently rebuild momentum.";
  }
  if (days <= 7) {
    return "It’s okay to pause. A light revision will help things feel familiar again.";
  }
  return "Every return is progress. Start with something small and kind.";
}

// ---- Confidence ----------------------------------------------------------

function confidenceTone(
  chapters: ReturnType<typeof listChapterAccuracy>,
  confidences: ReturnType<typeof listConfidence>,
): string {
  if (chapters.length === 0) {
    return "Each chapter you try is a step forward.";
  }

  const highConf = confidences.filter((c) => c.level === "high").length;
  const lowConf = confidences.filter((c) => c.level === "low").length;
  const avgAcc =
    chapters.length > 0
      ? Math.round(
          chapters.reduce((s, c) => s + c.accuracyPct, 0) / chapters.length,
        )
      : 0;

  if (avgAcc >= 75) {
    return "You’re growing more confident chapter by chapter — that’s the real win.";
  }
  if (highConf > lowConf) {
    return "Several chapters already feel comfortable. The others will too, with time.";
  }
  if (lowConf > 0) {
    return "Some chapters still feel tricky — that’s normal. A calm revisit is all it takes.";
  }
  return "You’re improving steadily chapter by chapter.";
}

// ---- Recovery ------------------------------------------------------------

function recoveryTone(
  summary: ReturnType<typeof getRevisionSummary>,
  wrongs: ReturnType<typeof listWrongAnswers>,
): string {
  if (summary.high === 0 && wrongs.length === 0) {
    return "";
  }
  if (summary.high > 0 && wrongs.length >= 5) {
    return "A few topics are asking for attention — not urgently, just gently.";
  }
  if (summary.high > 0) {
    return "One or two chapters would appreciate a calm revisit.";
  }
  if (wrongs.length > 0) {
    return "A quick look at earlier questions will help things settle.";
  }
  return "";
}

// ---- Progress ------------------------------------------------------------

function progressTone(
  chapters: ReturnType<typeof listChapterAccuracy>,
  attempts: ReturnType<typeof listAttempts>,
): string {
  const totalChapters = chapters.length;
  const totalAttempts = attempts.length;

  if (totalAttempts === 0 && totalChapters === 0) {
    return "Your journey starts with one small step.";
  }
  if (totalAttempts >= 3 && totalChapters >= 3) {
    return `You’ve explored ${totalChapters} chapter${totalChapters === 1 ? "" : "s"} across ${totalAttempts} attempt${totalAttempts === 1 ? "" : "s"}. That’s real growth.`;
  }
  if (totalAttempts > 0) {
    return `You’ve completed ${totalAttempts} practice attempt${totalAttempts === 1 ? "" : "s"}. Keep the rhythm gentle.`;
  }
  return `You’ve engaged with ${totalChapters} chapter${totalChapters === 1 ? "" : "s"}. Small steps lead to strong understanding.`;
}

// ---- Headline ------------------------------------------------------------

function headlineTone(
  summary: ReturnType<typeof getRevisionSummary>,
  attempts: ReturnType<typeof listAttempts>,
  daysSinceLast: number,
): string {
  if (attempts.length === 0) {
    return "Welcome — every expert was once a beginner.";
  }
  if (daysSinceLast <= 1) {
    if (summary.high > 0) {
      return "You’re showing up — that’s what counts most.";
    }
    return "You’re building steady progress.";
  }
  if (daysSinceLast <= 3) {
    return "A calm return today is worth more than a perfect streak.";
  }
  return "You’re building steady progress. Every session counts.";
}

// ---- Label ---------------------------------------------------------------

function labelTone(
  summary: ReturnType<typeof getRevisionSummary>,
  attempts: ReturnType<typeof listAttempts>,
): string {
  if (attempts.length === 0) return "New start";
  const lastAt = attempts[0]?.endedAt ?? 0;
  const days = daysSince(lastAt);
  if (days <= 1) {
    if (summary.high > 0) return "Growing";
    return "On track";
  }
  if (days <= 3) return "Re-energising";
  if (days <= 7) return "Welcomed back";
  return "Returning";
}

// ---- Public API ----------------------------------------------------------

export function getEmotionalSummary(): EmotionalSummary {
  const { chapters, confidences, wrongs, attempts, summary } = readSignals();
  const lastAt = attempts[0]?.endedAt ?? 0;
  const days = daysSince(lastAt);

  return {
    headline: headlineTone(summary, attempts, days),
    consistency: consistencyTone(attempts),
    confidence: confidenceTone(chapters, confidences),
    progress: progressTone(chapters, attempts),
    recovery: recoveryTone(summary, wrongs),
    label: labelTone(summary, attempts),
  };
}

export function getConsistencyReflection(): string {
  return consistencyTone(safe(listAttempts, []));
}

export function getConfidenceEncouragement(): string {
  return confidenceTone(safe(listChapterAccuracy, []), safe(listConfidence, []));
}

export function getGentleProgressSummary(): string {
  return progressTone(safe(listChapterAccuracy, []), safe(listAttempts, []));
}

export function getRecoveryEncouragement(): string {
  const summary = safe(() => getRevisionSummary(), {
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    message: "",
  });
  return recoveryTone(summary, safe(listWrongAnswers, []));
}
