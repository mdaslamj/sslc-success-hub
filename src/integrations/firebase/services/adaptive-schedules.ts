import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { ADAPTIVE_SUBCOLLECTIONS, COLLECTIONS, db } from "../config";
import type { AdaptiveScheduleDoc } from "../types";

const COL = ADAPTIVE_SUBCOLLECTIONS.ADAPTIVE_SCHEDULES;

function schedDoc(userId: string, scheduleId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COL, scheduleId);
}
function schedCol(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COL);
}

export async function saveAdaptiveSchedule(s: AdaptiveScheduleDoc): Promise<void> {
  await setDoc(schedDoc(s.userId, s.id), { ...s, updatedAt: Date.now() }, { merge: true });
}

export async function fetchAdaptiveSchedule(
  userId: string,
  scheduleId: string,
): Promise<AdaptiveScheduleDoc | null> {
  const snap = await getDoc(schedDoc(userId, scheduleId));
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as Omit<AdaptiveScheduleDoc, "id">) })
    : null;
}

/** Latest schedules first. */
export async function fetchRecentAdaptiveSchedules(
  userId: string,
  limit = 14,
): Promise<AdaptiveScheduleDoc[]> {
  const q = query(schedCol(userId), orderBy("createdAt", "desc"), qLimit(limit));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AdaptiveScheduleDoc, "id">),
  }));
}