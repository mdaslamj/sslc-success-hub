import { doc, setDoc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { SyllabusImportPayload, SyllabusChapterInput } from "../syllabus/types";

const META_COLLECTION = "_meta";
const SYLLABUS_DOC = "syllabus";

function chapterDocId(subjectId: string, ch: SyllabusChapterInput): string {
  return ch.id ?? `${subjectId}_ch${String(ch.chapterNumber).padStart(2, "0")}`;
}

/**
 * Bulk-import a syllabus into Firestore. Idempotent — re-running overwrites
 * subjects/chapters/resources by deterministic doc id.
 */
export async function importSyllabus(
  payload: SyllabusImportPayload,
): Promise<{ subjects: number; chapters: number; resources: number }> {
  const batch = writeBatch(db);
  let chapterCount = 0;
  let resourceCount = 0;

  payload.subjects.forEach((s, subjectOrder) => {
    const subjectRef = doc(db, COLLECTIONS.SUBJECTS, s.id);
    batch.set(
      subjectRef,
      {
        name: s.name,
        nameKn: s.nameKn ?? null,
        emoji: s.emoji,
        color: s.color,
        completion: 0,
        mastery: 0,
        target: s.target ?? 90,
        predicted: 0,
        chaptersTotal: s.chapters.length,
        chaptersDone: 0,
        weakTopics: [],
        strongTopics: [],
        order: subjectOrder,
        board: payload.board,
      },
      { merge: true },
    );

    s.chapters.forEach((c, i) => {
      const chId = chapterDocId(s.id, c);
      const chRef = doc(db, COLLECTIONS.CHAPTERS, chId);
      batch.set(
        chRef,
        {
          subjectId: s.id,
          title: c.chapterName,
          titleKn: c.chapterNameKn ?? null,
          chapterName: c.chapterName,
          chapterNumber: c.chapterNumber,
          textbookUrl: c.textbookUrl ?? null,
          notesUrl: c.notesUrl ?? null,
          worksheetUrl: c.worksheetUrl ?? null,
          videoUrls: c.videoUrls ?? [],
          mcqCount: c.mcqCount ?? 0,
          estimatedStudyTime: c.estimatedStudyTime ?? 0,
          difficulty: c.difficulty ?? "Medium",
          progress: 0,
          done: false,
          order: i,
        },
        { merge: true },
      );
      chapterCount++;

      // Materialise resources collection from URL fields for queryability.
      const resources: { kind: string; title: string; url: string }[] = [];
      if (c.textbookUrl) resources.push({ kind: "textbook", title: "Textbook", url: c.textbookUrl });
      if (c.notesUrl) resources.push({ kind: "notes", title: "Notes", url: c.notesUrl });
      if (c.worksheetUrl) resources.push({ kind: "worksheet", title: "Worksheet", url: c.worksheetUrl });
      (c.videoUrls ?? []).forEach((url, vi) =>
        resources.push({ kind: "video", title: `Video ${vi + 1}`, url }),
      );
      resources.forEach((r, ri) => {
        const rid = `${chId}_${r.kind}_${ri}`;
        const rref = doc(db, COLLECTIONS.RESOURCES, rid);
        batch.set(rref, {
          subjectId: s.id,
          chapterId: chId,
          kind: r.kind,
          title: r.title,
          url: r.url,
          order: ri,
        });
        resourceCount++;
      });
    });
  });

  await batch.commit();

  await setDoc(doc(db, META_COLLECTION, SYLLABUS_DOC), {
    board: payload.board,
    importedAt: Date.now(),
    subjects: payload.subjects.length,
    chapters: chapterCount,
    resources: resourceCount,
  });

  return { subjects: payload.subjects.length, chapters: chapterCount, resources: resourceCount };
}

/** Parse + validate a JSON string into a SyllabusImportPayload (throws on bad shape). */
export function parseSyllabusJson(raw: string): SyllabusImportPayload {
  const data = JSON.parse(raw);
  if (!data || typeof data !== "object") throw new Error("Root must be an object");
  if (typeof data.board !== "string") throw new Error("Missing `board` string");
  if (!Array.isArray(data.subjects)) throw new Error("Missing `subjects` array");
  data.subjects.forEach((s: unknown, i: number) => {
    const sub = s as Record<string, unknown>;
    if (typeof sub.id !== "string") throw new Error(`subjects[${i}].id missing`);
    if (typeof sub.name !== "string") throw new Error(`subjects[${i}].name missing`);
    if (!Array.isArray(sub.chapters)) throw new Error(`subjects[${i}].chapters missing`);
  });
  return data as SyllabusImportPayload;
}