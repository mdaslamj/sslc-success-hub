/**
 * Pure planner + spaced-repetition engine. No React, no Firestore, no DOM.
 *
 * Two responsibilities:
 *   1. `generateDailyPlan` — turn analytics + quiz stats + revision queue
 *      into a ranked list of `PlannerTaskDoc`s for a given day.
 *   2. `scheduleNextReview` — SM-2-derived spaced repetition update for a
 *      `RevisionScheduleDoc` after a review with a 0–5 quality rating.
 *
 * Everything dynamic (priority, block lengths, exam pressure, burnout guard)
 * lives here so the UI stays a thin renderer and future modes — AI planner,
 * adaptive schedule, predictive scoring — only need to extend these
 * functions, not their call sites.
 */

import { toDayKey } from "@/integrations/firebase/services/analytics";
import type {
  PlannerSource,
  PlannerTaskDoc,
  PlannerTaskKind,
  RevisionScheduleDoc,
  StudyPlanDoc,
  StudySessionDoc,
} from "@/integrations/firebase/types";
import type { QuizAggregate } from "./quiz-engine";
import { XP_REWARDS } from "./xp";

// ---------------------------------------------------------------------------
// Daily plan generation
// ---------------------------------------------------------------------------

export type PlannerSubjectInput = {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  completion: number;          // 0..100
  weakTopics: string[];
  chaptersDone: number;
  chaptersTotal: number;
  /** Optional first-incomplete chapter info — drives "next chapter" tasks. */
  nextChapter?: { id: string; title: string; estimatedMinutes?: number } | null;
};

export type PlannerExamInput = {
  id: string;
  subjectId?: string;
  name: string;
  /** Epoch ms of the exam start. */
  date: number;
};

export type PlannerInput = {
  userId: string;
  /** Local date the plan is for. Defaults to today. */
  date?: Date;
  subjects: PlannerSubjectInput[];
  sessions: Pick<StudySessionDoc, "subjectId" | "dayKey" | "durationMinutes">[];
  /** Most-recent revision cards (already filtered to this user). */
  revisions: RevisionScheduleDoc[];
  /** Aggregated quiz stats — drives accuracy-aware prioritisation. */
  quizStats?: Pick<QuizAggregate, "averageScore" | "weakTopics" | "bySubject">;
  streak: { current: number; longest: number };
  /** Total minutes the learner can dedicate today (user-configurable). */
  availableMinutes?: number;
  /** Upcoming exams — earliest one drives the exam-pressure multiplier. */
  exams?: PlannerExamInput[];
  /** Cap on tasks; engine trims lowest-priority extras to fit. */
  maxTasks?: number;
};

export type GeneratedPlan = {
  plan: Omit<StudyPlanDoc, "createdAt" | "updatedAt">;
  tasks: Omit<PlannerTaskDoc, "createdAt" | "completedAt">[];
};

