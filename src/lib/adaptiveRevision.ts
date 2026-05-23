/**
 * Adaptive Revision Engine — local-only, lightweight.
 *
 * Generates calm, intelligent daily revision suggestions from the signals
 * already captured by `weakAreaTracker`. No backend, no heavy analytics —
 * just pure functions over `localStorage`-backed entries so it can be reused
 * by the planner, dashboard, and future personalized mock flows.
 *
 * Public helpers:
 *   - getTodaysRevision(opts?)
 *   - getRecoveryChapters(opts?)
 *   - getRevisionPriority(chapterId)
 *   - getSuggestedPractice(opts?)
 *
 * Design notes:
 *   - All reads are derived; no new storage keys are introduced.
 *   - Output is deterministic for a given snapshot — safe for memoization.
 *   - Messaging is supportive (no failure / pressure wording).
 */

import {
  listChapterAccuracy,
  listConfidence,
  listWrongAnswers,
  type ChapterAccuracyEntry,
  type ConfidenceLevel,
  type WrongAnswerEntry,
} from "@/lib/weakAreaTracker";

export type RevisionPriority = "high" | "medium" | "low";

export type RevisionSuggestion = {
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  priority: RevisionPriority;
  confidence: ConfidenceLevel;
  accuracyPct: number;
  wrongCount: number;
  lastSeenAt: number;
  daysSinceSeen: number;
  reasons: string[];
  message: string;
  suggestedMinutes: number;
};

