/**
 * Pure, rule-based AI recommendation engine. No React, no Firestore, no DOM.
 *
 * Each rule reads from a normalised `RecommendationContext` (analytics +
 * quiz stats + planner + revision queue) and returns zero or more
 * `RecommendationDoc`s. The orchestrator (`generateRecommendations`) merges,
 * scores, dedupes, and trims them.
 *
 * Architecture goals:
 *   - Deterministic and unit-testable today (no LLM dependency).
 *   - `source: "rule"` now; same shape works for `source: "ai" | "hybrid"`
 *     once the generative tutor / adaptive learning path engine lands.
 *   - Future modules (predictive scoring, AI doubt solving) plug in as new
 *     `Rule` functions without changing call sites.
 */

import type {
  AiInsightDoc,
  RecommendationDoc,
  RecommendationKind,
  RecommendationSource,
  RevisionScheduleDoc,
  StudySessionDoc,
} from "@/integrations/firebase/types";
import type { QuizAggregate } from "./quiz-engine";
import type { PlannerSubjectInput } from "./planner-engine";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export type RecommendationContext = {
  userId: string;
  /** Reference timestamp — defaults to now. */
  now?: number;
  subjects: PlannerSubjectInput[];
  sessions: Pick<StudySessionDoc, "subjectId" | "dayKey" | "durationMinutes" | "kind">[];
  revisions: RevisionScheduleDoc[];
  quiz: Pick<QuizAggregate, "attempts" | "averageScore" | "weakTopics" | "bySubject">;
  streak: { current: number; longest: number };
  /** Today's minutes already studied — drives focus-boost / consistency rules. */
  todayMinutes: number;
  /** Aggregate completion percent across all chapters. */
  overallCompletion: number;
};

export type GenerateOptions = {
  /** Cap on returned recommendations after scoring. */
  maxResults?: number;
  /** Default expiry window in ms (recs auto-expire so the queue stays fresh). */
  ttlMs?: number;
  /** Override source label (used by the AI/hybrid path later). */
  source?: RecommendationSource;
};

// ---------------------------------------------------------------------------
// Rule type
// ---------------------------------------------------------------------------

type DraftRec = Omit<RecommendationDoc, "id" | "userId" | "status" | "createdAt" | "source"> & {
  /** Stable target — used to build a deterministic doc id. */
  targetKey: string;
};

type Rule = (ctx: RecommendationContext) => DraftRec[];

// ---------------------------------------------------------------------------
// Individual rules
// ---------------------------------------------------------------------------

/** Surface the weakest subject's next chapter as the prime suggestion. */
const ruleNextChapter: Rule = (ctx) => {
  const candidates = ctx.subjects
    .filter((s) => s.nextChapter && s.completion < 100)
    .sort((a, b) => a.completion - b.completion);
  const pick = candidates[0];
  if (!pick || !pick.nextChapter) return [];
  const gap = 1 - pick.completion / 100;
  const score = clamp(40 + Math.round(gap * 40) + (pick.weakTopics.length > 0 ? 10 : 0), 0, 100);
  return [
    {
      kind: "next_chapter",
      title: `Start ${pick.nextChapter.title}`,
      body: `${pick.name} is your weakest subject — knock out the next chapter to lift completion.`,
      score,
      reasons: [
        `${Math.round(gap * 100)}% syllabus left`,
        `Subject completion ${pick.completion}%`,
      ],
      cta: {
        label: "Open subject",
        route: "/subjects/$subjectId",
        params: { subjectId: pick.id },
      },
      subjectId: pick.id,
      chapterId: pick.nextChapter.id,
      topic: pick.nextChapter.title,
      signals: { completion: pick.completion, weakTopics: pick.weakTopics.length },
      targetKey: `${pick.id}_${pick.nextChapter.id}`,
    },
  ];
};

/** One rec per overdue / due-today spaced-repetition card. */
const ruleRevisionDue: Rule = (ctx) => {
  const now = ctx.now ?? Date.now();
  const endOfDay = startOfDayMs(now) + 86_400_000 - 1;
  const due = ctx.revisions
    .filter((r) => r.dueAt <= endOfDay)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, 3);
  return due.map<DraftRec>((card) => {
    const overdueDays = Math.max(0, Math.round((now - card.dueAt) / 86_400_000));
    const score = clamp(55 + overdueDays * 5 + card.lapses * 4, 0, 100);
    const reasons: string[] = [];
    reasons.push(overdueDays > 0 ? `${overdueDays}d overdue` : "Due today");
    if (card.lapses > 0) reasons.push(`${card.lapses} lapse${card.lapses > 1 ? "s" : ""}`);
    return {
      kind: "revision_due",
      title: `Revise — ${card.chapterTitle ?? "Chapter"}`,
      body: "Spaced repetition keeps recall sharp. A quick pass now beats a long re-read later.",
      score,
      reasons,
      cta: { label: "Review", route: "/planner" },
      subjectId: card.subjectId,
      chapterId: card.chapterId,
      signals: { overdueDays, lapses: card.lapses },
      targetKey: card.id,
    };
  });
};