/** Generate a deterministic daily plan from analytics + revision queue. */
export function generateDailyPlan(input: PlannerInput): GeneratedPlan {
  const date = input.date ?? new Date();
  const dayKey = toDayKey(date);
  const available = clamp(input.availableMinutes ?? defaultAvailable(input), 30, 8 * 60);
  const maxTasks = input.maxTasks ?? 6;

  const exam = pickNextExam(input.exams, date);
  const examDays = exam ? Math.max(0, Math.ceil((exam.date - date.getTime()) / 86_400_000)) : null;
  const examPressure = examPressureFactor(examDays);

  const avgAccuracy = input.quizStats?.averageScore ?? 0;

  // ---- 1. Build candidate tasks ----------------------------------------
  const candidates: Candidate[] = [];

  // (a) Spaced-repetition: every card whose dueAt <= end-of-today.
  const endOfDay = endOfDayMs(date);
  const overdueRevisions = input.revisions.filter((r) => r.dueAt <= endOfDay);
  for (const card of overdueRevisions) {
    const subj = input.subjects.find((s) => s.id === card.subjectId);
    const overdueDays = Math.max(0, Math.round((date.getTime() - card.dueAt) / 86_400_000));
    const reasons: string[] = [];
    if (overdueDays > 0) reasons.push(`${overdueDays}d overdue`);
    else reasons.push("Due today");
    if (card.lapses >= 2) reasons.push("Repeat lapse");
    candidates.push({
      kind: "revision",
      source: "revision",
      title: `Revise — ${card.chapterTitle ?? "Chapter"}`,
      subjectId: card.subjectId,
      chapterId: card.chapterId,
      topic: card.chapterTitle,
      durationMinutes: revisionBlockLength(card),
      basePriority: 60 + Math.min(30, overdueDays * 6) + card.lapses * 4,
      reasons,
      subjectName: subj?.name,
    });
  }

  // (b) Per-subject signals — weak topics, syllabus gaps, staleness.
  const minutesBySubject = aggregateMinutes(input.sessions, dayKey);
  for (const subj of input.subjects) {
    const minutes = minutesBySubject.recent.get(subj.id) ?? 0;
    const lastDay = minutesBySubject.lastDay.get(subj.id) ?? null;
    const daysSinceLast = lastDay ? daysBetween(lastDay, dayKey) : null;
    const quizCount = input.quizStats?.bySubject?.[subj.id] ?? 0;

    // Weak-topic task — only if the subject actually has weak topics.
    if (subj.weakTopics.length > 0) {
      const reasons = [
        `${subj.weakTopics.length} weak topic${subj.weakTopics.length > 1 ? "s" : ""}`,
      ];
      if (avgAccuracy > 0 && avgAccuracy < 60) reasons.push(`Quiz avg ${avgAccuracy}%`);
      candidates.push({
        kind: "study",
        source: "system",
        title: `Focus — ${subj.weakTopics[0]}`,
        subjectId: subj.id,
        topic: subj.weakTopics[0],
        durationMinutes: 30,
        basePriority: 55 + Math.min(20, subj.weakTopics.length * 6),
        reasons,
        subjectName: subj.name,
      });
    }

    // Next-chapter task — only if there is one left in the syllabus.
    if (subj.nextChapter && subj.completion < 100) {
      const gap = 1 - subj.completion / 100;
      const reasons = [
        `${Math.round(gap * 100)}% syllabus left`,
      ];
      if (daysSinceLast === null) reasons.push("Never studied");
      else if (daysSinceLast >= 3) reasons.push(`Stale ${daysSinceLast}d`);
      candidates.push({
        kind: "study",
        source: "system",
        title: `Next chapter — ${subj.nextChapter.title}`,
        subjectId: subj.id,
        chapterId: subj.nextChapter.id,
        topic: subj.nextChapter.title,
        durationMinutes: clamp(subj.nextChapter.estimatedMinutes ?? 35, 15, 60),
        basePriority: 40 + Math.round(gap * 30) + (daysSinceLast && daysSinceLast >= 3 ? 10 : 0),
        reasons,
        subjectName: subj.name,
      });
    }

    // Quiz task — surface when the subject hasn't been quizzed recently.
    if (quizCount === 0 && subj.completion >= 25) {
      candidates.push({
        kind: "quiz",
        source: "system",
        title: `Quiz check — ${subj.name}`,
        subjectId: subj.id,
        durationMinutes: 15,
        basePriority: 35,
        reasons: ["No quiz attempt yet"],
        subjectName: subj.name,
      });
    }

    // Time-balance nudge — long-neglected subject regardless of weakness.
    if (minutes === 0 && (daysSinceLast === null || daysSinceLast >= 4)) {
      candidates.push({
        kind: "study",
        source: "system",
        title: `Check in — ${subj.name}`,
        subjectId: subj.id,
        durationMinutes: 20,
        basePriority: 30,
        reasons: ["Under-allocated"],
        subjectName: subj.name,
      });
    }
  }

  // (c) Streak-saver focus block when nothing has been studied today.
  const studiedToday = input.sessions.some((s) => s.dayKey === dayKey);
  if (!studiedToday && input.streak.current > 0) {
    candidates.push({
      kind: "focus",
      source: "system",
      title: `Save your ${input.streak.current}-day streak`,
      durationMinutes: 25,
      basePriority: 50,
      reasons: ["Streak guard"],
    });
  }

  // ---- 2. Apply exam pressure + dedupe + rank --------------------------
  let ranked = candidates
    .map((c) => ({ ...c, priority: clamp(Math.round(c.basePriority * examPressure), 0, 100) }))
    .sort((a, b) => b.priority - a.priority);

  ranked = dedupeBySubjectKind(ranked);

  // ---- 3. Fit to available time (burnout guard) ------------------------
  const fitted: typeof ranked = [];
  let used = 0;
  for (const c of ranked) {
    if (fitted.length >= maxTasks) break;
    if (used + c.durationMinutes > available && fitted.length >= 2) continue;
    fitted.push(c);
    used += c.durationMinutes;
  }

  // ---- 4. Materialise tasks + plan doc ---------------------------------
  const planId = `${input.userId}_d_${dayKey}`;
  const tasks = fitted.map<Omit<PlannerTaskDoc, "createdAt" | "completedAt">>((c, i) => ({
    id: `${planId}_t${i}`,
    userId: input.userId,
    planId,
    dayKey,
    kind: c.kind,
    source: c.source,
    title: c.title,
    subjectId: c.subjectId,
    chapterId: c.chapterId,
    topic: c.topic,
    durationMinutes: c.durationMinutes,
    status: "pending",
    priority: c.priority,
    reasons: c.reasons,
    xp: estimateXp(c.kind, c.durationMinutes),
  }));

  const weakSubjectIds = input.subjects
    .filter((s) => s.weakTopics.length > 0)
    .map((s) => s.id);

  const rationale: string[] = [];
  if (overdueRevisions.length > 0) rationale.push(`${overdueRevisions.length} revision card(s) due`);
  if (weakSubjectIds.length > 0) rationale.push(`${weakSubjectIds.length} subject(s) flagged weak`);
  if (examDays !== null && examDays <= 14) rationale.push(`Exam in ${examDays}d — pressure x${examPressure.toFixed(2)}`);
  if (!studiedToday && input.streak.current > 0) rationale.push(`Streak guard active (${input.streak.current}d)`);
  if (avgAccuracy > 0 && avgAccuracy < 60) rationale.push(`Quiz accuracy ${avgAccuracy}% — needs lift`);

  return {
    plan: {
      id: planId,
      userId: input.userId,
      scope: "daily",
      periodKey: dayKey,
      targetMinutes: used,
      doneMinutes: 0,
      taskIds: tasks.map((t) => t.id),
      rationale,
      signals: {
        weakSubjectIds,
        overdueRevisions: overdueRevisions.length,
        streak: input.streak.current,
        averageQuizAccuracy: avgAccuracy,
        availableMinutes: available,
        examCountdownDays: examDays,
      },
      source: "system",
    },
    tasks,
  };
}

