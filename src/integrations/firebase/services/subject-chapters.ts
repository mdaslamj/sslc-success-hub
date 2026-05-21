import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../config";

export type SubjectChapter = {
  id: string;
  title: string;
  description?: string;
  chapterNumber?: number;
  difficulty?: string;
  estimatedStudyTime?: number;
  emoji?: string;
};

/**
 * Fetch chapters from Firestore path: subject/{subjectId}/chapters
 * (singular `subject` collection, with one doc per subject and a `chapters` subcollection).
 */
export async function fetchSubjectChapters(
  subjectId: string,
): Promise<SubjectChapter[]> {
  const ref = collection(db, "subject", subjectId, "chapters");
  let snap;
  try {
    snap = await getDocs(query(ref, orderBy("chapterNumber", "asc")));
  } catch {
    // Fall back if `chapterNumber` field is missing on some docs.
    snap = await getDocs(ref);
  }
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      title:
        (data.title as string) ??
        (data.name as string) ??
        (data.chapterName as string) ??
        d.id,
      description: (data.description as string) ?? undefined,
      chapterNumber: (data.chapterNumber as number) ?? undefined,
      difficulty: (data.difficulty as string) ?? undefined,
      estimatedStudyTime: (data.estimatedStudyTime as number) ?? undefined,
      emoji: (data.emoji as string) ?? "📘",
    };
  });
}