/** Alert on weak topics surfaced by quiz misses. */
const ruleWeakTopics: Rule = (ctx) => {
  return ctx.quiz.weakTopics.slice(0, 3).map<DraftRec>((w) => ({
    kind: "weak_topic",
    title: `Weak topic: ${w.topic}`,
    body: `${w.misses} miss${w.misses > 1 ? "es" : ""} on quizzes — revisit notes and retry.`,
    score: clamp(50 + w.misses * 6, 0, 100),
    reasons: [`${w.misses} quiz miss${w.misses > 1 ? "es" : ""}`],
    cta: { label: "Practice", route: "/quizzes" },
    topic: w.topic,
    signals: { misses: w.misses },
    targetKey: `topic_${slug(w.topic)}`,
  }));
};

/** Suggest a quiz when accuracy is mediocre or a subject has zero attempts. */
const ruleQuizSuggestion: Rule = (ctx) => {
  const recs: DraftRec[] = [];
  if (ctx.quiz.attempts > 0 && ctx.quiz.averageScore < 70) {
    recs.push({
      kind: "quiz_suggestion",
      title: "Lift your quiz accuracy",
      body: `Average accuracy is ${ctx.quiz.averageScore}%. A short practice quiz tightens weak spots.`,
      score: clamp(70 - ctx.quiz.averageScore + 40, 30, 90),
      reasons: [`Avg ${ctx.quiz.averageScore}%`],
      cta: { label: "Take a quiz", route: "/quizzes" },
      signals: { averageScore: ctx.quiz.averageScore },
      targetKey: "accuracy_lift",
    });
  }
  const neverQuizzed = ctx.subjects.find(
    (s) => s.completion >= 25 && !(ctx.quiz.bySubject?.[s.id] ?? 0),
  );
  if (neverQuizzed) {
    recs.push({
      kind: "quiz_suggestion",
      title: `Try a ${neverQuizzed.name} quiz`,
      body: "You have studied this subject but never tested yourself. A quick check builds confidence.",
      score: 55,
      reasons: ["No quiz attempts yet"],
      cta: { label: "Start quiz", route: "/quizzes" },
      subjectId: neverQuizzed.id,
      targetKey: `quiz_${neverQuizzed.id}`,
    });
  }
  return recs;
};

/** Focus-time / consistency nudges based on today + recent sessions. */
const ruleFocusBoost: Rule = (ctx) => {
  const recs: DraftRec[] = [];
  if (ctx.todayMinutes < 20) {
    recs.push({
      kind: "focus_boost",
      title: "Run a 25-min focus block",
      body: "Short, distraction-free blocks compound. Start a Pomodoro to build today's momentum.",
      score: ctx.todayMinutes === 0 ? 60 : 45,
      reasons: [`${ctx.todayMinutes} min today`],
      cta: { label: "Open timer", route: "/focus" },
      signals: { todayMinutes: ctx.todayMinutes },
      targetKey: "focus_today",
    });
  }
  if (ctx.streak.current === 0 && ctx.streak.longest >= 3) {
    recs.push({
      kind: "consistency",
      title: "Rebuild your streak",
      body: `Your best streak was ${ctx.streak.longest} days. A 15-min check-in restarts the chain.`,
      score: 50,
      reasons: [`Best streak ${ctx.streak.longest}d`],
      cta: { label: "Quick study", route: "/subjects" },
      targetKey: "rebuild_streak",
    });
  } else if (ctx.streak.current > 0 && ctx.todayMinutes === 0) {
    recs.push({
      kind: "streak_guard",
      title: `Protect your ${ctx.streak.current}-day streak`,
      body: "A 10-minute revision counts. Don't let today break the chain.",
      score: clamp(50 + ctx.streak.current * 2, 50, 85),
      reasons: ["Streak at risk"],
      cta: { label: "Open planner", route: "/planner" },
      targetKey: "streak_guard",
    });
  }
  return recs;
};

/** Subject-difficulty hint — large backlog + low completion = hard subject. */
const ruleSubjectDifficulty: Rule = (ctx) => {
  const struggling = ctx.subjects
    .filter((s) => s.completion < 40 && s.weakTopics.length >= 2)
    .sort((a, b) => a.completion - b.completion)
    .slice(0, 1);
  return struggling.map<DraftRec>((s) => ({
    kind: "subject_difficulty",
    title: `${s.name} needs steady work`,
    body: "Break it into 25-min blocks over the week — small, repeated passes beat marathon sessions.",
    score: clamp(45 + s.weakTopics.length * 4, 40, 80),
    reasons: [`${s.completion}% done`, `${s.weakTopics.length} weak topics`],
    cta: {
      label: "Open subject",
      route: "/subjects/$subjectId",
      params: { subjectId: s.id },
    },
    subjectId: s.id,
    signals: { completion: s.completion, weakTopics: s.weakTopics.length },
    targetKey: `difficulty_${s.id}`,
  }));
};

