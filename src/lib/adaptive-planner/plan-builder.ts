import type {
  AdaptiveScheduleDoc,
  AdaptiveTask,
  DifficultyLevel,
  InterventionPlanDoc,
  InterventionTriggerKey,
  RemediationSessionDoc,
  RemediationSessionType,
  RevisionQueueDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";
import { difficultyForProfile, selectDifficulty } from "./difficulty";
import { scoreInterventionPriority, type PriorityInput } from "./priority";

/* ----------------------------- helpers ----------------------------- */

const DAY = 24 * 60 * 60 * 1000;

function dayKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function weekKey(ts = Date.now()): string {
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - start) / DAY + new Date(start).getUTCDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* --------------------------- intervention -------------------------- */

export type BuildInterventionInput = PriorityInput & {
  userId: string;
};

export function buildInterventionPlan(
  input: BuildInterventionInput,
): InterventionPlanDoc {
  const { userId, profile } = input;
  const { priorityScore, triggers, scoring } = scoreInterventionPriority(input);
  const now = Date.now();
  return {
    id: `${profile.chapterId}_${now}`,
    userId,
    chapterId: profile.chapterId,
    subjectId: profile.subjectId,
    priorityScore,
    triggers,
    scoring,
    difficultyLevel: difficultyForProfile(profile),
    status: triggers.length > 0 ? "active" : "pending",
    createdAt: now,
    updatedAt: now,
  };
}

/* ------------------------- remediation session ------------------------ */

function sessionTypeForTriggers(
  triggers: InterventionTriggerKey[],
  difficulty: DifficultyLevel,
): RemediationSessionType {
  if (triggers.includes("formulaMisuse")) return "formulaDrill";
  if (triggers.includes("boardPriorityWeak") || difficulty === "board") {
    return "boardPriorityPractice";
  }
  if (difficulty === "easier") return "recoveryPractice";
  return "targetedRevision";
}

export function buildRemediationSession(args: {
  userId: string;
  profile: WeaknessProfileDoc;
  triggers: InterventionTriggerKey[];
  scheduledAt?: number;
}): RemediationSessionDoc {
  const { userId, profile, triggers } = args;
  const difficulty = difficultyForProfile(profile);
  const type = sessionTypeForTriggers(triggers, difficulty);
  const now = Date.now();
  return {
    id: makeId(`rs_${profile.chapterId}`),
    userId,
    chapterId: profile.chapterId,
    subjectId: profile.subjectId,
    type,
    difficultyLevel: difficulty,
    estimatedMinutes: type === "formulaDrill" ? 15 : type === "recoveryPractice" ? 25 : 30,
    scheduledAt: args.scheduledAt ?? now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/* --------------------------- revision queue --------------------------- */

/**
 * Pick a re-surface date using SM-2-style spacing keyed on confidence.
 * Lower confidence → sooner; higher confidence → later.
 */
export function nextRevisionDate(confidence: number, now = Date.now()): number {
  const days =
    confidence < 40 ? 1 : confidence < 60 ? 2 : confidence < 75 ? 4 : confidence < 90 ? 7 : 14;
  return now + days * DAY;
}

export function buildRevisionQueueEntry(args: {
  userId: string;
  profile: WeaknessProfileDoc;
  priorityScore: number;
  reason?: InterventionTriggerKey;
}): RevisionQueueDoc {
  const { userId, profile, priorityScore, reason } = args;
  const now = Date.now();
  return {
    id: `rq_${profile.chapterId}`,
    userId,
    chapterId: profile.chapterId,
    subjectId: profile.subjectId,
    priority: priorityScore,
    scheduledDate: nextRevisionDate(profile.confidenceScore, now),
    status: "pending",
    reason,
    createdAt: now,
    updatedAt: now,
  };
}

/* --------------------------- adaptive schedule ------------------------- */

export type ChapterContext = {
  profile: WeaknessProfileDoc;
  chapterTitle?: string;
  boardWeight?: number;
  daysToExam?: number;
};

function taskFromContext(
  ctx: ChapterContext,
  priority: PriorityInput,
  difficulty: DifficultyLevel,
): AdaptiveTask {
  const { profile, chapterTitle = profile.chapterId } = ctx;
  const { triggers } = scoreInterventionPriority(priority);
  let kind: AdaptiveTask["kind"] = "targeted_revision";
  let title = `Practice: ${chapterTitle}`;
  let minutes = 25;
  if (triggers.includes("formulaMisuse")) {
    kind = "formula_drill";
    title = `Formula drill: ${chapterTitle}`;
    minutes = 15;
  } else if (difficulty === "easier") {
    kind = "recovery_practice";
    title = `Recovery practice: ${chapterTitle}`;
    minutes = 25;
  } else if (triggers.includes("boardPriorityWeak") || difficulty === "board") {
    kind = "board_priority_practice";
    title = `Board-priority: ${chapterTitle}`;
    minutes = 35;
  }

  return {
    id: makeId(`task_${profile.chapterId}`),
    chapterId: profile.chapterId,
    subjectId: profile.subjectId,
    kind,
    title,
    description: triggers.length
      ? `Triggers: ${triggers.join(", ")}`
      : undefined,
    difficultyLevel: difficulty,
    estimatedMinutes: minutes,
    priority: Math.max(1, Math.min(5, Math.round(profile.marksAtRisk))),
    route: `/subjects/math/${profile.chapterId}`,
    status: "pending",
  };
}

export type BuildScheduleInput = {
  userId: string;
  chapters: ChapterContext[];
  /** Soft caps. */
  dailyTaskBudget?: number;
  weeklyTaskBudget?: number;
  daysToExam?: number;
  now?: number;
};

/**
 * Produce a personalised adaptive schedule (daily + weekly tasks).
 * Chapters are ranked by intervention priority; the top N go to "today",
 * the rest fill the weekly view.
 */
export function buildAdaptiveSchedule(input: BuildScheduleInput): AdaptiveScheduleDoc {
  const {
    userId,
    chapters,
    dailyTaskBudget = 3,
    weeklyTaskBudget = 10,
    daysToExam,
    now = Date.now(),
  } = input;

  const ranked = chapters
    .map((c) => {
      const priorityInput: PriorityInput = {
        profile: c.profile,
        boardWeight: c.boardWeight,
        daysToExam: c.daysToExam ?? daysToExam,
      };
      const score = scoreInterventionPriority(priorityInput);
      const difficulty = selectDifficulty(c.profile.confidenceScore);
      return {
        ctx: c,
        priorityInput,
        score,
        difficulty,
        task: taskFromContext(c, priorityInput, difficulty),
      };
    })
    .sort((a, b) => b.score.priorityScore - a.score.priorityScore);

  const dailyTasks = ranked.slice(0, dailyTaskBudget).map((r) => r.task);
  const weeklyTasks = ranked
    .slice(dailyTaskBudget, dailyTaskBudget + weeklyTaskBudget)
    .map((r) => r.task);

  const focused = ranked.slice(0, Math.max(1, dailyTaskBudget));
  const avgConfidence =
    focused.length > 0
      ? +(
          focused.reduce((a, r) => a + r.ctx.profile.confidenceScore, 0) /
          focused.length
        ).toFixed(1)
      : 0;
  const dominantDifficulty = focused[0]?.difficulty ?? "medium";

  const dKey = dayKey(now);
  const wKey = weekKey(now);

  return {
    id: `${dKey}`,
    userId,
    dayKey: dKey,
    weekKey: wKey,
    dailyTasks,
    weeklyTasks,
    difficultyLevel: dominantDifficulty,
    confidenceScore: avgConfidence,
    createdAt: now,
    updatedAt: now,
  };
}