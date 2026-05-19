import {
  collection,
  doc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { RevisionScheduleDoc } from "../types";

/** Upsert a revision card. Doc id convention: `${userId}_${chapterId}`. */
export async function upsertRevisionSchedule(
  card: RevisionScheduleDoc,
): Promise<RevisionScheduleDoc> {
  await setDoc(doc(db, COLLECTIONS.REVISION_SCHEDULES, card.id), card, { merge: true });
  return card;
}

export async function fetchDueRevisions(
  userId: string,
  dueBefore: number,
  limit = 50,
): Promise<RevisionScheduleDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.REVISION_SCHEDULES),
    where("userId", "==", userId),
    where("dueAt", "<=", dueBefore),
    orderBy("dueAt", "asc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RevisionScheduleDoc, "id">) }));
}

export async function fetchAllRevisions(
  userId: string,
  limit = 200,
): Promise<RevisionScheduleDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.REVISION_SCHEDULES),
    where("userId", "==", userId),
    orderBy("dueAt", "asc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RevisionScheduleDoc, "id">) }));
}