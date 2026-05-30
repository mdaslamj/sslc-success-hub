export type SchoolStatus = "active" | "inactive";

export type SchoolTeacherStatus = "active" | "pending";

export interface School {
  schoolId: string;
  name: string;
  dise_code: string;
  district: string;
  taluk: string;
  adminEmail: string;
  adminUid: string;
  /** Join code, e.g. KAR-XXXXXX */
  schoolCode: string;
  totalStudents: number;
  createdAt: string;
  status: SchoolStatus;
}

export interface SchoolTeacher {
  uid: string;
  email: string;
  name: string;
  subjects: string[];
  joinedAt: string;
  invitedBy: string;
  status: SchoolTeacherStatus;
}

export interface SubjectSharingPrefs {
  science: boolean;
  math: boolean;
  social: boolean;
  english: boolean;
  kannada: boolean;
  hindi: boolean;
}

export interface SchoolStudent {
  uid: string;
  rollNumber?: string;
  name: string;
  joinedAt: string;
  sharingLevel: number;
  subjectSharing: SubjectSharingPrefs;
  consentGiven: boolean;
  consentAt?: string;
  parentConsentGiven: boolean;
}

export interface SchoolRosterEntry {
  rollNumber: string;
  auraUid?: string;
  studentName: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export type UnitTestSource = "csv" | "manual" | "sheets" | "ocr" | "student";

export interface UnitTestQuestionBreakdown {
  questionId: string;
  label?: string;
  marks: number;
}

export interface UnitTest {
  testId: string;
  schoolId: string;
  subjectId: string;
  chapterId: string;
  teacherId: string;
  date: string;
  totalMarks: number;
  questionBreakdown: UnitTestQuestionBreakdown[];
  studentCount: number;
  source: UnitTestSource;
}

export interface UnitTestResult {
  studentId: string;
  schoolId: string;
  rollNumber?: string;
  totalMarks: number;
  scoredMarks: number;
  questionMarks: Record<string, number>;
  submittedAt: string;
  masteryUpdateApplied: boolean;
}

export type ChapterGapTrend = "up" | "down" | "flat";

export interface ChapterClassAnalytics {
  chapterId: string;
  chapterName: string;
  blueprintMarks: number;
  averageMastery: number;
  studentsAtRisk: number;
  studentsStable: number;
  studentsStrong: number;
  primaryGapType: string;
  trendLastWeek: ChapterGapTrend;
}

export interface ClassAnalyticsSubjectSummary {
  averagePredictedScore: number;
  studentsOnTrack: number;
  studentsAtRisk: number;
  weakestChapter: string;
  recommendedFocus: string;
}

export interface ClassAnalytics {
  schoolId: string;
  subjectId: string;
  totalStudents: number;
  activeStudents: number;
  lastUpdated: string;
  chapterAnalytics: ChapterClassAnalytics[];
  subjectSummary: ClassAnalyticsSubjectSummary;
}

/** Doc id convention: `{schoolId}_{subjectId}` */
export function classAnalyticsDocId(schoolId: string, subjectId: string): string {
  return `${schoolId}_${subjectId}`;
}
