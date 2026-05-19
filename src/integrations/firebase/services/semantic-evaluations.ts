import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, SEMANTIC_SUBCOLLECTIONS, db } from "../config";
import type { SemanticEvaluationDoc } from "../types";

const COL = SEMANTIC_SUBCOLLECTIONS.SEMANTIC_EVALUATIONS;
const colRef = (uid: string) => collection(db, COLLECTIONS.USERS, uid, COL);

export async function saveSemanticEvaluation(
  e: Omit<SemanticEvaluationDoc, "id" | "createdAt" | "updatedAt">,
): Promise<SemanticEvaluationDoc> {
  const now = Date.now();
  const ref = await addDoc(colRef(e.userId), {
    ...e,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(ref, { id: ref.id });
  return { ...e, id: ref.id, createdAt: now, updatedAt: now };
}

export async function fetchSemanticEvaluationsForQuestion(
  userId: string,
  questionId: string,
): Promise<SemanticEvaluationDoc[]> {
  const snap = await getDocs(
    query(
      colRef(userId),
      where("questionId", "==", questionId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<SemanticEvaluationDoc, "id">),
  }));
}

export async function fetchSemanticEvaluationsForChapter(
  userId: string,
  chapterId: string,
): Promise<SemanticEvaluationDoc[]> {
  const snap = await getDocs(
    query(
      colRef(userId),
      where("chapterId", "==", chapterId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<SemanticEvaluationDoc, "id">),
  }));
}