export type PracticeSuggestion = {
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  topic: string;
  questionIds: string[];
  reason: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 5;

function daysSince(ts: number, now: number): number {
  if (!ts) return Infinity;
  return Math.max(0, Math.floor((now - ts) / DAY_MS));
}

function confidenceOf(
  chapterId: string,
  confidences: Map<string, ConfidenceLevel>,
  accuracyPct: number,
): ConfidenceLevel {
  const c = confidences.get(chapterId);
  if (c) return c;
  if (accuracyPct >= 80) return "high";
  if (accuracyPct >= 50) return "medium";
  return "low";
}

function calmMessage(priority: RevisionPriority, confidence: ConfidenceLevel): string {
  if (priority === "high") {
    return confidence === "low"
      ? "A quick revision of this chapter may help strengthen confidence."
      : "A short revisit will help these ideas settle.";
  }
  if (priority === "medium") {
    return "It’s been a little while — a light review will keep this fresh.";
  }
  return "You’re improving steadily chapter by chapter.";
}

/** Internal: compute a richly-scored revision row for a chapter. */
function scoreChapter(
  ch: ChapterAccuracyEntry,
  wrongByChapter: Map<string, WrongAnswerEntry[]>,
  confidences: Map<string, ConfidenceLevel>,
  now: number,
): RevisionSuggestion {
  const wrongs = wrongByChapter.get(ch.chapterId) ?? [];
  const wrongCount = wrongs.length;
  const days = daysSince(ch.lastSeenAt, now);
  const conf = confidenceOf(ch.chapterId, confidences, ch.accuracyPct);
  const reasons: string[] = [];

  // Priority logic — intentionally lightweight.
  let priority: RevisionPriority = "low";
  const recentMiss = days <= 2 && ch.accuracyPct < 60;
  if (wrongCount >= 3) reasons.push(`${wrongCount} questions to revisit`);
  if (conf === "low") reasons.push("Confidence still building");
  if (recentMiss) reasons.push("Recently challenging");

  if (wrongCount >= 3 || conf === "low" || recentMiss) {
    priority = "high";
  } else if (days >= STALE_DAYS || conf === "medium") {
    priority = "medium";
    if (days >= STALE_DAYS) reasons.push(`Not revised in ${days}d`);
  } else {
    reasons.push("Consistently strong");
  }

  const suggestedMinutes =
    priority === "high" ? 20 : priority === "medium" ? 12 : 8;

  return {
    chapterId: ch.chapterId,
    chapterTitle: ch.chapterTitle,
    subjectId: ch.subjectId,
    priority,
    confidence: conf,
    accuracyPct: ch.accuracyPct,
    wrongCount,
    lastSeenAt: ch.lastSeenAt,
    daysSinceSeen: days === Infinity ? -1 : days,
    reasons,
    message: calmMessage(priority, conf),
    suggestedMinutes,
  };
}

/** Build per-chapter wrong-answer index once per call. */
function indexWrongs(wrongs: WrongAnswerEntry[]): Map<string, WrongAnswerEntry[]> {
  const m = new Map<string, WrongAnswerEntry[]>();
  for (const w of wrongs) {
    const arr = m.get(w.chapterId) ?? [];
    arr.push(w);
    m.set(w.chapterId, arr);
  }
  return m;
}

function indexConfidence(): Map<string, ConfidenceLevel> {
  return new Map(listConfidence().map((c) => [c.chapterId, c.level]));
}

/** All chapters scored & sorted by priority then accuracy ascending. */
function allScored(filter?: { subjectId?: string }): RevisionSuggestion[] {
  const now = Date.now();
  const chapters = listChapterAccuracy().filter(
    (c) => !filter?.subjectId || c.subjectId === filter.subjectId,
  );
  if (chapters.length === 0) return [];
  const wrongIdx = indexWrongs(
    listWrongAnswers().filter(
      (w) => !filter?.subjectId || w.subjectId === filter.subjectId,
    ),
  );
  const confIdx = indexConfidence();
  const rank: Record<RevisionPriority, number> = { high: 0, medium: 1, low: 2 };
  return chapters
    .map((c) => scoreChapter(c, wrongIdx, confIdx, now))
    .sort(
      (a, b) =>
        rank[a.priority] - rank[b.priority] ||
        a.accuracyPct - b.accuracyPct ||
        b.wrongCount - a.wrongCount,
    );
}

// ---- Public API ----------------------------------------------------------

/**
 * Today's revision picks — mix of high & medium priority chapters, deduped.
 * If there are no signals yet, returns an empty list (callers can show a
 * calm "nothing to revise yet" empty state).
 */
export function getTodaysRevision(opts?: {
  subjectId?: string;
  limit?: number;
}): RevisionSuggestion[] {
  const limit = Math.max(1, opts?.limit ?? 3);
  const scored = allScored({ subjectId: opts?.subjectId });
  if (scored.length === 0) return [];
  const picks = scored.filter((s) => s.priority !== "low").slice(0, limit);
  // Top up with the lowest-accuracy "low" chapter only if we have nothing.
  if (picks.length === 0) return scored.slice(0, 1);
  return picks;
}

/**
 * Chapters that need recovery — high-priority only, sorted by accuracy.
 */
export function getRecoveryChapters(opts?: {
  subjectId?: string;
  limit?: number;
}): RevisionSuggestion[] {
  const limit = Math.max(1, opts?.limit ?? 5);
  return allScored({ subjectId: opts?.subjectId })
    .filter((s) => s.priority === "high")
    .slice(0, limit);
}

/**
 * Priority label for a specific chapter. Returns "low" if unseen — keeps
 * downstream UI calm rather than alarmist on fresh chapters.
 */
export function getRevisionPriority(chapterId: string): RevisionPriority {
  const ch = listChapterAccuracy().find((c) => c.chapterId === chapterId);
  if (!ch) return "low";
  const wrongIdx = indexWrongs(listWrongAnswers());
  const confIdx = indexConfidence();
  return scoreChapter(ch, wrongIdx, confIdx, Date.now()).priority;
}

/**
 * Suggested practice topics — derived from recent wrong answers, grouped
 * by chapter + topic so callers can route students straight into a
 * focused practice flow (retry-wrong, chapter test, etc.).
 */
export function getSuggestedPractice(opts?: {
  subjectId?: string;
  limit?: number;
}): PracticeSuggestion[] {
  const limit = Math.max(1, opts?.limit ?? 5);
  const wrongs = listWrongAnswers().filter(
    (w) => !opts?.subjectId || w.subjectId === opts.subjectId,
  );
  if (wrongs.length === 0) return [];

  const grouped = new Map<string, PracticeSuggestion>();
  for (const w of wrongs) {
    const key = `${w.chapterId}::${w.topic || "general"}`;
    const existing = grouped.get(key);
    if (existing) {
      if (!existing.questionIds.includes(w.questionId)) {
        existing.questionIds.push(w.questionId);
      }
      continue;
    }
    grouped.set(key, {
      chapterId: w.chapterId,
      chapterTitle: w.chapterTitle,
      subjectId: w.subjectId,
      topic: w.topic || "Mixed practice",
      questionIds: [w.questionId],
      reason:
        "A short focused set will help these questions feel familiar again.",
    });
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.questionIds.length - a.questionIds.length)
    .slice(0, limit);
}

/** Tiny summary helper for dashboards / planner widgets. */
export function getRevisionSummary(opts?: { subjectId?: string }): {
  total: number;
  high: number;
  medium: number;
  low: number;
  message: string;
} {
  const scored = allScored({ subjectId: opts?.subjectId });
  const high = scored.filter((s) => s.priority === "high").length;
  const medium = scored.filter((s) => s.priority === "medium").length;
  const low = scored.filter((s) => s.priority === "low").length;
  const message =
    scored.length === 0
      ? "Attempt a quick practice to unlock personalised revision."
      : high > 0
      ? "A few chapters would love a gentle revisit today."
      : medium > 0
      ? "You’re on track — a light review will keep things fresh."
      : "You’re improving steadily chapter by chapter.";
  return { total: scored.length, high, medium, low, message };
}