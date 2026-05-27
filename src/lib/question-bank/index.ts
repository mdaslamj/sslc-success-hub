/**
 * Question Bank — migrated SSLC question banks only.
 *
 * Usage:
 *   import { getQuestionsByChapter, SUBJECTS } from "@/lib/question-bank"
 */

export {
  SUBJECTS,
  getChaptersBySubject,
  getQuestionsByChapter,
  getQuestionsBySubject,
  getChapterQuestionCount,
  getSubjectByChapterId,
  toEngineQuestions,
  mapSubjectIdToEngineSubject,
  type BankQuestion,
  type Chapter,
  type Subject,
} from "@/lib/migrated-question-bank";

/** @deprecated Use BankQuestion from migrated-question-bank */
export type { BankQuestion as Question } from "@/lib/migrated-question-bank";
