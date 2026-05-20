/**
 * Pure plan generator. Composes weakness, memory decay, revision queue,
 * board weightage and exam proximity into an ordered list of daily tasks.
 *
 * Stateless — callers fetch the upstream data (memoryTracking, revisionQueue,
 * subject masteries, exam date) and feed a snapshot in.
 */

import type { DailyTask, DailyTaskKind } from "@/integrations/firebase/types";

export type WeakSubjectSnapshot = {
  id: string;
  name: string;
  mastery: number; // 0..100
  weakTopic?: string;
};

export type RevisionSnapshot = {
  id: string;
  subjectId?: string;
  subject?: string;
  chapterId: string;
  chapterTitle: string;
  priority: number; // 0..100
  reason?: string;
  confidenceDecay?: number; // 0..1
  marksAtRisk?: number;
  lastMistake?: number | null;
};

export type GeneratorInput = {
  /** Local YYYY-MM-DD. */
  dayKey: string;
  /** Minutes the student committed in onboarding. */
  dailyGoalMinutes: number;
  /** Days until the board exam (>=0). Drives intensity. */
  daysToExam: number;
  weakSubjects: WeakSubjectSnapshot[];
  /** Revision-queue / memory-decay candidates, highest priority first. */
  revisionCandidates: RevisionSnapshot[];
  /** Optional formula-revision targets (math/science) due today. */
  formulaTargets?: Array<{ chapterId: string; subject: string; title: string }>;
  /** Whether to inject a recovery practice block (chapters with retentionBand="recovery"). */
  recoveryChapters?: Array<{ chapterId: string; subject: string; title: string }>;
};

function newTask(
  kind: DailyTaskKind,
  title: string,
  durationMin: number,
  priority: number,
  extras: Partial<DailyTask> = {},
): DailyTask {
  return {
    id: `${kind}_${Math.random().toString(36).slice(2, 10)}`,
    kind,
    title,
    durationMin,
    priority,
    ...extras,
  };
}

/**
 * Build today's plan. Allocates the student's daily budget across:
 *   - 1 high-impact focus block on weakest subject
 *   - top-priority revision cards (spaced repetition / memory decay)
 *   - 1 weak-topic drill
 *   - 1 formula recap (when due)
 *   - 1 recovery practice when retention is critical
 *   - reflection prompt at end of day
 *
 * Intensity scales up as exam proximity decreases.
 */
export function generateDailyPlan(input: GeneratorInput): DailyTask[] {
  const tasks: DailyTask[] = [];
  const budget = Math.max(20, input.dailyGoalMinutes);
  // Exam-proximity multiplier — more revision, less new content as exam nears.
  const proximity = input.daysToExam <= 14 ? 1.4 : input.daysToExam <= 45 ? 1.15 : 1;

  // 1. Focus block on weakest subject
  const weakest = [...input.weakSubjects].sort((a, b) => a.mastery - b.mastery)[0];
  if (weakest) {
    const focusMin = Math.min(45, Math.round(budget * 0.35));
    tasks.push(
      newTask(
        "focus",
        weakest.weakTopic
          ? `Deep focus: ${weakest.weakTopic}`
          : `Deep focus on ${weakest.name}`,
        focusMin,
        90,
        {
          subject: weakest.name,
          subjectId: weakest.id,
          reason: `Lowest mastery (${weakest.mastery}%) — highest marks-at-risk.`,
        },
      ),
    );
  }

  // 2. Revision cards from the queue (1–3 depending on budget)
  const revisionCount = Math.min(3, Math.max(1, Math.round((budget / 60) * proximity)));
  const revisions = input.revisionCandidates
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, revisionCount);
  for (const r of revisions) {
    const reason =
      r.lastMistake
        ? "Recent mistake — re-anchor this."
        : r.confidenceDecay && r.confidenceDecay > 0.4
          ? "Memory decay alert — refresh now."
          : r.marksAtRisk && r.marksAtRisk > 4
            ? `${r.marksAtRisk} marks at risk on this chapter.`
            : r.reason ?? "Spaced-repetition refresh.";
    tasks.push(
      newTask("revision", `Revise: ${r.chapterTitle}`, 15, Math.round(r.priority), {
        subject: r.subject,
        subjectId: r.subjectId,
        chapterId: r.chapterId,
        reason,
      }),
    );
  }

  // 3. Weak-topic drill (2nd weakest subject)
  const second = [...input.weakSubjects].sort((a, b) => a.mastery - b.mastery)[1];
  if (second) {
    tasks.push(
      newTask("weak_drill", `Weak-topic drill: ${second.name}`, 20, 70, {
        subject: second.name,
        subjectId: second.id,
        reason: `Mastery ${second.mastery}% — short drill closes the gap.`,
      }),
    );
  }

  // 4. Formula revision
  const f = input.formulaTargets?.[0];
  if (f) {
    tasks.push(
      newTask("formula", `Formula recap: ${f.title}`, 10, 60, {
        subject: f.subject,
        chapterId: f.chapterId,
        reason: "Due for formula refresh.",
      }),
    );
  }

  // 5. Recovery practice — only when something is critical
  const rec = input.recoveryChapters?.[0];
  if (rec) {
    tasks.push(
      newTask("recovery", `Recovery practice: ${rec.title}`, 20, 95, {
        subject: rec.subject,
        chapterId: rec.chapterId,
        reason: "Retention is critical — short recovery block.",
      }),
    );
  }

  // 6. End-of-day reflection prompt
  tasks.push(
    newTask("reflection", "Reflect: how did today feel?", 3, 30, {
      reason: "1-minute reflection sharpens tomorrow's plan.",
    }),
  );

  // Sort final order by priority desc but keep reflection last
  const reflection = tasks.pop()!;
  tasks.sort((a, b) => b.priority - a.priority);
  tasks.push(reflection);
  return tasks;
}

export function planTotalMinutes(tasks: DailyTask[]): number {
  return tasks.reduce((sum, t) => sum + t.durationMin, 0);
}

export function planCompletion(tasks: DailyTask[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}