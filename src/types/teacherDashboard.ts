export interface ClassAnalytics {
  schoolId: string;
  subjectId: string;
  totalStudents: number;
  activeStudents: number;
  lastUpdated: string;
  chapterAnalytics: ChapterClassAnalytics[];
  subjectSummary: SubjectClassSummary;
}

export interface ChapterClassAnalytics {
  chapterId: string;
  chapterName: string;
  blueprintMarks: number;
  averageMastery: number;
  studentsAtRisk: number;
  studentsStable: number;
  studentsStrong: number;
  primaryGapType: "conceptual" | "procedural" | "expression" | "none";
  trendLastWeek: "improving" | "stable" | "declining";
}

export interface SubjectClassSummary {
  averagePredictedScore: number;
  studentsOnTrack: number;
  studentsAtRisk: number;
  topChapter: string;
  weakestChapter: string;
  recommendedFocus: string;
}
