import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { SyllabusImportPayload, SyllabusChapterInput } from "../syllabus/types";
import type {
  ChapterNoteDoc,
  ChapterResourceDoc,
  ResourceKind,
  SyllabusContentDoc,
  TextbookLinkDoc,
} from "../types";
import { bulkUpsertSyllabus } from "./syllabus-content";

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

  // Track ids we are about to write so we can prune anything stale afterwards.
  const keepChapterIdsBySubject = new Map<string, Set<string>>();
  const keepResourceIdsBySubject = new Map<string, Set<string>>();

  // Structured-content payload — written separately into the new collections.
  const contentDocs: SyllabusContentDoc[] = [];
  const chapterResourceDocs: ChapterResourceDoc[] = [];
  const textbookLinkDocs: TextbookLinkDoc[] = [];
  const chapterNoteDocs: ChapterNoteDoc[] = [];
  const now = Date.now();

  payload.subjects.forEach((s, subjectOrder) => {
    const keepCh = new Set<string>();
    const keepRes = new Set<string>();
    keepChapterIdsBySubject.set(s.id, keepCh);
    keepResourceIdsBySubject.set(s.id, keepRes);

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
      keepCh.add(chId);
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
          importantTopics: c.importantTopics ?? [],
          formulas: c.formulas ?? [],
          learningObjectives: c.learningObjectives ?? [],
          progress: 0,
          done: false,
          order: i,
        },
        { merge: true },
      );
      chapterCount++;

      // ---- Structured-content writes (new architecture) ----------------
      contentDocs.push({
        id: chId,
        subjectId: s.id,
        chapterId: chId,
        chapterNumber: c.chapterNumber,
        chapterName: c.chapterName,
        chapterNameKn: c.chapterNameKn,
        summary: c.summary,
        summaryKn: c.summaryKn,
        importantTopics: c.importantTopics ?? [],
        formulas: c.formulas ?? [],
        learningObjectives: c.learningObjectives ?? [],
        board: payload.board,
        updatedAt: now,
      });

      if (c.textbookUrl) {
        textbookLinkDocs.push({
          id: chId,
          subjectId: s.id,
          chapterId: chId,
          publisher: c.textbookPublisher,
          edition: c.textbookEdition,
          language: "en",
          title: `${c.chapterName} — Textbook`,
          url: c.textbookUrl,
          updatedAt: now,
        });
      }

      if (c.notesUrl) {
        chapterNoteDocs.push({
          id: chId,
          subjectId: s.id,
          chapterId: chId,
          title: `${c.chapterName} — Notes`,
          url: c.notesUrl,
          language: "en",
          updatedAt: now,
        });
      }

      // Build the per-resource flat collection (chapterResources).
      const pushResource = (
        kind: ResourceKind,
        title: string,
        url: string,
        idx: number,
        language?: string,
        tags?: string[],
      ) => {
        const rid = `${chId}__${kind}__${idx}`;
        chapterResourceDocs.push({
          id: rid,
          subjectId: s.id,
          chapterId: chId,
          kind,
          title,
          url,
          language,
          tags,
          order: idx,
          createdAt: now,
        });
      };
      if (c.textbookUrl) pushResource("textbook", "Official textbook", c.textbookUrl, 0, "en");
      if (c.notesUrl) pushResource("notes", "Notes", c.notesUrl, 0, "en");
      if (c.worksheetUrl) pushResource("worksheet", "Worksheet", c.worksheetUrl, 0, "en");
      (c.videoUrls ?? []).forEach((url, vi) =>
        pushResource("video", `Video ${vi + 1}`, url, vi),
      );
      (c.pyqUrls ?? []).forEach((url, pi) =>
        pushResource("pyq", `Previous year paper ${pi + 1}`, url, pi, "en", ["pyq"]),
      );
      (c.revisionUrls ?? []).forEach((url, ri) =>
        pushResource("revision", `Revision notes ${ri + 1}`, url, ri),
      );
      if (c.kannadaNotesUrl)
        pushResource("kannada", "Kannada explanation", c.kannadaNotesUrl, 0, "kn");

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
        keepRes.add(rid);
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

  // Persist the structured-content collections in their own batched writes.
  if (
    contentDocs.length ||
    chapterResourceDocs.length ||
    textbookLinkDocs.length ||
    chapterNoteDocs.length
  ) {
    await bulkUpsertSyllabus({
      content: contentDocs,
      resources: chapterResourceDocs,
      textbooks: textbookLinkDocs,
      notes: chapterNoteDocs,
    });
  }

  // Prune stale chapter & resource docs left over from previous imports
  // (e.g. removed/renumbered chapters). Subjects themselves are not pruned
  // since multiple presets may co-exist.
  for (const s of payload.subjects) {
    const keepCh = keepChapterIdsBySubject.get(s.id) ?? new Set<string>();
    const keepRes = keepResourceIdsBySubject.get(s.id) ?? new Set<string>();

    const existingChapters = await getDocs(
      query(collection(db, COLLECTIONS.CHAPTERS), where("subjectId", "==", s.id)),
    );
    await Promise.all(
      existingChapters.docs
        .filter((d) => !keepCh.has(d.id))
        .map((d) => deleteDoc(d.ref)),
    );

    const existingResources = await getDocs(
      query(collection(db, COLLECTIONS.RESOURCES), where("subjectId", "==", s.id)),
    );
    await Promise.all(
      existingResources.docs
        .filter((d) => !keepRes.has(d.id))
        .map((d) => deleteDoc(d.ref)),
    );
  }

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