import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./config";
import type { ChapterDoc, SubjectDoc } from "./types";

// New canonical Firestore layout:
//   subject/{subjectId}                 -> subject metadata doc (may be sparse)
//   subject/{subjectId}/chapters/{id}   -> chapter docs
const SUBJECT_COLLECTION = "subject";
const CHAPTERS_SUBCOLLECTION = "chapters";
const KNOWN_SUBJECT_IDS = [
  "mathematics",
  "science",
  "social-science",
  "english",
  "kannada",
  "hindi",
] as const;
const SUBJECT_ID_ALIASES: Record<string, string> = {
  math: "mathematics",
  social: "social-science",
};

/** Fetch all subjects from the top-level `subject` collection. */
export async function fetchSubjects(): Promise<SubjectDoc[]> {
  const snap = await getDocs(collection(db, SUBJECT_COLLECTION));
  const byId = new Map<string, Record<string, unknown> & { id: string }>();

  for (const d of snap.docs) {
    const canonicalId = SUBJECT_ID_ALIASES[d.id] ?? d.id;
    const next = { id: canonicalId, ...(d.data() as Record<string, unknown>) };
    const prev = byId.get(canonicalId);
    byId.set(canonicalId, prev ? { ...prev, ...next } : next);
  }

  for (const id of KNOWN_SUBJECT_IDS) {
    if (!byId.has(id)) byId.set(id, { id });
  }

  const rows = Array.from(byId.values()).map(normalizeSubject);
  console.log("[subjects] subjects loaded", rows.map((r) => r.id));

  // Fetch live chapter counts from `subject/{id}/chapters` in parallel so
  // each card shows the real total instead of a stale `chaptersTotal` field.
  await Promise.all(
    rows.map(async (row) => {
      try {
        const c = await getCountFromServer(
          collection(db, SUBJECT_COLLECTION, row.id, CHAPTERS_SUBCOLLECTION),
        );
        const count = c.data().count;
        console.log(`[subjects] chapters fetched for ${row.id}: ${count}`);
        if (count > 0 || !row.chaptersTotal) {
          row.chaptersTotal = count;
        }
        if (row.chaptersDone > row.chaptersTotal) row.chaptersDone = row.chaptersTotal;
        console.log(`[subjects] chapter count for ${row.id}: ${row.chaptersDone}/${row.chaptersTotal}`);
      } catch (err) {
        console.warn(`[subjects] chapter count failed for ${row.id}`, err);
      }
    }),
  );

  return rows.sort((a, b) => {
    const orderA = a.order ?? KNOWN_SUBJECT_IDS.indexOf(a.id as (typeof KNOWN_SUBJECT_IDS)[number]);
    const orderB = b.order ?? KNOWN_SUBJECT_IDS.indexOf(b.id as (typeof KNOWN_SUBJECT_IDS)[number]);
    return (orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA) - (orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB);
  });
}

/** Fetch a single subject doc by id from `subject/{subjectId}`. */
export async function fetchSubject(subjectId: string): Promise<SubjectDoc | null> {
  const ref = doc(db, SUBJECT_COLLECTION, subjectId);
  const snap = await getDoc(ref);
  // Even if the parent doc is empty (chapters live in a subcollection),
  // return a normalized placeholder so the UI can still render.
  if (!snap.exists()) return normalizeSubject({ id: subjectId });
  return normalizeSubject({ id: snap.id, ...(snap.data() as Record<string, unknown>) });
}

/** Fetch chapters from `subject/{subjectId}/chapters`. */
export async function fetchChapters(subjectId: string): Promise<ChapterDoc[]> {
  const snap = await getDocs(
    collection(db, SUBJECT_COLLECTION, subjectId, CHAPTERS_SUBCOLLECTION),
  );
  const rows = snap.docs.map((d) =>
    normalizeChapter({
      id: d.id,
      subjectId,
      ...(d.data() as Record<string, unknown>),
    }),
  );
  return rows.sort(
    (a, b) => (a.chapterNumber ?? a.order ?? 0) - (b.chapterNumber ?? b.order ?? 0),
  );
}

function normalizeSubject(raw: Record<string, unknown> & { id: string }): SubjectDoc {
  const subjectDefaults: Record<string, { name: string; nameKn?: string; emoji: string; color: string }> = {
    mathematics: { name: "Mathematics", nameKn: "ಗಣಿತ", emoji: "🔢", color: "#6366f1" },
    math: { name: "Mathematics", nameKn: "ಗಣಿತ", emoji: "🔢", color: "#6366f1" },
    science: { name: "Science", nameKn: "ವಿಜ್ಞಾನ", emoji: "🔬", color: "#10b981" },
    "social-science": { name: "Social Science", nameKn: "ಸಮಾಜ ವಿಜ್ಞಾನ", emoji: "🌍", color: "#f59e0b" },
    social: { name: "Social Science", nameKn: "ಸಮಾಜ ವಿಜ್ಞಾನ", emoji: "🌍", color: "#f59e0b" },
    english: { name: "English", emoji: "🔤", color: "#ef4444" },
    kannada: { name: "Kannada", nameKn: "ಕನ್ನಡ", emoji: "✍️", color: "#8b5cf6" },
    hindi: { name: "Hindi", nameKn: "हिन्दी", emoji: "📖", color: "#ec4899" },
  };
  const fallback = subjectDefaults[raw.id] ?? { name: raw.id, emoji: "📘", color: "#6366f1" };
  return {
    id: raw.id,
    name: (raw.name as string) ?? (raw.title as string) ?? fallback.name,
    nameKn: (raw.nameKn as string) ?? fallback.nameKn,
    emoji: (raw.emoji as string) ?? fallback.emoji,
    color: (raw.color as string) ?? fallback.color,
    completion: (raw.completion as number) ?? 0,
    mastery: (raw.mastery as number) ?? 0,
    target: (raw.target as number) ?? 90,
    predicted: (raw.predicted as number) ?? 0,
    chaptersTotal: (raw.chaptersTotal as number) ?? 0,
    chaptersDone: (raw.chaptersDone as number) ?? 0,
    weakTopics: Array.isArray(raw.weakTopics) ? (raw.weakTopics as string[]) : [],
    strongTopics: Array.isArray(raw.strongTopics) ? (raw.strongTopics as string[]) : [],
    order:
      (raw.order as number) ??
      KNOWN_SUBJECT_IDS.indexOf(raw.id as (typeof KNOWN_SUBJECT_IDS)[number]),
  };
}

function normalizeChapter(raw: Record<string, unknown> & { id: string }): ChapterDoc {
  const difficulty = (raw.difficulty as ChapterDoc["difficulty"]) ?? "Medium";
  return {
    id: raw.id,
    subjectId: (raw.subjectId as string) ?? "",
    title:
      (raw.title as string) ??
      (raw.chapterName as string) ??
      (raw.name as string) ??
      raw.id,
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