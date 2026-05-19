/**
 * Tiny shim around the local-storage key that the `/planner` route uses
 * (`vidyapath.planner.v1`). Lets other parts of the app — currently the
 * Textbooks page — append a task to today's plan in one call.
 *
 * The shape MUST match the `Task` type in `src/routes/planner.tsx`.
 */

export type LocalPlannerTask = {
  id: number;
  subject: string;
  task: string;
  time: string;
  durationMin: number;
  done: boolean;
  /** Optional external link (e.g. KTBS textbook PDF). */
  link?: string;
};

const STORAGE = "vidyapath.planner.v1";

type Saved = {
  tasks?: LocalPlannerTask[];
  focusMinutes?: number;
};

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
 * Append a task to today's plan. Returns `false` if a task with the same
 * title already exists (caller can show "already on plan" feedback).
 */
export function addToTodayPlan(input: {
  subject: string;
  task: string;
  durationMin: number;
  link?: string;
}): boolean {
  const saved = read();
  const tasks = saved.tasks ?? [];
  if (hasTaskWithTitle(input.task)) return false;
  const id = (tasks.reduce((m, t) => Math.max(m, t.id), 0) || 0) + 1;
  const next: LocalPlannerTask = {
    id,
    subject: input.subject,
    task: input.task,
    time: `${input.durationMin} min`,
    durationMin: input.durationMin,
    done: false,
    link: input.link,
  };
  write({ ...saved, tasks: [...tasks, next] });
  return true;
}