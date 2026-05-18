import type { SubjectDoc, ChapterDoc, ResourceDoc } from "../types";

/** Minimal chapter payload an admin provides for bulk import. */
export type SyllabusChapterInput = {
  id?: string; // optional — auto-derived from subjectId + chapterNumber if absent
  chapterName: string;
  chapterNameKn?: string;
  chapterNumber: number;
  textbookUrl?: string;
  notesUrl?: string;
  worksheetUrl?: string;
  videoUrls?: string[];
  mcqCount?: number;
  estimatedStudyTime?: number;
  difficulty?: ChapterDoc["difficulty"];
};

export type SyllabusSubjectInput = {
  id: string;
  name: string;
  nameKn?: string;
  emoji: string;
  color: string;
  target?: number;
  chapters: SyllabusChapterInput[];
};

export type SyllabusImportPayload = {
  board: string; // e.g. "Karnataka SSLC"
  subjects: SyllabusSubjectInput[];
};

export type { SubjectDoc, ChapterDoc, ResourceDoc };