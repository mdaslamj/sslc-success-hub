import type {
  DeferredPlannerTask,
  DeferredTaskSnapshot,
  PlannerOverrideEntry,
  StudentLearningProfile,
} from "@/types/aura-engine-contracts";
import {
  getSubjectStatus,
  rankChaptersForTodaySync,
  type RankedPlannerTask,
} from "@/lib/taskPriorityEngine";
import type { PlannerEngineChapter, PlannerEngineSubject } from "@/lib/taskPriorityEngine";

const WEEK_MS = 7 * 86_400_000;

export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function taskToDeferredSnapshot(task: RankedPlannerTask): DeferredTaskSnapshot {
  return {
    subject: task.subject,
    subjectId: task.subjectId,
    task: task.task,
    title: task.title,
    time: task.time,
    durationMin: task.durationMin,
    whyText: task.whyText,
    subjectColor: task.subjectColor,
    priorityScore: task.priorityScore,
    chapter: {
      id: task.chapter.id,
      title: task.chapter.title,
      subjectId: task.chapter.subjectId,
      mastery: task.chapter.mastery,
      blueprintMarks: task.chapter.blueprintMarks,
      difficulty: task.chapter.difficulty,
      subjectName: task.chapter.subjectName,
      whyText: task.chapter.whyText,
      priorityScore: task.chapter.priorityScore,
    },
  };
}

export function snapshotToRankedTask(
  snapshot: DeferredTaskSnapshot,
  id: number,
  options?: { carriedForward?: boolean },
): RankedPlannerTask {
  const prefix = options?.carriedForward ? "Carried forward — " : "";
  const baseTask = snapshot.task.replace(/^Carried forward — /, "");
  return {
    id,
    subject: snapshot.subject,
    subjectId: snapshot.subjectId,
    task: `${prefix}${baseTask}`,
    title: snapshot.title,
    time: snapshot.time,
    durationMin: snapshot.durationMin,
    done: false,
    whyText: snapshot.whyText,
    subjectColor: snapshot.subjectColor,
    priorityScore: snapshot.priorityScore,
    chapter: snapshot.chapter as PlannerEngineChapter & {
      subjectName: string;
      whyText: string;
      priorityScore: number;
    },
  };
}

export function findSwapReplacement(
  currentTasks: RankedPlannerTask[],
  chapters: PlannerEngineChapter[],
  subjects: PlannerEngineSubject[],
  excludeChapterId: string,
): RankedPlannerTask | null {
  const inList = new Set(currentTasks.map((t) => t.chapter.id));
  const ranked = rankChaptersForTodaySync(chapters, subjects, chapters.length);
  return (
    ranked.find((r) => !inList.has(r.chapter.id) && r.chapter.id !== excludeChapterId) ??
    null
  );
}

export function getChapterCriticalInfo(
  task: RankedPlannerTask,
  subjects: PlannerEngineSubject[],
): { critical: boolean; marksAtRisk: number; title: string } {
  const subj = subjects.find((s) => s.id === task.subjectId);
  const status = subj ? getSubjectStatus(subj.predicted, subj.target) : null;
  const marks = task.chapter.blueprintMarks ?? 4;
  const mastery = task.chapter.mastery ?? 50;
  const marksAtRisk = Math.round(marks * (1 - mastery / 100));
  const critical = status?.key === "critical" || mastery < 55;
  return {
    critical,
    marksAtRisk,
    title: task.chapter.title ?? task.title,
  };
}

export function countRecentOverrides(
  history: PlannerOverrideEntry[] | undefined,
  chapterId: string,
  type?: PlannerOverrideEntry["type"],
  withinDays = 7,
): number {
  const cutoff = Date.now() - withinDays * 86_400_000;
  return (history ?? []).filter((entry) => {
    if (entry.chapterId !== chapterId) return false;
    if (type && entry.type !== type) return false;
    const ts = new Date(`${entry.date}T12:00:00`).getTime();
    return ts >= cutoff;
  }).length;
}

export function appendOverrideEntry(
  profile: StudentLearningProfile,
  entry: Omit<PlannerOverrideEntry, "date"> & { date?: string },
): PlannerOverrideEntry[] {
  const next: PlannerOverrideEntry = {
    ...entry,
    date: entry.date ?? todayIso(),
  };
  return [...(profile.overrideHistory ?? []), next].slice(-100);
}

export function deferTaskSnapshot(
  profile: StudentLearningProfile,
  snapshot: DeferredTaskSnapshot,
  targetDate: string,
): DeferredPlannerTask[] {
  const withoutDuplicate = (profile.deferredTasks ?? []).filter(
    (d) => d.snapshot.chapter.id !== snapshot.chapter.id,
  );
  return [...withoutDuplicate, { targetDate, snapshot }];
}

export function getDueDeferredTasks(
  profile: StudentLearningProfile,
  asOfDate = todayIso(),
): DeferredPlannerTask[] {
  return (profile.deferredTasks ?? []).filter((d) => d.targetDate <= asOfDate);
}

export function consumeDeferredTasks(
  profile: StudentLearningProfile,
  consumedChapterIds: string[],
): DeferredPlannerTask[] {
  const consumed = new Set(consumedChapterIds);
  return (profile.deferredTasks ?? []).filter(
    (d) => !consumed.has(d.snapshot.chapter.id),
  );
}

export function detectAvoidancePattern(
  profile: StudentLearningProfile,
): { chapterId: string; chapterTitle: string; count: number } | null {
  const history = profile.overrideHistory ?? [];
  const cutoff = Date.now() - WEEK_MS;
  const counts = new Map<string, number>();

  for (const entry of history) {
    const ts = new Date(`${entry.date}T12:00:00`).getTime();
    if (ts < cutoff) continue;
    if (entry.type !== "swap" && entry.type !== "push") continue;
    counts.set(entry.chapterId, (counts.get(entry.chapterId) ?? 0) + 1);
  }

  for (const [chapterId, count] of counts) {
    if (count >= 3) {
      const deferred = profile.deferredTasks?.find((d) => d.snapshot.chapter.id === chapterId);
      const title =
        deferred?.snapshot.chapter.title ??
        deferred?.snapshot.title ??
        chapterId.replace(/-/g, " ");
      return { chapterId, chapterTitle: title, count };
    }
  }

  return null;
}

export function getAvoidanceCoachMessage(profile: StudentLearningProfile): string | null {
  const pattern = detectAvoidancePattern(profile);
  if (!pattern) return null;
  return `You have been avoiding ${pattern.chapterTitle}. Want to break it into 15-minute chunks?`;
}
