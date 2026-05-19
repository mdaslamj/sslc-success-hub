import {
  collection,
  doc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { PlannerTaskDoc, PlannerTaskStatus } from "../types";

/** Bulk upsert — used when a freshly generated plan materialises its tasks. */
export async function upsertPlannerTasks(tasks: PlannerTaskDoc[]): Promise<PlannerTaskDoc[]> {
  if (tasks.length === 0) return tasks;
  const batch = writeBatch(db);
  for (const t of tasks) {
    batch.set(doc(db, COLLECTIONS.PLANNER_TASKS, t.id), t, { merge: true });
  }
  await batch.commit();
  return tasks;
}

export async function fetchPlannerTasks(
  userId: string,
  opts: { planId?: string; dayKey?: string; limit?: number } = {},
): Promise<PlannerTaskDoc[]> {
  const clauses = [where("userId", "==", userId)];
  if (opts.planId) clauses.push(where("planId", "==", opts.planId));
  if (opts.dayKey) clauses.push(where("dayKey", "==", opts.dayKey));
  const q = query(
    collection(db, COLLECTIONS.PLANNER_TASKS),
    ...clauses,
    orderBy("priority", "desc"),
    qLimit(opts.limit ?? 100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PlannerTaskDoc, "id">) }));
}

export async function setPlannerTaskStatus(
  taskId: string,
  status: PlannerTaskStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.PLANNER_TASKS, taskId), {
    status,
    completedAt: status === "done" ? Date.now() : null,
  });
}