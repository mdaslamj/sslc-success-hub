/**
 * Question Bank — Master Index
 * Central registry for all subjects, chapters, and questions.
 *
 * Usage:
 *   import { getQuestionsByChapter, SUBJECTS } from "@/lib/question-bank"
 *
 *   const questions = getQuestionsByChapter("physics-light")
 *   const chapters  = getChaptersBySubject("Science")
 */

import type { Question } from "@/hooks/use-exam-engine";
import { scienceChapters } from "./science";
import { socialScienceChapters } from "./social-science";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Chapter = {
  id: string;
  name: string;
  questions: Question[];
};

export type Subject = {
  id: string;
  name: string;
  icon: string;
  color: string;   // Tailwind bg colour class
  chapters: Chapter[];
};

// ---------------------------------------------------------------------------
// Subject registry
// ---------------------------------------------------------------------------

export const SUBJECTS: Subject[] = [
  {
    id: "science",
    name: "Science",
    icon: "🔬",
    color: "bg-blue-500",
    chapters: scienceChapters,
  },
  {
    id: "social-science",
    name: "Social Science",
    icon: "🌍",
    color: "bg-green-500",
    chapters: socialScienceChapters,
  },
  // Maths will be added here once the question bank is populated
  // {
  //   id: "maths",
  //   name: "Mathematics",
  //   icon: "📐",
  //   color: "bg-purple-500",
  //   chapters: mathsChapters,
  // },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Get all chapters for a given subject id */
export function getChaptersBySubject(subjectId: string): Chapter[] {
  return SUBJECTS.find((s) => s.id === subjectId)?.chapters ?? [];
}

/** Get all questions for a given chapter id */
export function getQuestionsByChapter(chapterId: string): Question[] {
  for (const subject of SUBJECTS) {
    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (chapter) return chapter.questions;
  }
  return [];
}

/** Get all questions across a whole subject */
export function getQuestionsBySubject(subjectId: string): Question[] {
  return getChaptersBySubject(subjectId).flatMap((c) => c.questions);
}

/** Get total question count for a chapter */
export function getChapterQuestionCount(chapterId: string): number {
  return getQuestionsByChapter(chapterId).length;
}

/** Get subject metadata for a given chapter id */
export function getSubjectByChapterId(chapterId: string): Subject | null {
  return SUBJECTS.find((s) => s.chapters.some((c) => c.id === chapterId)) ?? null;
}
