import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ADAPTIVE_SUBCOLLECTIONS, COLLECTIONS, db } from "../config";
import type { InterventionPlanDoc, InterventionStatus } from "../types";

const COL = ADAPTIVE_SUBCOLLECTIONS.INTERVENTION_PLANS;

function planDoc(userId: string, planId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COL, planId);
}
function planCol(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COL);
}

export async function saveInterventionPlan(plan: InterventionPlanDoc): Promise<void> {
  await setDoc(
    planDoc(plan.userId, plan.id),
    { ...plan, updatedAt: Date.now() },
    { merge: true },
  );
}

export async function fetchInterventionPlan(
  userId: string,
  planId: string,
): Promise<InterventionPlanDoc | null> {
  const snap = await getDoc(planDoc(userId, planId));
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as Omit<InterventionPlanDoc, "id">) })
    : null;
}

export async function fetchInterventionPlans(
  userId: string,
  opts: { chapterId?: string; status?: InterventionStatus; limit?: number } = {},
): Promise<InterventionPlanDoc[]> {
  const clauses = [] as ReturnType<typeof where>[];
  if (opts.chapterId) clauses.push(where("chapterId", "==", opts.chapterId));
  if (opts.status) clauses.push(where("status", "==", opts.status));
  const q = query(
    planCol(userId),
    ...clauses,
    orderBy("priorityScore", "desc"),
    qLimit(opts.limit ?? 50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<InterventionPlanDoc, "id">),
  }));
}

export async function updateInterventionPlanStatus(
  userId: string,
  planId: string,
  status: InterventionStatus,
): Promise<void> {
  await updateDoc(planDoc(userId, planId), { status, updatedAt: Date.now() });
}