import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { DailyReflectionDoc } from "../types";

const docId = (userId: string, dayKey: string) => `${userId}_${dayKey}`;

export async function fetchDailyReflection(
  userId: string,
  dayKey: string,
): Promise<DailyReflectionDoc | null> {
  const snap = await getDoc(
    doc(db, COLLECTIONS.DAILY_REFLECTIONS, docId(userId, dayKey)),
  );
  return snap.exists() ? (snap.data() as DailyReflectionDoc) : null;
}

export async function saveDailyReflection(r: DailyReflectionDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.DAILY_REFLECTIONS, r.id), r, { merge: true });
}