// ---------------------------------------------------------------------------
// Spaced repetition (SM-2 derivative)
// ---------------------------------------------------------------------------

/** Quality is 0..5 — 0 = forgot, 3 = correct with effort, 5 = perfect recall. */
export function scheduleNextReview(
  card: Pick<RevisionScheduleDoc, "reps" | "ease" | "intervalDays" | "lapses">,
  quality: number,
  now: number = Date.now(),
): Pick<RevisionScheduleDoc, "reps" | "ease" | "intervalDays" | "dueAt" | "lastReviewedAt" | "lastQuality" | "lapses"> {
  const q = clamp(Math.round(quality), 0, 5);

  // Failed recall — reset reps, log lapse, surface again in ~10 minutes.
  if (q < 3) {
    return {
      reps: 0,
      ease: clamp(card.ease - 0.2, 1.3, 3.0),
      intervalDays: 0,
      dueAt: now + 10 * 60 * 1000,
      lastReviewedAt: now,
      lastQuality: q,
      lapses: card.lapses + 1,
    };
  }

  // SM-2 ease update.
  const ease = clamp(card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), 1.3, 3.0);
  const reps = card.reps + 1;
  let intervalDays: number;
  if (reps === 1) intervalDays = 1;
  else if (reps === 2) intervalDays = 3;
  else intervalDays = Math.round(card.intervalDays * ease);
  intervalDays = clamp(intervalDays, 1, 180);

  return {
    reps,
    ease,
    intervalDays,
    dueAt: now + intervalDays * 86_400_000,
    lastReviewedAt: now,
    lastQuality: q,
    lapses: card.lapses,
  };
}

