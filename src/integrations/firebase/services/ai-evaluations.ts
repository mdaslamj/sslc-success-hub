import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { AiEvaluationDoc } from "../types";

export async function saveAiEvaluation(e: AiEvaluationDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.AI_EVALUATIONS, e.id), e, { merge: true });
}