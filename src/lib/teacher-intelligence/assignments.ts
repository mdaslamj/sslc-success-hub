/**
 * Assignment-engine helpers. Pure builders for the five assignment kinds.
 */
import type {
  AssignmentKind,
  ClassAssignmentDoc,
} from "@/integrations/firebase/types";

export type BuildAssignmentInput = {
  classId: string;
  teacherUid: string;
  kind: AssignmentKind;
  title: string;
  description?: string;
  subjectId?: string;
  chapterId?: string;
  dueAt?: number;
  totalStudents: number;
};

export function buildAssignment(input: BuildAssignmentInput): ClassAssignmentDoc {
  const now = Date.now();
  return {
    id: `assn_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    classId: input.classId,
    teacherUid: input.teacherUid,
    kind: input.kind,
    title: input.title,
    description: input.description,
    subjectId: input.subjectId,
    chapterId: input.chapterId,
    dueAt: input.dueAt,
    status: "active",
    totalStudents: input.totalStudents,
    completedStudents: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export const ASSIGNMENT_PRESETS: Record<
  AssignmentKind,
  { label: string; defaultTitle: (subject?: string) => string; emoji: string }
> = {
  chapter_practice: {
    label: "Chapter practice",
    defaultTitle: (s) => `${s ?? "Chapter"} — practice set`,
    emoji: "📘",
  },
  mock_exam: {
    label: "Mock exam",
    defaultTitle: (s) => `${s ?? "Class"} mock exam`,
    emoji: "📝",
  },
  formula_drill: {
    label: "Formula drill",
    defaultTitle: (s) => `${s ?? "Quick"} formula drill`,
    emoji: "🧮",
  },
  scan_submission: {
    label: "Scan submission",
    defaultTitle: () => "Submit handwritten answers",
    emoji: "📷",
  },
  revision_task: {
    label: "Revision task",
    defaultTitle: (s) => `${s ?? "Weak chapter"} revision`,
    emoji: "🔁",
  },
};