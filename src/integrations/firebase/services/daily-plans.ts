import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { DailyPlanDoc } from "../types";

const docId = (userId: string, dayKey: string) => `${userId}_${dayKey}`;

export async function fetchDailyPlan(
  userId: string,
  dayKey: string,
): Promise<DailyPlanDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.DAILY_PLANS, docId(userId, dayKey)));
  return snap.exists() ? (snap.data() as DailyPlanDoc) : null;
}

export async function upsertDailyPlan(plan: DailyPlanDoc): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.DAILY_PLANS, plan.id),
    { ...plan, updatedAt: Date.now() },
    { merge: true },
  );
}