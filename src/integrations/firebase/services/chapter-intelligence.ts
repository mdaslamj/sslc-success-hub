import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, DIAGNOSIS_SUBCOLLECTIONS, db } from "../config";
import type { ChapterIntelligenceDoc } from "../types";

const SUMMARY_DOC_ID = "summary";

function intelligenceDoc(chapterId: string) {
  return doc(
    db,
    COLLECTIONS.CHAPTERS,
    chapterId,
    DIAGNOSIS_SUBCOLLECTIONS.CHAPTER_INTELLIGENCE,
    SUMMARY_DOC_ID,
  );
}

export async function fetchChapterIntelligence(
  chapterId: string,
): Promise<ChapterIntelligenceDoc | null> {
  const snap = await getDoc(intelligenceDoc(chapterId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ChapterIntelligenceDoc, "id">) };
}

export async function saveChapterIntelligence(
  intel: ChapterIntelligenceDoc,
): Promise<void> {
  await setDoc(
    intelligenceDoc(intel.chapterId),
    { ...intel, id: SUMMARY_DOC_ID, updatedAt: Date.now() },
    { merge: true },
  );
}