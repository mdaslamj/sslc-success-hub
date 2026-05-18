import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "./config";
import type { ChapterDoc, SubjectDoc } from "./types";

/** Fetch all subjects, ordered by `order` field (sorted client-side to avoid index requirements). */
export async function fetchSubjects(): Promise<SubjectDoc[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.SUBJECTS));
  const rows = snap.docs.map((d) => normalizeSubject({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  return rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Fetch a single subject by id. Returns null if not found. */
export async function fetchSubject(subjectId: string): Promise<SubjectDoc | null> {
  const ref = doc(db, COLLECTIONS.SUBJECTS, subjectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeSubject({ id: snap.id, ...(snap.data() as Record<string, unknown>) });
}

/** Fetch all chapters for a given subject (sorted client-side to avoid composite index). */
export async function fetchChapters(subjectId: string): Promise<ChapterDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.CHAPTERS),
    where("subjectId", "==", subjectId),
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => normalizeChapter({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  return rows.sort(
    (a, b) => (a.chapterNumber ?? a.order ?? 0) - (b.chapterNumber ?? b.order ?? 0),
  );
}

function normalizeSubject(raw: Record<string, unknown> & { id: string }): SubjectDoc {
  return {
    id: raw.id,
    name: (raw.name as string) ?? raw.id,
    nameKn: (raw.nameKn as string) ?? undefined,
    emoji: (raw.emoji as string) ?? "📘",
    color: (raw.color as string) ?? "#6366f1",
    completion: (raw.completion as number) ?? 0,
    mastery: (raw.mastery as number) ?? 0,
    target: (raw.target as number) ?? 90,
    predicted: (raw.predicted as number) ?? 0,
    chaptersTotal: (raw.chaptersTotal as number) ?? 0,
    chaptersDone: (raw.chaptersDone as number) ?? 0,
    weakTopics: Array.isArray(raw.weakTopics) ? (raw.weakTopics as string[]) : [],
    strongTopics: Array.isArray(raw.strongTopics) ? (raw.strongTopics as string[]) : [],
    order: (raw.order as number) ?? 0,
  };
}

function normalizeChapter(raw: Record<string, unknown> & { id: string }): ChapterDoc {
  const difficulty = (raw.difficulty as ChapterDoc["difficulty"]) ?? "Medium";
  return {
    id: raw.id,
    subjectId: (raw.subjectId as string) ?? "",
    title: (raw.title as string) ?? (raw.chapterName as string) ?? "Untitled chapter",
    titleKn: (raw.titleKn as string) ?? undefined,
    progress: (raw.progress as number) ?? 0,
    done: Boolean(raw.done),
    difficulty,
    order: (raw.order as number) ?? 0,
    chapterName: (raw.chapterName as string) ?? undefined,
    chapterNumber: (raw.chapterNumber as number) ?? undefined,
    textbookUrl: (raw.textbookUrl as string) ?? undefined,
    notesUrl: (raw.notesUrl as string) ?? undefined,
    worksheetUrl: (raw.worksheetUrl as string) ?? undefined,
    videoUrls: Array.isArray(raw.videoUrls) ? (raw.videoUrls as string[]) : [],
    mcqCount: (raw.mcqCount as number) ?? 0,
    estimatedStudyTime: (raw.estimatedStudyTime as number) ?? 0,
    importantTopics: Array.isArray(raw.importantTopics) ? (raw.importantTopics as string[]) : [],
    formulas: Array.isArray(raw.formulas)
      ? (raw.formulas as ChapterDoc["formulas"])
      : [],
    learningObjectives: Array.isArray(raw.learningObjectives)
      ? (raw.learningObjectives as string[])
      : [],
  };
}