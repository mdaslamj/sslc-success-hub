import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, DIAGNOSIS_SUBCOLLECTIONS, db } from "../config";
import type { RemediationPlanDoc, RemediationStatus } from "../types";

function plansCol(userId: string) {
  return collection(
    db,
    COLLECTIONS.USERS,
    userId,
    DIAGNOSIS_SUBCOLLECTIONS.REMEDIATION,
  );
}

function planDoc(userId: string, planId: string) {
  return doc(
    db,
    COLLECTIONS.USERS,
    userId,
    DIAGNOSIS_SUBCOLLECTIONS.REMEDIATION,
    planId,
  );
}

export async function fetchRemediationPlan(
  userId: string,
  planId: string,
): Promise<RemediationPlanDoc | null> {
  const snap = await getDoc(planDoc(userId, planId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<RemediationPlanDoc, "id">) };
}

export async function fetchRemediationPlansForChapter(
  userId: string,
  chapterId: string,
): Promise<RemediationPlanDoc[]> {
  const snap = await getDocs(
    query(
      plansCol(userId),
      where("chapterId", "==", chapterId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RemediationPlanDoc, "id">),
  }));
}

export async function fetchAllRemediationPlans(
  userId: string,
): Promise<RemediationPlanDoc[]> {
  const snap = await getDocs(
    query(plansCol(userId), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RemediationPlanDoc, "id">),
  }));
}

export async function saveRemediationPlan(
  plan: RemediationPlanDoc,
): Promise<void> {
  await setDoc(
    planDoc(plan.userId, plan.id),
    { ...plan, updatedAt: Date.now() },
    { merge: true },
  );
}

export async function updateRemediationPlanStatus(
  userId: string,
  planId: string,
  status: RemediationStatus,
): Promise<void> {
  await setDoc(
    planDoc(userId, planId),
    { status, updatedAt: Date.now() },
    { merge: true },
  );
}