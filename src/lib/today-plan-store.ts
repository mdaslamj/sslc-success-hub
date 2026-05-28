/**
 * Tiny shim around the local-storage key that the `/planner` route uses
 * (`vidyapath.planner.v1`). Lets other parts of the app — currently the
 * Textbooks page — append a task to today's plan in one call.
 *
 * The shape MUST match the `Task` type in `src/routes/planner.tsx`.
 */

import type { RankedPlannerTask } from "@/lib/taskPriorityEngine";

export type LocalPlannerTask = RankedPlannerTask & {
  /** Optional external link (e.g. KTBS textbook PDF). */
  link?: string;
};

const STORAGE = "vidyapath.planner.v1";

export const PLANNER_STORE_UPDATED_EVENT = "aura:planner-store-updated";

export type PlannerStoreUpdatedDetail = {
  tasks: LocalPlannerTask[];
};

type Saved = {
  tasks?: LocalPlannerTask[];
  focusMinutes?: number;
};

function notifyPlannerStoreUpdated(tasks: LocalPlannerTask[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PlannerStoreUpdatedDetail>(PLANNER_STORE_UPDATED_EVENT, {
      detail: { tasks },
    }),
  );
}

function read(): Saved {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

function write(next: Saved): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next));
    if (next.tasks) {
      notifyPlannerStoreUpdated(next.tasks);
    }
  } catch {
    /* quota / private mode — silently drop */
  }
}

/** Is there already a task with this title in today's plan? */
export function hasTaskWithTitle(title: string): boolean {
  const tasks = read().tasks ?? [];
  const needle = title.trim().toLowerCase();
  return tasks.some((t) => t.task.trim().toLowerCase() === needle);
}

/**
 * Append a minimal task to today's plan. Returns `false` if a task with the
 * same title already exists (caller can show "already on plan" feedback).
 */
export function addToTodayPlan(input: {
  subject: string;
  task: string;
  durationMin: number;
  link?: string;
}): boolean {
  if (hasTaskWithTitle(input.task)) return false;
  const saved = read();
  const tasks = saved.tasks ?? [];
  const id = (tasks.reduce((m, t) => Math.max(m, t.id), 0) || 0) + 1;
  const next: LocalPlannerTask = {
    id,
    subject: input.subject,
    subjectId: "manual",
    task: input.task,
    title: input.task,
    time: `${input.durationMin} min`,
    durationMin: input.durationMin,
    done: false,
    whyText: "",
    subjectColor: "#6366f1",
    priorityScore: 0,
    chapter: {
      id: `manual-${id}`,
      title: input.task,
      subjectId: "manual",
      mastery: 50,
      subjectName: input.subject,
      whyText: "",
      priorityScore: 0,
    },
    link: input.link,
  };
  const updatedTasks = [...tasks, next];
  write({ ...saved, tasks: updatedTasks });
  return true;
}

/**
 * Append a ranked planner task (with chapter metadata) so completion in the
 * Study Planner can run `processPlannerTaskCompletion`.
 */
export function addRankedTaskToTodayPlan(task: RankedPlannerTask): boolean {
  if (hasTaskWithTitle(task.task)) return false;
  const saved = read();
  const tasks = saved.tasks ?? [];
  const id = (tasks.reduce((m, t) => Math.max(m, t.id), 0) || 0) + 1;
  const next: LocalPlannerTask = { ...task, id };
  const updatedTasks = [...tasks, next];
  write({ ...saved, tasks: updatedTasks });
  return true;
}
