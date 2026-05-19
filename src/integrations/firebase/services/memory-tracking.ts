import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { ADAPTIVE_SUBCOLLECTIONS, COLLECTIONS, db } from "../config";
import type { MemoryTrackingDoc } from "../types";

const COL = ADAPTIVE_SUBCOLLECTIONS.MEMORY_TRACKING;

function mtDoc(userId: string, chapterId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COL, chapterId);
}
function mtCol(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COL);
}

export async function fetchMemoryTracking(
  userId: string,
  chapterId: string,
): Promise<MemoryTrackingDoc | null> {
  const snap = await getDoc(mtDoc(userId, chapterId));
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as Omit<MemoryTrackingDoc, "id">) })
    : null;
}

export async function fetchAllMemoryTracking(
  userId: string,
): Promise<MemoryTrackingDoc[]> {
  const snap = await getDocs(mtCol(userId));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MemoryTrackingDoc, "id">),
  }));
}

export async function saveMemoryTracking(t: MemoryTrackingDoc): Promise<void> {
  await setDoc(
    mtDoc(t.userId, t.chapterId),
    { ...t, updatedAt: Date.now() },
    { merge: true },
  );
}

/**
 * Patch the retention fields of a memoryTracking doc without overwriting
 * unrelated columns. Creates the doc if missing.
 */
export async function updateRetentionScore(
  userId: string,
  chapterId: string,
  patch: Pick<
    MemoryTrackingDoc,
    "retentionScore" | "retentionInputs" | "retentionBand"
  > & { subjectId?: string },
): Promise<void> {
  await setDoc(
    mtDoc(userId, chapterId),
    {
      id: chapterId,
      userId,
      chapterId,
      ...(patch.subjectId ? { subjectId: patch.subjectId } : {}),
      retentionScore: patch.retentionScore,
      retentionInputs: patch.retentionInputs,
      retentionBand: patch.retentionBand,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}