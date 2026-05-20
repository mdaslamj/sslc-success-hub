import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { SolvedQuestionDoc, SolveMode } from "../types";

export function solvedQuestionId(
  scanId: string,
  mode: SolveMode,
  language: "en" | "kn",
): string {
  return `${scanId}__${mode}__${language}`;
}

export async function saveSolvedQuestion(d: SolvedQuestionDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SOLVED_QUESTIONS, d.id), d, { merge: true });
}

export async function fetchSolvedQuestionsForScan(
  userId: string,
  scanId: string,
): Promise<SolvedQuestionDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.SOLVED_QUESTIONS),
    where("userId", "==", userId),
    where("scanId", "==", scanId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SolvedQuestionDoc);
}