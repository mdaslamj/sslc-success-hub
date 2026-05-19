import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ADAPTIVE_SUBCOLLECTIONS, COLLECTIONS, db } from "../config";
import type { RevisionQueueDoc, RevisionQueueStatus } from "../types";

const COL = ADAPTIVE_SUBCOLLECTIONS.REVISION_QUEUE;

function qDoc(userId: string, queueId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COL, queueId);
}
function qCol(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COL);
}

export async function enqueueRevision(item: RevisionQueueDoc): Promise<void> {
  await setDoc(qDoc(item.userId, item.id), { ...item, updatedAt: Date.now() }, { merge: true });
}

export async function fetchRevisionQueue(
  userId: string,
  opts: { status?: RevisionQueueStatus; dueBefore?: number; limit?: number } = {},
): Promise<RevisionQueueDoc[]> {
  const clauses = [] as ReturnType<typeof where>[];
  if (opts.status) clauses.push(where("status", "==", opts.status));
  if (typeof opts.dueBefore === "number") {
    clauses.push(where("scheduledDate", "<=", opts.dueBefore));
  }
  const q = query(
    qCol(userId),
    ...clauses,
    orderBy("scheduledDate", "asc"),
    qLimit(opts.limit ?? 50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RevisionQueueDoc, "id">),
  }));
}

export async function setRevisionQueueStatus(
  userId: string,
  queueId: string,
  status: RevisionQueueStatus,
): Promise<void> {
  await updateDoc(qDoc(userId, queueId), { status, updatedAt: Date.now() });
}

export async function fetchRevisionQueueItem(
  userId: string,
  queueId: string,
): Promise<RevisionQueueDoc | null> {
  const snap = await getDoc(qDoc(userId, queueId));
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as Omit<RevisionQueueDoc, "id">) })
    : null;
}

/**
 * Patch the dynamic priority / decay fields of a queue card. Pass only the
 * fields you want to overwrite — `updatedAt` is bumped automatically.
 */
export async function updateRevisionQueueCard(
  userId: string,
  queueId: string,
  patch: Partial<
    Pick<
      RevisionQueueDoc,
      | "priority"
      | "scheduledDate"
      | "lastPracticed"
      | "lastMistake"
      | "confidenceScore"
      | "confidenceDecay"
      | "interval"
      | "status"
    >
  >,
): Promise<void> {
  await updateDoc(qDoc(userId, queueId), { ...patch, updatedAt: Date.now() });
}