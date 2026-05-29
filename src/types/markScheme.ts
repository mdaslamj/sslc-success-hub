export interface MarkPoint {
  id: string;
  description: string;
  marks: number;
  mandatory: boolean;
  alternatives: string[];
  gapType: "conceptual" | "procedural" | "expression";
}

export interface MarkSchemeQuestion {
  id: string;
  questionText: string;
  chapterIds: string[];
  subjectId: string;
  totalMarks: number;
  markPoints: MarkPoint[];
  keyTerms: string[];
  requiresDiagram: boolean;
  diagramDescription?: string;
  acceptableAlternatives: string[];
  commonErrors: string[];
}

export type MarkSchemeExamType = "sa1" | "sa2" | "preparatory" | "board" | "chapter";

export interface MarkScheme {
  id: string;
  paperId: string;
  subject: string;
  examType: MarkSchemeExamType;
  year: number;
  totalMarks: number;
  questions: MarkSchemeQuestion[];
  validatedByExpert: boolean;
  createdAt: string;
  version: number;
}
