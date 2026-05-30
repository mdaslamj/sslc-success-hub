import { SAMPLE_CHAPTERS } from "@/lib/taskPriorityEngine";

export type SchoolTestType = "unit_test" | "sa1" | "sa2";
export type MarksEntryMode = "quick" | "detailed";

export const SCHOOL_MARK_SUBJECTS = [
  { id: "science", label: "Science" },
  { id: "math", label: "Math" },
  { id: "social", label: "Social" },
  { id: "english", label: "English" },
  { id: "kannada", label: "Kannada" },
  { id: "hindi", label: "Hindi" },
] as const;

const LANGUAGE_CHAPTERS = [
  { id: "general-1", title: "Unit 1 — General", subjectId: "english" },
  { id: "general-2", title: "Unit 2 — General", subjectId: "english" },
  { id: "general-3", title: "Unit 3 — General", subjectId: "english" },
];

export function chaptersForSubject(subjectId: string) {
  const fromSample = SAMPLE_CHAPTERS.filter((ch) => ch.subjectId === subjectId);
  if (fromSample.length > 0) return fromSample;
  if (subjectId === "english" || subjectId === "kannada" || subjectId === "hindi") {
    return LANGUAGE_CHAPTERS.map((ch) => ({
      ...ch,
      id: `${subjectId}-${ch.id}`,
      subjectId,
      blueprintMarks: 4,
      mastery: 50,
    }));
  }
  return [];
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateSchoolTestId(
  prefix: string,
  schoolId: string,
  subjectId: string,
  chapterId: string,
  date: string,
  testType: SchoolTestType,
): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${schoolId.slice(0, 8)}-${subjectId}-${chapterId}-${date}-${testType}-${suffix}`;
}

export type QuestionColumn = {
  id: string;
  maxMarks: number;
};

/** Default question columns for detailed mode based on total marks. */
export function defaultQuestionColumns(totalMarks: number, count?: number): QuestionColumn[] {
  if (totalMarks <= 10) {
    return [1, 2, 3, 4, 5].map((n) => ({ id: `Q${n}`, maxMarks: 2 }));
  }

  const questionCount = count ?? 8;
  const base = Math.floor(totalMarks / questionCount);
  const remainder = totalMarks % questionCount;

  return Array.from({ length: questionCount }, (_, index) => ({
    id: `Q${index + 1}`,
    maxMarks: base + (index < remainder ? 1 : 0),
  }));
}

export function redistributeQuestionMarks(
  columns: QuestionColumn[],
  totalMarks: number,
): QuestionColumn[] {
  if (columns.length === 0) return defaultQuestionColumns(totalMarks);
  const base = Math.floor(totalMarks / columns.length);
  const remainder = totalMarks % columns.length;
  return columns.map((col, index) => ({
    ...col,
    maxMarks: base + (index < remainder ? 1 : 0),
  }));
}

export function scorePercent(scored: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((scored / total) * 100);
}

export function scoreColorClass(percent: number): string {
  if (percent >= 70) return "text-green-400";
  if (percent >= 50) return "text-amber-300";
  return "text-red-400";
}
