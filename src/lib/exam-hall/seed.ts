import type { ExamHallSection } from "@/integrations/firebase/types";

/**
 * Default SSLC-style paper blueprint used when the hall is launched
 * without an explicit catalog exam attached. Mirrors KSEAB pattern:
 * MCQ + Short + Long + Diagram, total 80 marks / 3 hours.
 */
export const DEFAULT_HALL_SECTIONS: ExamHallSection[] = [
  {
    id: "sec-a",
    title: "Section A · Multiple choice",
    kind: "mcq",
    durationSec: 30 * 60,
    recommendedOrder: 1,
    questions: Array.from({ length: 8 }).map((_, i) => ({
      id: `mcq-${i + 1}`,
      prompt: `MCQ ${i + 1}: Select the correct option from your study material.`,
      marks: 1,
      kind: "mcq",
    })),
  },
  {
    id: "sec-b",
    title: "Section B · Short answers",
    kind: "short",
    durationSec: 45 * 60,
    recommendedOrder: 2,
    questions: Array.from({ length: 6 }).map((_, i) => ({
      id: `short-${i + 1}`,
      prompt: `Short Answer ${i + 1}: Explain the concept in 3–4 lines with one example.`,
      marks: 2,
      kind: "short",
      keywords: ["definition", "example"],
    })),
  },
  {
    id: "sec-c",
    title: "Section C · Long answers",
    kind: "long",
    durationSec: 60 * 60,
    recommendedOrder: 3,
    questions: Array.from({ length: 4 }).map((_, i) => ({
      id: `long-${i + 1}`,
      prompt: `Long Answer ${i + 1}: Derive / explain with proper structure, steps, and conclusion.`,
      marks: 5,
      kind: "long",
      keywords: ["intro", "steps", "conclusion"],
    })),
  },
  {
    id: "sec-d",
    title: "Section D · Diagram / Case study",
    kind: "diagram",
    durationSec: 45 * 60,
    recommendedOrder: 4,
    questions: Array.from({ length: 2 }).map((_, i) => ({
      id: `diag-${i + 1}`,
      prompt: `Diagram ${i + 1}: Draw and label the diagram clearly with arrows and titles.`,
      marks: 5,
      kind: "diagram",
      keywords: ["labels", "title", "arrows"],
    })),
  },
];

export function defaultHallBlueprint() {
  const totalMarks = DEFAULT_HALL_SECTIONS.reduce(
    (sum, s) => sum + s.questions.reduce((a, q) => a + q.marks, 0),
    0,
  );
  const totalDurationSec = DEFAULT_HALL_SECTIONS.reduce(
    (sum, s) => sum + s.durationSec,
    0,
  );
  return {
    sections: DEFAULT_HALL_SECTIONS,
    totalMarks,
    totalDurationSec,
  };
}