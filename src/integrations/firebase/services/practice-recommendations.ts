import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { PracticeRecommendationDoc } from "../types";

export async function savePracticeRecommendation(
  d: PracticeRecommendationDoc,
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.PRACTICE_RECOMMENDATIONS, d.id), d, {
    merge: true,
  });
}