import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { RecommendationDoc, RecommendationStatus } from "../types";

/** Bulk upsert — used after every regeneration so docs stay idempotent. */
export async function upsertRecommendations(
  recs: RecommendationDoc[],
): Promise<RecommendationDoc[]> {
  if (recs.length === 0) return recs;
  const batch = writeBatch(db);
  for (const r of recs) {
    batch.set(doc(db, COLLECTIONS.RECOMMENDATIONS, r.id), r, { merge: true });
  }
  await batch.commit();
  return recs;
}

export async function fetchRecommendations(
  userId: string,
  opts: { status?: RecommendationStatus } = {},
): Promise<RecommendationDoc[]> {
  const clauses = [where("userId", "==", userId)];
  if (opts.status) clauses.push(where("status", "==", opts.status));
  const q = query(
    collection(db, COLLECTIONS.RECOMMENDATIONS),
    ...clauses,
    orderBy("score", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RecommendationDoc, "id">) }));
}

export async function setRecommendationStatus(
  recId: string,
  status: RecommendationStatus,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "dismissed") patch.dismissedAt = Date.now();
  if (status === "acted") patch.actedAt = Date.now();
  await updateDoc(doc(db, COLLECTIONS.RECOMMENDATIONS, recId), patch);
}