export interface ExamQuestion {
  id: string;
  number: string;
  text: string;
  marks: number;
  type: "mcq" | "short" | "long" | "diagram";
  part: "A" | "B" | "C";
  chapterId: string;
  hasChoice: boolean;
  choiceWith?: string;
}

export interface ExamPaper {
  id: string;
  subject: string;
  year: number;
  totalMarks: number;
  duration: number;
  sections: ExamSection[];
  questions: ExamQuestion[];
}

export interface ExamSection {
  id: string;
  name: string;
  marks: number;
  questionIds: string[];
}

export interface StudentExamSession {
  paperId: string;
  studentId: string;
  startTime: string;
  endTime?: string;
  timeRemaining: number;
  answers: Record<string, string>;
  status: "in-progress" | "submitted" | "abandoned";
  marksMode: "self-mark" | "upload";
}

export interface PersistedExamSession extends StudentExamSession {
  currentIndex: number;
  flagged: string[];
  choiceSelections: Record<string, string>;
  selfMarks?: Record<string, "zero" | "partial" | "full">;
  submittedPhase?: "choice" | "self-mark" | "complete";
  timeTakenSeconds?: number;
}

export const EXAM_SESSION_STORAGE_KEY = "aura_exam_session";
