import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../config";

export type SubjectChapter = {
  id: string;
  title: string;
  summary?: string;
  description?: string;
  chapterNumber?: number;
  difficulty?: string;
  estimatedStudyTime?: number;
  emoji?: string;
  learningPoints?: string[];
  formulas?: string[];
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
    return normalize(d.id, data);
  });
}

/** Fetch a single chapter: subject/{subjectId}/chapters/{chapterId}. */
export async function fetchChapter(
  subjectId: string,
  chapterId: string,
): Promise<SubjectChapter | null> {
  const snap = await getDoc(doc(db, "subject", subjectId, "chapters", chapterId));
  if (!snap.exists()) return null;
  return normalize(snap.id, snap.data() as Record<string, unknown>);
}

function normalize(id: string, data: Record<string, unknown>): SubjectChapter {
  const toStringArray = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    return v.map((x) =>
      typeof x === "string"
        ? x
        : x && typeof x === "object" && "expression" in (x as Record<string, unknown>)
          ? String((x as Record<string, unknown>).expression)
          : String(x),
    );
  };
  return {
    id,
    title:
      (data.title as string) ??
      (data.name as string) ??
      (data.chapterName as string) ??
      id,
    summary: (data.summary as string) ?? (data.description as string) ?? undefined,
    description: (data.description as string) ?? undefined,
    chapterNumber: (data.chapterNumber as number) ?? undefined,
    difficulty: (data.difficulty as string) ?? undefined,
    estimatedStudyTime: (data.estimatedStudyTime as number) ?? undefined,
    emoji: (data.emoji as string) ?? "📘",
    learningPoints:
      toStringArray(data.learningPoints) ??
      toStringArray(data.learningObjectives) ??
      toStringArray(data.importantTopics),
    formulas: toStringArray(data.formulas),
  };
}