// Registry — append new rules here. Future generative-AI rules plug in the
// same way (they just produce DraftRecs with `source: "ai"` applied at the
// orchestrator level).
const RULES: Rule[] = [
  ruleNextChapter,
  ruleRevisionDue,
  ruleWeakTopics,
  ruleQuizSuggestion,
  ruleFocusBoost,
  ruleSubjectDifficulty,
];

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function generateRecommendations(
  ctx: RecommendationContext,
  opts: GenerateOptions = {},
): RecommendationDoc[] {
  const now = ctx.now ?? Date.now();
  const source: RecommendationSource = opts.source ?? "rule";
  const drafts: DraftRec[] = [];
  for (const rule of RULES) {
    try {
      drafts.push(...rule(ctx));
    } catch {
      // A misbehaving rule should never break the engine — drop silently.
    }
  }
  // Dedupe by (kind, targetKey) keeping the highest score.
  const dedup = new Map<string, DraftRec>();
  for (const d of drafts) {
    const k = `${d.kind}__${d.targetKey}`;
    const prev = dedup.get(k);
    if (!prev || prev.score < d.score) dedup.set(k, d);
  }
  const ordered = Array.from(dedup.values()).sort((a, b) => b.score - a.score);
  const limited = ordered.slice(0, opts.maxResults ?? 8);
  return limited.map<RecommendationDoc>((d) => ({
    id: `${ctx.userId}_${d.kind}_${d.targetKey}`,
    userId: ctx.userId,
    kind: d.kind,
    source,
    title: d.title,
    body: d.body,
    score: d.score,
    reasons: d.reasons,
    cta: d.cta,
    subjectId: d.subjectId,
    chapterId: d.chapterId,
    topic: d.topic,
    signals: d.signals,
    status: "active",
    createdAt: now,
    expiresAt: now + (opts.ttlMs ?? DEFAULT_TTL_MS),
    actedAt: null,
    dismissedAt: null,
  }));
}

// ---------------------------------------------------------------------------
// AI insights rollup
// ---------------------------------------------------------------------------

export function buildDailyInsight(args: {
  userId: string;
  dayKey: string;
  ctx: RecommendationContext;
  recommendations: RecommendationDoc[];
  now?: number;
}): AiInsightDoc {
  const { ctx, recommendations } = args;
  const now = args.now ?? Date.now();
  const overdue = ctx.revisions.filter((r) => r.dueAt < now).length;
  const weakSubjectCount = ctx.subjects.filter((s) => s.weakTopics.length > 0).length;

  const bullets: string[] = [];
  if (ctx.quiz.attempts > 0) bullets.push(`Quiz accuracy ${ctx.quiz.averageScore}%`);
  if (overdue > 0) bullets.push(`${overdue} revision card(s) overdue`);
  if (weakSubjectCount > 0) bullets.push(`${weakSubjectCount} subject(s) flagged weak`);
  if (ctx.streak.current > 0) bullets.push(`Streak ${ctx.streak.current}d (best ${ctx.streak.longest}d)`);
  bullets.push(`${ctx.todayMinutes} min studied today`);
  bullets.push(`${recommendations.length} recommendation(s) ready`);

  const headline = pickHeadline(ctx, overdue);
  const predictedScoreBand =
    ctx.quiz.attempts === 0
      ? undefined
      : ctx.quiz.averageScore >= 75
        ? "high"
        : ctx.quiz.averageScore >= 55
          ? "mid"
          : "low";

  return {
    id: `${args.userId}_d_${args.dayKey}`,
    userId: args.userId,
    periodKey: args.dayKey,
    scope: "daily",
    headline,
    bullets,
    metrics: {
      accuracy: ctx.quiz.averageScore,
      completionPercent: ctx.overallCompletion,
      studyMinutes: ctx.todayMinutes,
      focusSessions: ctx.sessions.filter((s) => s.kind === "focus").length,
      streak: ctx.streak.current,
      revisionBacklog: overdue,
      weakSubjectCount,
    },
    predictedScoreBand,
    source: "rule",
    createdAt: now,
    updatedAt: now,
  };
}

function pickHeadline(ctx: RecommendationContext, overdue: number): string {
  if (overdue >= 3) return "Revision backlog is growing — clear a few cards today.";
  if (ctx.quiz.attempts > 0 && ctx.quiz.averageScore < 55)
    return "Accuracy is dipping — target your weak topics with short practice quizzes.";
  if (ctx.todayMinutes === 0 && ctx.streak.current > 0)
    return `Protect your ${ctx.streak.current}-day streak with a quick session.`;
  if (ctx.overallCompletion >= 80) return "Great progress — switch focus to mock tests and timed quizzes.";
  return "Steady wins. Pick one weak topic and one new chapter to advance today.";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function startOfDayMs(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
}