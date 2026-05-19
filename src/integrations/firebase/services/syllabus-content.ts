import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  ChapterNoteDoc,
  ChapterResourceDoc,
  ResourceKind,
  SyllabusContentDoc,
  TextbookLinkDoc,
} from "../types";

/* ---------------- syllabusContent ---------------- */

export async function fetchSyllabusContent(
  chapterId: string,
): Promise<SyllabusContentDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.SYLLABUS_CONTENT, chapterId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<SyllabusContentDoc, "id">) };
}

export async function fetchSyllabusContentForSubject(
  subjectId: string,
): Promise<SyllabusContentDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.SYLLABUS_CONTENT),
    where("subjectId", "==", subjectId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<SyllabusContentDoc, "id">),
  }));
}

export async function upsertSyllabusContent(
  d: Omit<SyllabusContentDoc, "updatedAt"> & { updatedAt?: number },
): Promise<void> {
  const payload: Omit<SyllabusContentDoc, "id"> = {
    subjectId: d.subjectId,
    chapterId: d.chapterId,
    chapterNumber: d.chapterNumber,
    chapterName: d.chapterName,
    chapterNameKn: d.chapterNameKn,
    summary: d.summary,
    summaryKn: d.summaryKn,
    importantTopics: d.importantTopics ?? [],
    formulas: d.formulas ?? [],
    learningObjectives: d.learningObjectives ?? [],
    board: d.board,
    updatedAt: d.updatedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.SYLLABUS_CONTENT, d.id), payload, {
    merge: true,
  });
}

/* ---------------- chapterResources ---------------- */

export async function fetchChapterResources(
  chapterId: string,
): Promise<ChapterResourceDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.CHAPTER_RESOURCES),
    where("chapterId", "==", chapterId),
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ChapterResourceDoc, "id">),
  }));
  return rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function fetchSubjectResources(
  subjectId: string,
): Promise<ChapterResourceDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.CHAPTER_RESOURCES),
    where("subjectId", "==", subjectId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ChapterResourceDoc, "id">),
  }));
}

/** Group resources by kind for the chapter UI. */
export function groupResourcesByKind(
  resources: ChapterResourceDoc[],
): Record<ResourceKind, ChapterResourceDoc[]> {
  const empty: Record<ResourceKind, ChapterResourceDoc[]> = {
    textbook: [],
    notes: [],
    worksheet: [],
    video: [],
    pyq: [],
    revision: [],
    kannada: [],
    other: [],
  };
  for (const r of resources) {
    (empty[r.kind] ??= []).push(r);
  }
  return empty;
}

export async function upsertChapterResource(
  r: Omit<ChapterResourceDoc, "createdAt"> & { createdAt?: number },
): Promise<void> {
  const payload: Omit<ChapterResourceDoc, "id"> = {
    subjectId: r.subjectId,
    chapterId: r.chapterId,
    kind: r.kind,
    title: r.title,
    url: r.url,
    language: r.language,
    storagePath: r.storagePath,
    tags: r.tags ?? [],
    order: r.order ?? 0,
    createdAt: r.createdAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.CHAPTER_RESOURCES, r.id), payload, {
    merge: true,
  });
}

/* ---------------- textbookLinks ---------------- */

export async function fetchTextbookLink(
  chapterId: string,
): Promise<TextbookLinkDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.TEXTBOOK_LINKS, chapterId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<TextbookLinkDoc, "id">) };
}

export async function upsertTextbookLink(
  t: Omit<TextbookLinkDoc, "updatedAt"> & { updatedAt?: number },
): Promise<void> {
  const payload: Omit<TextbookLinkDoc, "id"> = {
    subjectId: t.subjectId,
    chapterId: t.chapterId,
    publisher: t.publisher,
    edition: t.edition,
    language: t.language,
    title: t.title,
    url: t.url,
    pageStart: t.pageStart,
    pageEnd: t.pageEnd,
    updatedAt: t.updatedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.TEXTBOOK_LINKS, t.id), payload, {
    merge: true,
  });
}

/* ---------------- chapterNotes ---------------- */

export async function fetchChapterNote(
  chapterId: string,
): Promise<ChapterNoteDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CHAPTER_NOTES, chapterId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ChapterNoteDoc, "id">) };
}

export async function upsertChapterNote(
  n: Omit<ChapterNoteDoc, "updatedAt"> & { updatedAt?: number },
): Promise<void> {
  const payload: Omit<ChapterNoteDoc, "id"> = {
    subjectId: n.subjectId,
    chapterId: n.chapterId,
    title: n.title,
    body: n.body,
    url: n.url,
    language: n.language,
    storagePath: n.storagePath,
    updatedAt: n.updatedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.CHAPTER_NOTES, n.id), payload, {
    merge: true,
  });
}

/**
 * Bulk-batched upsert used by the syllabus importer. Splits into 450-op
 * chunks to stay under Firestore's 500-op batch limit.
 */
export async function bulkUpsertSyllabus(payload: {
  content: SyllabusContentDoc[];
  resources: ChapterResourceDoc[];
  textbooks: TextbookLinkDoc[];
  notes: ChapterNoteDoc[];
}): Promise<{ content: number; resources: number; textbooks: number; notes: number }> {
  const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];

  for (const c of payload.content) {
    ops.push({
      ref: doc(db, COLLECTIONS.SYLLABUS_CONTENT, c.id),
      data: { ...c, updatedAt: c.updatedAt ?? Date.now() },
    });
  }
  for (const r of payload.resources) {
    ops.push({
      ref: doc(db, COLLECTIONS.CHAPTER_RESOURCES, r.id),
      data: { ...r, createdAt: r.createdAt ?? Date.now() },
    });
  }
  for (const t of payload.textbooks) {
    ops.push({
      ref: doc(db, COLLECTIONS.TEXTBOOK_LINKS, t.id),
      data: { ...t, updatedAt: t.updatedAt ?? Date.now() },
    });
  }
  for (const n of payload.notes) {
    ops.push({
      ref: doc(db, COLLECTIONS.CHAPTER_NOTES, n.id),
      data: { ...n, updatedAt: n.updatedAt ?? Date.now() },
    });
  }

  const chunkSize = 450;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + chunkSize)) {
      // Strip undefined fields — Firestore rejects them.
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(op.data)) {
        if (v !== undefined) clean[k] = v;
      }
      batch.set(op.ref, clean, { merge: true });
    }
    await batch.commit();
  }

  return {
    content: payload.content.length,
    resources: payload.resources.length,
    textbooks: payload.textbooks.length,
    notes: payload.notes.length,
  };
}
