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
  /** Key sub-topics inside the chapter — powers weak-topic analysis & revision planner. */
  importantTopics?: string[];
  /** Plain-text or LaTeX formulas the student should memorise. */
  formulas?: ChapterFormula[];
  /** Bloom's-style learning objectives — fuels AI recommendations later. */
  learningObjectives?: string[];
};

/** A single formula entry, kept structured so MCQ/AI generators can reason over it. */
export type ChapterFormula = {
  label: string;
  expression: string; // LaTeX or plain text
  description?: string;
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