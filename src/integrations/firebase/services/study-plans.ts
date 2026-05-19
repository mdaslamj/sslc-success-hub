import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { StudyPlanDoc } from "../types";

/** Idempotent upsert keyed by `${userId}_d_${dayKey}` / `_w_${weekKey}`. */
export async function upsertStudyPlan(plan: StudyPlanDoc): Promise<StudyPlanDoc> {
  await setDoc(doc(db, COLLECTIONS.STUDY_PLANS, plan.id), plan, { merge: true });
  return plan;
}

export async function fetchStudyPlan(planId: string): Promise<StudyPlanDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.STUDY_PLANS, planId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<StudyPlanDoc, "id">) }) : null;
}

export async function fetchRecentStudyPlans(
  userId: string,
  limit = 30,
): Promise<StudyPlanDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.STUDY_PLANS),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StudyPlanDoc, "id">) }));
}