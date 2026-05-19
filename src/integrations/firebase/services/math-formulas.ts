import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { MathFormulaDoc } from "../types";

export async function fetchMathFormulas(): Promise<MathFormulaDoc[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.MATH_FORMULAS));
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<MathFormulaDoc, "id">) }),
  );
}

export async function fetchMathFormulasForChapter(
  chapterId: string,
): Promise<MathFormulaDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MATH_FORMULAS),
      where("chapterIds", "array-contains", chapterId),
    ),
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<MathFormulaDoc, "id">) }),
  );
}

export async function fetchMathFormula(
  formulaId: string,
): Promise<MathFormulaDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.MATH_FORMULAS, formulaId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MathFormulaDoc, "id">) };
}

/** Plain-text search across labels + descriptions. */
export function searchFormulas(
  formulas: MathFormulaDoc[],
  q: string,
): MathFormulaDoc[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return formulas;
  return formulas.filter((f) =>
    [f.label, f.expression, f.description ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

export async function upsertMathFormula(f: MathFormulaDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_FORMULAS, f.id), {
    ...f,
    updatedAt: Date.now(),
  });
}