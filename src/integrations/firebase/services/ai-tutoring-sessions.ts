import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, SEMANTIC_SUBCOLLECTIONS, db } from "../config";
import type { AiTutoringSessionDoc, TutoringTurn } from "../types";

const COL = SEMANTIC_SUBCOLLECTIONS.AI_TUTORING_SESSIONS;
const colRef = (uid: string) => collection(db, COLLECTIONS.USERS, uid, COL);
const docRef = (uid: string, id: string) =>
  doc(db, COLLECTIONS.USERS, uid, COL, id);

export async function createTutoringSession(
  s: Omit<AiTutoringSessionDoc, "id" | "createdAt" | "updatedAt">,
): Promise<AiTutoringSessionDoc> {
  const now = Date.now();
  const ref = await addDoc(colRef(s.userId), {
    ...s,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(ref, { id: ref.id });
  return { ...s, id: ref.id, createdAt: now, updatedAt: now };
}

export async function fetchTutoringSession(
  userId: string,
  sessionId: string,
): Promise<AiTutoringSessionDoc | null> {
  const snap = await getDoc(docRef(userId, sessionId));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...(snap.data() as Omit<AiTutoringSessionDoc, "id">),
  };
}

export async function fetchTutoringSessionsForChapter(
  userId: string,
  chapterId: string,
): Promise<AiTutoringSessionDoc[]> {
  const snap = await getDocs(
    query(
      colRef(userId),
      where("chapterId", "==", chapterId),
      orderBy("updatedAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AiTutoringSessionDoc, "id">),
  }));
}

export async function appendTutoringTurns(
  userId: string,
  sessionId: string,
  turns: TutoringTurn[],
): Promise<void> {
  const ref = docRef(userId, sessionId);
  const snap = await getDoc(ref);
  const existing = (snap.data()?.turns as TutoringTurn[] | undefined) ?? [];
  await setDoc(
    ref,
    {
      turns: [...existing, ...turns],
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function closeTutoringSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  await setDoc(
    docRef(userId, sessionId),
    { status: "closed", updatedAt: Date.now() },
    { merge: true },
  );
}