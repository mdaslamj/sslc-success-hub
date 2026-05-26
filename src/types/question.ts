export type Difficulty = "easy" | "medium" | "hard" | string;

export type QuestionType =
  | "mcq"
  | "1mark"
  | "2mark"
  | "3mark"
  | "4mark"
  | "hots"
  | "application"
  | "direct"
  | "calculation"
  | string;

export type CognitiveLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | string;

export type Subject =
  | "science"
  | "social_science"
  | "mathematics"
  | string;

export interface Question {
  id: string;
  subject: Subject;
  chapter: string;
  chapterId?: string;
  concept?: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  marks: number;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  estimatedTime?: number;
  cognitiveLevel?: CognitiveLevel;
  commonMistakes?: string[];
  conceptTags?: string[];
  examWeightage?: number;
  boardFrequency?: number;
}

export type ConfidenceLevel = "high" | "medium" | "guess" | "unsure";

export type MistakeTag =
  | "concept"
  | "calculation"
  | "formula"
  | "misread"
  | "guess"
  | "careless";

export type AttemptMode = "practice" | "timed" | "mock";

export type MoodState =
  | "focused"
  | "tired"
  | "anxious"
  | "motivated"
  | "distracted";

export interface QuestionAttempt {
  questionId: string;
  chapterId: string;
  subject: Subject;
  concept: string;
  timeTakenMs: number;
  selectedAnswer: string;
  isCorrect: boolean;
  confidenceLevel: ConfidenceLevel;
  mistakeTag?: MistakeTag;
  attemptMode: AttemptMode;
  sessionMood?: MoodState;
  timestamp: number;
}

export interface StudentLearningProfile {
  chapterMastery: Record<string, number>;
  weakConcepts: string[];
  misconceptionRisk: string[];
  recurringMistakes: {
    chapterId: string;
    mistakeType: MistakeTag;
    count: number;
  }[];
  avgSpeedMs: Record<string, number>;
  confidenceTrend: number[];
  pressureDelta: number;
  lastUpdated: number;
}
