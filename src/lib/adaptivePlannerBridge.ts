/**
 * Adaptive Planner Bridge — turns `adaptiveRevision` signals into a calm,
 * balanced daily plan shape the Planner UI can render directly.
 *
 * Pure, deterministic, local-only. No backend, no notifications, no
 * calendar/cron complexity. Designed so the planner can mix adaptive
 * suggestions with the user's own tasks without overwhelming them.
 *
 * Workload guardrails (intentionally conservative):
 *   - Daily Focus            → 1 chapter (the calmest highest-priority pick)
 *   - Suggested Revision     → up to 3 chapters
 *   - Recovery Chapters      → up to 2 chapters
 *   - Balanced Practice      → up to 2 focused sets
 *   - Total minutes capped   → ≤ 60 min of adaptive suggestions
 */

import {
  getRecoveryChapters,
  getRevisionSummary,
  getSuggestedPractice,
  getTodaysRevision,
  type PracticeSuggestion,
  type RevisionSuggestion,
} from "@/lib/adaptiveRevision";

export type AdaptivePlanItemKind =
  | "daily-focus"
  | "revision"
  | "recovery"
  | "practice";

export type AdaptivePlanItem = {
  id: string;
  kind: AdaptivePlanItemKind;
  /** Suggested subject label (subjectId — caller may map to display name). */
  subjectId: string;
  /** Chapter title for revision/recovery; topic for practice. */
  title: string;
  /** Calm one-line supportive copy. */
  message: string;
  /** Recommended block length in minutes (already balanced). */
  minutes: number;
  /** Optional secondary reason chips, max 2 for clarity. */
  reasons: string[];
  /** Practice payload — only populated when kind === "practice". */
  practice?: { chapterId: string; questionIds: string[] };
  /** Source chapter (revision/recovery). */
  chapterId?: string;
};

export type AdaptiveDailyPlan = {
  /** Single calm headline for the day. */
  message: string;
  /** The one "do-this-first" pick — may be null if there are no signals. */
  dailyFocus: AdaptivePlanItem | null;
  revision: AdaptivePlanItem[];
  recovery: AdaptivePlanItem[];
  practice: AdaptivePlanItem[];
  /** Total adaptive minutes after balancing. */
  totalMinutes: number;
  /** True when there are no signals yet (cold-start). */
  empty: boolean;
};

/** Hard caps — keep the daily load emotionally manageable. */
const CAPS = {
  revision: 3,
  recovery: 2,
  practice: 2,
  totalMinutes: 60,
} as const;

function calmHeadline(
  summary: ReturnType<typeof getRevisionSummary>,
  hasRecovery: boolean,
): string {
  if (summary.total === 0) {
    return "You’re maintaining steady progress — a short practice will unlock personalised guidance.";
  }
  if (hasRecovery) {
    return "Let’s revisit a few important chapters today.";
  }
  if (summary.high > 0 || summary.medium > 0) {
    return "A short revision session today may strengthen confidence.";
  }
  return "You’re maintaining steady progress.";
}

function fromRevision(
  s: RevisionSuggestion,
  kind: Extract<AdaptivePlanItemKind, "daily-focus" | "revision" | "recovery">,
): AdaptivePlanItem {
  return {
    id: `${kind}:${s.chapterId}`,
    kind,
    subjectId: s.subjectId,
    title: s.chapterTitle,
    message: s.message,
    minutes: s.suggestedMinutes,
    reasons: s.reasons.slice(0, 2),
    chapterId: s.chapterId,
  };
}

function fromPractice(p: PracticeSuggestion): AdaptivePlanItem {
  // Practice sets are intentionally short — 10 min keeps the day balanced.
  return {
    id: `practice:${p.chapterId}:${p.topic}`,
    kind: "practice",
    subjectId: p.subjectId,
    title: `${p.topic} — ${p.chapterTitle}`,
    message: p.reason,
    minutes: 10,
    reasons: [`${p.questionIds.length} question${p.questionIds.length === 1 ? "" : "s"}`],
    practice: { chapterId: p.chapterId, questionIds: p.questionIds.slice(0, 5) },
    chapterId: p.chapterId,
  };
}

/**
 * Build today's adaptive plan. Pure with respect to a given snapshot of
 * `localStorage` — safe to memoize per render.
 */
export function buildAdaptiveDailyPlan(opts?: {
  subjectId?: string;
}): AdaptiveDailyPlan {
  const summary = getRevisionSummary({ subjectId: opts?.subjectId });
  const todays = getTodaysRevision({ subjectId: opts?.subjectId, limit: 5 });
  const recoveryRaw = getRecoveryChapters({ subjectId: opts?.subjectId, limit: 4 });
  const practiceRaw = getSuggestedPractice({ subjectId: opts?.subjectId, limit: 4 });

  if (todays.length === 0 && recoveryRaw.length === 0 && practiceRaw.length === 0) {
    return {
      message: calmHeadline(summary, false),
      dailyFocus: null,
      revision: [],
      recovery: [],
      practice: [],
      totalMinutes: 0,
      empty: true,
    };
  }

  // De-dup: a chapter shown as recovery must not also appear in revision.
  const recoveryIds = new Set(recoveryRaw.slice(0, CAPS.recovery).map((r) => r.chapterId));
  const revisionPicks = todays
    .filter((r) => !recoveryIds.has(r.chapterId))
    .slice(0, CAPS.revision);

  // Daily Focus = first recovery if any, else top revision pick.
  const focusSource = recoveryRaw[0] ?? revisionPicks[0] ?? todays[0] ?? null;
  const dailyFocus = focusSource ? fromRevision(focusSource, "daily-focus") : null;

  // Drop the focus chapter from secondary lists to avoid duplicates.
  const focusId = focusSource?.chapterId;
  const revision = revisionPicks
    .filter((r) => r.chapterId !== focusId)
    .map((r) => fromRevision(r, "revision"));
  const recovery = recoveryRaw
    .slice(0, CAPS.recovery)
    .filter((r) => r.chapterId !== focusId)
    .map((r) => fromRevision(r, "recovery"));

  // Practice picks shouldn't pile onto chapters already in the lists.
  const usedChapters = new Set<string>(
    [dailyFocus, ...revision, ...recovery]
      .filter((x): x is AdaptivePlanItem => Boolean(x))
      .map((x) => x.chapterId ?? ""),
  );
  const practice = practiceRaw
    .filter((p) => !usedChapters.has(p.chapterId))
    .slice(0, CAPS.practice)
    .map(fromPractice);

  // Balance total minutes. If we exceed the cap, trim from the end of
  // the least-urgent buckets first (practice → recovery → revision).
  const order: AdaptivePlanItem[] = [
    ...(dailyFocus ? [dailyFocus] : []),
    ...revision,
    ...recovery,
    ...practice,
  ];
  let total = order.reduce((a, x) => a + x.minutes, 0);
  const trim = (list: AdaptivePlanItem[]) => {
    while (total > CAPS.totalMinutes && list.length > 0) {
      const dropped = list.pop()!;
      total -= dropped.minutes;
    }
  };
  trim(practice);
  trim(recovery);
  trim(revision);

  return {
    message: calmHeadline(summary, recovery.length > 0),
    dailyFocus,
    revision,
    recovery,
    practice,
    totalMinutes: total,
    empty: false,
  };
}
