/**
 * Local-first planner + revision store. Mirrors the Firestore service
 * interface (see `services/study-plans.ts`, `services/planner-tasks.ts`,
 * `services/revision-schedules.ts`) so call sites stay stable once Firebase
 * Auth lands and writes fan out to Firestore.
 */

import type {
  PlannerTaskDoc,
  PlannerTaskStatus,
  RevisionScheduleDoc,
  StudyPlanDoc,
} from "@/integrations/firebase/types";

const PLANS_KEY = "vidyapath.planner.plans.v1";
const TASKS_KEY = "vidyapath.planner.tasks.v1";
const REVISIONS_KEY = "vidyapath.planner.revisions.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / SSR / private mode — silently drop */
  }
}

// ---------- Plans ----------

export function readStudyPlans(userId: string): StudyPlanDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<Record<string, StudyPlanDoc>>(localStorage.getItem(PLANS_KEY), {});
  return Object.values(all).filter((p) => p.userId === userId);
}

export function readStudyPlan(planId: string): StudyPlanDoc | null {
  if (typeof window === "undefined") return null;
  const all = safeParse<Record<string, StudyPlanDoc>>(localStorage.getItem(PLANS_KEY), {});
  return all[planId] ?? null;
}

export function writeStudyPlan(plan: StudyPlanDoc): StudyPlanDoc {
  if (typeof window !== "undefined") {
    const all = safeParse<Record<string, StudyPlanDoc>>(localStorage.getItem(PLANS_KEY), {});
    all[plan.id] = plan;
    safeWrite(PLANS_KEY, all);
  }
  return plan;
}

// ---------- Tasks ----------

export function readPlannerTasks(userId: string, planId?: string): PlannerTaskDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<PlannerTaskDoc[]>(localStorage.getItem(TASKS_KEY), []);
  return all.filter((t) => t.userId === userId && (planId ? t.planId === planId : true));
}

export function writePlannerTasks(tasks: PlannerTaskDoc[]): PlannerTaskDoc[] {
  if (typeof window === "undefined") return tasks;
  const all = safeParse<PlannerTaskDoc[]>(localStorage.getItem(TASKS_KEY), []);
  const ids = new Set(tasks.map((t) => t.id));
  const next = all.filter((t) => !ids.has(t.id)).concat(tasks);
  safeWrite(TASKS_KEY, next.slice(-1000));
  return tasks;
}

export function updatePlannerTaskStatus(
  taskId: string,
  status: PlannerTaskStatus,
): PlannerTaskDoc | null {
  if (typeof window === "undefined") return null;
  const all = safeParse<PlannerTaskDoc[]>(localStorage.getItem(TASKS_KEY), []);
  const idx = all.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;
  const updated: PlannerTaskDoc = {
    ...all[idx],
    status,
    completedAt: status === "done" ? Date.now() : null,
  };
  all[idx] = updated;
  safeWrite(TASKS_KEY, all);
  return updated;
}

// ---------- Revision cards ----------

export function readRevisionCards(userId: string): RevisionScheduleDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<RevisionScheduleDoc[]>(localStorage.getItem(REVISIONS_KEY), []);
  return all.filter((c) => c.userId === userId);
}

export function upsertRevisionCard(card: RevisionScheduleDoc): RevisionScheduleDoc {
  if (typeof window === "undefined") return card;
  const all = safeParse<RevisionScheduleDoc[]>(localStorage.getItem(REVISIONS_KEY), []);
  const next = all.filter((c) => c.id !== card.id).concat(card);
  safeWrite(REVISIONS_KEY, next);
  return card;
}

export function deleteRevisionCard(cardId: string): void {
  if (typeof window === "undefined") return;
  const all = safeParse<RevisionScheduleDoc[]>(localStorage.getItem(REVISIONS_KEY), []);
  safeWrite(REVISIONS_KEY, all.filter((c) => c.id !== cardId));
}