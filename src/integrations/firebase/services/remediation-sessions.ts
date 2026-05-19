import {
  collection,
  doc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ADAPTIVE_SUBCOLLECTIONS, COLLECTIONS, db } from "../config";
import type { RemediationSessionDoc, RemediationSessionType } from "../types";

const COL = ADAPTIVE_SUBCOLLECTIONS.REMEDIATION_SESSIONS;

function sDoc(userId: string, sessionId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COL, sessionId);
}
function sCol(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COL);
}

export async function saveRemediationSession(s: RemediationSessionDoc): Promise<void> {
  await setDoc(sDoc(s.userId, s.id), { ...s, updatedAt: Date.now() }, { merge: true });
}

export async function fetchRemediationSessions(
  userId: string,
  opts: { chapterId?: string; type?: RemediationSessionType; limit?: number } = {},
): Promise<RemediationSessionDoc[]> {
  const clauses = [] as ReturnType<typeof where>[];
  if (opts.chapterId) clauses.push(where("chapterId", "==", opts.chapterId));
  if (opts.type) clauses.push(where("type", "==", opts.type));
  const q = query(
    sCol(userId),
    ...clauses,
    orderBy("scheduledAt", "desc"),
    qLimit(opts.limit ?? 50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RemediationSessionDoc, "id">),
  }));
}

export async function completeRemediationSession(
  userId: string,
  sessionId: string,
  outcome?: RemediationSessionDoc["outcome"],
): Promise<void> {
  await updateDoc(sDoc(userId, sessionId), {
    completedAt: Date.now(),
    outcome: outcome ?? null,
    updatedAt: Date.now(),
  });
}