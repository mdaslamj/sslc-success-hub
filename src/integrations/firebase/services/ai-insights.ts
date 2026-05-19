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
import type { AiInsightDoc } from "../types";

export async function upsertAiInsight(insight: AiInsightDoc): Promise<AiInsightDoc> {
  await setDoc(doc(db, COLLECTIONS.AI_INSIGHTS, insight.id), insight, { merge: true });
  return insight;
}

export async function fetchAiInsight(
  userId: string,
  periodKey: string,
): Promise<AiInsightDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.AI_INSIGHTS, `${userId}_d_${periodKey}`));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<AiInsightDoc, "id">) }) : null;
}

export async function fetchRecentAiInsights(
  userId: string,
  limit = 14,
): Promise<AiInsightDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.AI_INSIGHTS),
    where("userId", "==", userId),
    orderBy("periodKey", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiInsightDoc, "id">) }));
}