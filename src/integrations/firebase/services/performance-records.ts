import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { COLLECTIONS, DIAGNOSIS_SUBCOLLECTIONS, db } from "../config";
import type { PerformanceRecordDoc } from "../types";

function perfCol(userId: string) {
  return collection(
    db,
    COLLECTIONS.USERS,
    userId,
    DIAGNOSIS_SUBCOLLECTIONS.PERFORMANCE,
  );
}

/** Append a single performance observation. */
export async function recordPerformance(
  input: Omit<PerformanceRecordDoc, "id" | "createdAt"> & { createdAt?: number },
): Promise<PerformanceRecordDoc> {
  const payload = { ...input, createdAt: input.createdAt ?? Date.now() };
  const ref = await addDoc(perfCol(input.userId), payload);
  return { id: ref.id, ...payload } as PerformanceRecordDoc;
}

/** Read recent performance records for a user, optionally filtered by chapter. */
export async function fetchPerformanceRecords(
  userId: string,
  opts: { chapterId?: string; max?: number } = {},
): Promise<PerformanceRecordDoc[]> {
  const constraints = [
    ...(opts.chapterId ? [where("chapterId", "==", opts.chapterId)] : []),
    orderBy("createdAt", "desc"),
    limit(opts.max ?? 200),
  ];
  const snap = await getDocs(query(perfCol(userId), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PerformanceRecordDoc, "id">) }));
}