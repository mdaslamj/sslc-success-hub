import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  limit as qLimit,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { MathQuestionType, MathRubricDoc } from "../types";

/** Hard-coded default per question-type so grading works even without seeds. */
export const DEFAULT_MATH_RUBRICS: Record<MathQuestionType, MathRubricDoc> = {
  mcq: {
    id: "default_mcq",
    questionType: "mcq",
    totalMarks: 1,
    criteria: [
      { key: "final", label: "Correct option", marks: 1, required: true },
    ],
    updatedAt: 0,
  },
  "1mark": {
    id: "default_1mark",
    questionType: "1mark",
    totalMarks: 1,
    criteria: [
      { key: "final", label: "Final answer", marks: 1, required: true },
    ],
    updatedAt: 0,
  },
  "2mark": {
    id: "default_2mark",
    questionType: "2mark",
    totalMarks: 2,
    criteria: [
      { key: "formula", label: "Formula used", marks: 1, required: true },
      { key: "final", label: "Final answer", marks: 1, required: true },
    ],
    updatedAt: 0,
  },
  "3mark": {
    id: "default_3mark",
    questionType: "3mark",
    totalMarks: 3,
    criteria: [
      { key: "formula", label: "Formula used", marks: 1, required: true },
      { key: "substitution", label: "Substitution", marks: 1, required: false },
      { key: "final", label: "Final answer", marks: 1, required: true },
    ],
    updatedAt: 0,
  },
  "5mark": {
    id: "default_5mark",
    questionType: "5mark",
    totalMarks: 5,
    criteria: [
      { key: "formula", label: "Formula written", marks: 1, required: true },
      { key: "substitution", label: "Substitution", marks: 1, required: true },
      { key: "calculation", label: "Calculation steps", marks: 2, required: true },
      { key: "units", label: "Units / notation", marks: 0.5, required: false },
      { key: "final", label: "Final answer", marks: 0.5, required: true },
    ],
    updatedAt: 0,
  },
  hots: {
    id: "default_hots",
    questionType: "hots",
    totalMarks: 4,
    criteria: [
      { key: "approach", label: "Approach", marks: 1, required: true },
      { key: "reasoning", label: "Reasoning", marks: 2, required: true },
      { key: "final", label: "Final answer", marks: 1, required: true },
    ],
    updatedAt: 0,
  },
  competency: {
    id: "default_competency",
    questionType: "competency",
    totalMarks: 4,
    criteria: [
      { key: "interpretation", label: "Interpretation", marks: 1, required: true },
      { key: "method", label: "Method choice", marks: 1, required: true },
      { key: "calculation", label: "Calculation", marks: 1, required: true },
      { key: "final", label: "Final answer", marks: 1, required: true },
    ],
    updatedAt: 0,
  },
};

export async function fetchMathRubric(
  questionType: MathQuestionType,
  overrideId?: string,
): Promise<MathRubricDoc> {
  if (overrideId) {
    const snap = await getDoc(doc(db, COLLECTIONS.MATH_RUBRICS, overrideId));
    if (snap.exists())
      return { id: snap.id, ...(snap.data() as Omit<MathRubricDoc, "id">) };
  }
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MATH_RUBRICS),
      where("questionType", "==", questionType),
      qLimit(1),
    ),
  );
  const first = snap.docs[0];
  if (first)
    return { id: first.id, ...(first.data() as Omit<MathRubricDoc, "id">) };
  return DEFAULT_MATH_RUBRICS[questionType];
}

export async function upsertMathRubric(r: MathRubricDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_RUBRICS, r.id), {
    ...r,
    updatedAt: Date.now(),
  });
}