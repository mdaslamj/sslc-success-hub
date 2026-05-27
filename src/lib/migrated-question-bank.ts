import type { Question as EngineQuestion } from "@/types/question";
import scienceBank from "../../public/content/question-banks/science_question_bank_v3_migrated.json";
import mathBank from "../../public/content/question-banks/math_question_bank_v3_migrated.json";
import socialScienceBank from "../../public/content/question-banks/social_science_question_bank_v3_migrated.json";

type MigratedQuestion = EngineQuestion & {
  _source?: string;
  _section?: string;
  _type?: string;
};

type MigratedBank = {
  meta: { subject: string };
  blueprint: { chapters: { id: number; name: string }[] };
  questions: MigratedQuestion[];
};

export type BankQuestion = {
  id: string;
  subject: string;
  chapter: string;
  chapterId: string;
  concept: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: EngineQuestion["questionType"];
  marks: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  estimatedTime?: number;
  cognitiveLevel?: EngineQuestion["cognitiveLevel"];
  commonMistakes?: string[];
};

export type Chapter = {
  id: string;
  name: string;
  questions: BankQuestion[];
};

export type Subject = {
  id: string;
  name: string;
  icon: string;
  color: string;
  chapters: Chapter[];
};

const BANK_CONFIG: {
  file: MigratedBank;
  id: string;
  name: string;
  icon: string;
  color: string;
  subject: EngineQuestion["subject"];
}[] = [
  {
    file: scienceBank as MigratedBank,
    id: "science",
    name: "Science",
    icon: "🔬",
    color: "bg-blue-500",
    subject: "science",
  },
  {
    file: mathBank as MigratedBank,
    id: "mathematics",
    name: "Mathematics",
    icon: "📐",
    color: "bg-purple-500",
    subject: "mathematics",
  },
  {
    file: socialScienceBank as MigratedBank,
    id: "social-science",
    name: "Social Science",
    icon: "🌍",
    color: "bg-green-500",
    subject: "social_science",
  },
];

function chapterIndexFromId(chapterId: string): number {
  const match = chapterId.match(/(\d+)/);
  return match ? Number(match[1]) - 1 : -1;
}

function chapterNameFromBlueprint(bank: MigratedBank, chapterId: string): string {
  const index = chapterIndexFromId(chapterId);
  return bank.blueprint.chapters[index]?.name ?? chapterId.replace(/[-_]/g, " ");
}

function normalizeQuestion(
  raw: MigratedQuestion,
  bank: MigratedBank,
  subjectLabel: string,
): BankQuestion {
  const chapterId = raw.chapterId ?? "unknown";
  const chapter =
    chapterNameFromBlueprint(bank, chapterId) || raw.chapter || chapterId;

  return {
    id: raw.id,
    subject: subjectLabel,
    chapter,
    chapterId,
    concept: raw.concept ?? "",
    difficulty:
      raw.difficulty === "easy" || raw.difficulty === "hard"
        ? raw.difficulty
        : "medium",
    questionType: raw.questionType ?? "mcq",
    marks: raw.marks ?? 1,
    question: raw.question,
    options: raw.options ?? [],
    correctAnswer: raw.correctAnswer,
    explanation: raw.explanation ?? "",
    estimatedTime: raw.estimatedTime,
    cognitiveLevel: raw.cognitiveLevel,
    commonMistakes: raw.commonMistakes,
  };
}

function buildSubject(config: (typeof BANK_CONFIG)[number]): Subject {
  const chaptersById = new Map<string, BankQuestion[]>();

  for (const raw of config.file.questions) {
    const chapterId = raw.chapterId ?? "unknown";
    const normalized = normalizeQuestion(raw, config.file, config.name);
    const existing = chaptersById.get(chapterId) ?? [];
    existing.push(normalized);
    chaptersById.set(chapterId, existing);
  }

  const chapters: Chapter[] = [...chaptersById.entries()]
    .sort(([a], [b]) => chapterIndexFromId(a) - chapterIndexFromId(b))
    .map(([id, questions]) => ({
      id,
      name: chapterNameFromBlueprint(config.file, id),
      questions,
    }));

  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    color: config.color,
    chapters,
  };
}

export const SUBJECTS: Subject[] = BANK_CONFIG.map(buildSubject);

export function getChaptersBySubject(subjectId: string): Chapter[] {
  return SUBJECTS.find((s) => s.id === subjectId)?.chapters ?? [];
}

export function getQuestionsByChapter(chapterId: string): BankQuestion[] {
  for (const subject of SUBJECTS) {
    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (chapter) return chapter.questions;
  }
  return [];
}

export function getQuestionsBySubject(subjectId: string): BankQuestion[] {
  return getChaptersBySubject(subjectId).flatMap((c) => c.questions);
}

export function getChapterQuestionCount(chapterId: string): number {
  return getQuestionsByChapter(chapterId).length;
}

export function getSubjectByChapterId(chapterId: string): Subject | null {
  return SUBJECTS.find((s) => s.chapters.some((c) => c.id === chapterId)) ?? null;
}

export function toEngineQuestions(questions: BankQuestion[]): EngineQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    subject: mapSubjectIdToEngineSubject(
      getSubjectByChapterId(q.chapterId)?.id ?? "science",
    ),
    chapter: q.chapter,
    chapterId: q.chapterId,
    concept: q.concept,
    difficulty: q.difficulty,
    questionType: q.questionType,
    marks: q.marks,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    estimatedTime: q.estimatedTime,
    cognitiveLevel: q.cognitiveLevel,
    commonMistakes: q.commonMistakes,
  }));
}

export function mapSubjectIdToEngineSubject(
  subjectId: string,
): EngineQuestion["subject"] {
  if (subjectId === "social-science") return "social_science";
  if (subjectId === "mathematics" || subjectId === "maths") return "mathematics";
  return "science";
}