/** Seed a brand-new card for a chapter the learner just completed. */
export function seedRevisionCard(args: {
  userId: string;
  subjectId: string;
  chapterId: string;
  chapterTitle?: string;
  now?: number;
}): RevisionScheduleDoc {
  const now = args.now ?? Date.now();
  return {
    id: `${args.userId}_${args.chapterId}`,
    userId: args.userId,
    subjectId: args.subjectId,
    chapterId: args.chapterId,
    chapterTitle: args.chapterTitle,
    reps: 0,
    ease: 2.5,
    intervalDays: 1,
    dueAt: now + 86_400_000, // first revisit tomorrow
    lastReviewedAt: null,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Tasks list view — split into "today" vs "upcoming" vs "overdue". */
export function bucketRevisions(
  cards: RevisionScheduleDoc[],
  now: number = Date.now(),
): { overdue: RevisionScheduleDoc[]; today: RevisionScheduleDoc[]; upcoming: RevisionScheduleDoc[] } {
  const startOfTomorrow = startOfDayMs(new Date(now)) + 86_400_000;
  const overdue: RevisionScheduleDoc[] = [];
  const today: RevisionScheduleDoc[] = [];
  const upcoming: RevisionScheduleDoc[] = [];
  for (const c of cards) {
    if (c.dueAt < startOfDayMs(new Date(now))) overdue.push(c);
    else if (c.dueAt < startOfTomorrow) today.push(c);
    else upcoming.push(c);
  }
  const byDue = (a: RevisionScheduleDoc, b: RevisionScheduleDoc) => a.dueAt - b.dueAt;
  return { overdue: overdue.sort(byDue), today: today.sort(byDue), upcoming: upcoming.sort(byDue) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Candidate = {
  kind: PlannerTaskKind;
  source: PlannerSource;
  title: string;
  subjectId?: string;
  chapterId?: string;
  topic?: string;
  durationMinutes: number;
  basePriority: number;
  reasons?: string[];
  subjectName?: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function startOfDayMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDayMs(d: Date): number {
  return startOfDayMs(d) + 86_400_000 - 1;
}

function aggregateMinutes(
  sessions: PlannerInput["sessions"],
  todayKey: string,
  lookbackDays = 7,
) {
  const recent = new Map<string, number>();
  const lastDay = new Map<string, string>();
  for (const s of sessions) {
    if (!s.subjectId) continue;
    const dist = daysBetween(s.dayKey, todayKey);
    if (dist < 0 || dist > lookbackDays) continue;
    recent.set(s.subjectId, (recent.get(s.subjectId) ?? 0) + (s.durationMinutes ?? 0));
    const cur = lastDay.get(s.subjectId);
    if (!cur || s.dayKey > cur) lastDay.set(s.subjectId, s.dayKey);
  }
  return { recent, lastDay };
}

function defaultAvailable(input: PlannerInput): number {
  // Heuristic: 90 minutes baseline, + 15 per active streak day (cap 180).
  return clamp(90 + input.streak.current * 15, 60, 180);
}

function pickNextExam(exams: PlannerExamInput[] | undefined, now: Date): PlannerExamInput | null {
  if (!exams || exams.length === 0) return null;
  const upcoming = exams.filter((e) => e.date >= now.getTime()).sort((a, b) => a.date - b.date);
  return upcoming[0] ?? null;
}

function examPressureFactor(daysToExam: number | null): number {
  if (daysToExam === null) return 1;
  if (daysToExam <= 3) return 1.6;
  if (daysToExam <= 7) return 1.4;
  if (daysToExam <= 14) return 1.2;
  if (daysToExam <= 30) return 1.1;
  return 1;
}

function revisionBlockLength(card: RevisionScheduleDoc): number {
  if (card.lapses >= 3) return 30;
  if (card.reps <= 1) return 25;
  return 20;
}

function dedupeBySubjectKind<T extends Candidate & { priority: number }>(
  list: T[],
): T[] {
  const seen = new Map<string, T>();
  for (const c of list) {
    const key = `${c.subjectId ?? "_"}_${c.kind}`;
    const prev = seen.get(key);
    if (!prev || prev.priority < c.priority) seen.set(key, c);
  }
  return Array.from(seen.values()).sort((a, b) => b.priority - a.priority);
}

function estimateXp(kind: PlannerTaskKind, minutes: number): number {
  const base = Math.round(minutes / 5) * XP_REWARDS.focusFiveMinutes;
  if (kind === "revision") return base + 5;
  if (kind === "quiz") return base + XP_REWARDS.quizCompleted;
  return base;
}