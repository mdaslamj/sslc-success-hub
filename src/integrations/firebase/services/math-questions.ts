import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  MathDifficulty,
  MathQuestionDoc,
  MathQuestionType,
} from "../types";

export type MathQuestionFilter = {
  chapterId?: string;
  questionType?: MathQuestionType;
  difficulty?: MathDifficulty;
  minBoardFrequency?: number;
  importantOnly?: boolean;
};

function applyClientFilter(
  rows: MathQuestionDoc[],
  f: MathQuestionFilter,
): MathQuestionDoc[] {
  return rows.filter((q) => {
    if (f.difficulty && q.difficulty !== f.difficulty) return false;
    if (
      f.minBoardFrequency !== undefined &&
      q.metadata.boardFrequency < f.minBoardFrequency
    )
      return false;
    if (f.importantOnly && !q.metadata.isImportant) return false;
    return true;
  });
}

/**
 * Query questions for math. We push `chapterId` + `questionType` into the
 * Firestore `where` clause (cheap composite index) and apply lighter
 * filters (difficulty, importance) client-side to avoid index sprawl.
 */
export async function fetchMathQuestions(
  filter: MathQuestionFilter = {},
): Promise<MathQuestionDoc[]> {
  const clauses = [] as ReturnType<typeof where>[];
  if (filter.chapterId) clauses.push(where("chapterId", "==", filter.chapterId));
  if (filter.questionType)
    clauses.push(where("questionType", "==", filter.questionType));
  const q = clauses.length
    ? query(collection(db, COLLECTIONS.MATH_QUESTIONS), ...clauses)
    : query(collection(db, COLLECTIONS.MATH_QUESTIONS), orderBy("chapterId", "asc"));
  const snap = await getDocs(q);
  const rows = snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<MathQuestionDoc, "id">) }),
  );
  return applyClientFilter(rows, filter);
}

export async function fetchMathQuestion(
  questionId: string,
): Promise<MathQuestionDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.MATH_QUESTIONS, questionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MathQuestionDoc, "id">) };
}

export async function upsertMathQuestion(q: MathQuestionDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_QUESTIONS, q.id), {
    ...q,
    updatedAt: Date.now(),
  });
}