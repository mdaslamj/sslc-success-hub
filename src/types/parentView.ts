export interface ParentSummary {
  studentName: string;
  examDate: string;
  daysUntilExam: number;
  overallReadiness: "on-track" | "needs-attention" | "at-risk";
  weeklyActivity: {
    sessionsCompleted: number;
    studyMinutes: number;
    streakDays: number;
  };
  subjectSummaries: SubjectParentSummary[];
  recentWin: string;
  focusArea: string;
  parentMessage: string;
  lastUpdated: string;
}

export interface SubjectParentSummary {
  subjectId: string;
  subjectName: string;
  color: string;
  status: "strong" | "improving" | "needs-work";
  statusLabel: string;
  trend: "up" | "stable" | "down";
}

export interface ParentShareDoc {
  token: string;
  studentId: string;
  summary: ParentSummary;
  createdAt: string;
  expiresAt: string;
}
