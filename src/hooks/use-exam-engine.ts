
/**
 * useExamEngine — central practice mode controller for AURA.
 *
 * Owns ALL exam state. Reusable for practice, timed, and mock modes.
 * NO JSX inside this hook — pure logic only.
 *
 * Per-question flow:
 *   1. Student sees question
 *   2. selectOption(option)  → stores selection only, NO grading yet
 *   3. checkAnswer()         → evaluates correctness, shows explanation
 *   4. setConfidence(level)  → student rates their confidence
 *   5. setMistakeTag(tag)    → (only if wrong) student tags the mistake type
 *   6. nextQuestion()        → advances index, resets ALL per-question state
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Question = {
  id: string;
  subject: string;
  chapter: string;
  concept: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: "mcq" | "1mark" | "2mark" | "long" | "hots";
  marks: number;
  question: string;
  options: string[];
  correctAnswer: string; // the text of the correct option
  explanation: string;
  estimatedTime?: number;
  cognitiveLevel?: "remember" | "understand" | "apply" | "analyze";
  commonMistakes?: string[];
};

export type ConfidenceLevel = "high" | "medium" | "low";
export type MistakeTag =
  | "concept"
  | "careless"
  | "calculation"
  | "guess"
  | "timeup";

export type ExamEngine = {
  // ── Navigation ────────────────────────────────────────────────────────────
  questions: Question[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  progress: number; // 0–100 based on current index

  // ── Per-question transient state ──────────────────────────────────────────
  selectedOption: string | null; // what the student picked
  isChecked: boolean;            // whether Check Answer was clicked
  isCorrect: boolean | null;     // null until isChecked === true
  showExplanation: boolean;
  confidenceSelection: ConfidenceLevel | null;
  mistakeTag: MistakeTag | null;
  timeTakenMs: number;           // ms from question mount to checkAnswer()

  // ── Session state ─────────────────────────────────────────────────────────
  score: number;
  wrongQuestionIds: string[];

  // ── Actions ───────────────────────────────────────────────────────────────
  selectOption: (option: string) => void;
  checkAnswer: () => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  setConfidence: (level: ConfidenceLevel) => void;
  setMistakeTag: (tag: MistakeTag) => void;
  retryWrongQuestions: () => void;
  reset: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExamEngine(initialQuestions: Question[]): ExamEngine {
  // ── Question list (mutable for retry mode) ────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // ── Per-question transient state ──────────────────────────────────────────
  // CRITICAL: These are intentionally separate state variables.
  // selectedOption stores the pick. isChecked triggers evaluation.
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [confidenceSelection, setConfidenceSelection] =
    useState<ConfidenceLevel | null>(null);
  const [mistakeTag, setMistakeTagState] = useState<MistakeTag | null>(null);
  const [timeTakenMs, setTimeTakenMs] = useState(0);

  // ── Session accumulators ──────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const questionStartRef = useRef<number>(Date.now());

  const currentQuestion = questions[currentQuestionIndex] ?? null;

  // ── BUG FIX 1 & 4: Reset ALL per-question state when question changes ─────
  // This fires whenever the question id changes, including chapter switches.
  useEffect(() => {
    setSelectedOption(null);
    setIsChecked(false);
    setIsCorrect(null);
    setShowExplanation(false);
    setConfidenceSelection(null);
    setMistakeTagState(null);
    setTimeTakenMs(0);
    questionStartRef.current = Date.now();
  }, [currentQuestion?.id]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * BUG FIX 2: selectOption stores the choice ONLY.
   * No grading happens here. The UI shows a "Check Answer" button next.
   */
  const selectOption = useCallback(
    (option: string) => {
      if (isChecked) return; // lock after checking
      setSelectedOption(option);
    },
    [isChecked],
  );

  /**
   * checkAnswer is the ONLY place correctness is evaluated.
   * Must be called after selectOption and before nextQuestion.
   */
  const checkAnswer = useCallback(() => {
    if (!selectedOption || !currentQuestion || isChecked) return;
    const elapsed = Date.now() - questionStartRef.current;
    setTimeTakenMs(elapsed);
    const correct = selectedOption === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setIsChecked(true);
    setShowExplanation(true);
    if (correct) {
      setScore((s) => s + currentQuestion.marks);
    } else {
      setWrongQuestionIds((ids) =>
        ids.includes(currentQuestion.id) ? ids : [...ids, currentQuestion.id],
      );
    }
  }, [selectedOption, currentQuestion, isChecked]);

  /**
   * BUG FIX 3: Navigation — nextQuestion resets state and advances index.
   * State reset is handled by the useEffect watching currentQuestion.id.
   */
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  }, [currentQuestionIndex]);

  const setConfidence = useCallback((level: ConfidenceLevel) => {
    setConfidenceSelection(level);
  }, []);

  const setMistakeTag = useCallback((tag: MistakeTag) => {
    setMistakeTagState(tag);
  }, []);

  /** Retry mode: filter to wrong questions only, reset session state. */
  const retryWrongQuestions = useCallback(() => {
    const wrong = questions.filter((q) => wrongQuestionIds.includes(q.id));
    if (wrong.length === 0) return;
    setQuestions(wrong);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongQuestionIds([]);
    // per-question state resets via useEffect when currentQuestion.id changes
  }, [questions, wrongQuestionIds]);

  /** Full reset back to initial state. */
  const reset = useCallback(() => {
    setQuestions(initialQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongQuestionIds([]);
    // per-question state resets via useEffect
  }, [initialQuestions]);

  // ── Derived values ────────────────────────────────────────────────────────
  const totalQuestions = questions.length;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const progress =
    totalQuestions > 0
      ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
      : 0;

  return {
    // State
    questions,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isFirstQuestion,
    isLastQuestion,
    progress,
    selectedOption,
    isChecked,
    isCorrect,
    showExplanation,
    confidenceSelection,
    mistakeTag,
    timeTakenMs,
    score,
    wrongQuestionIds,
    // Actions
    selectOption,
    checkAnswer,
    nextQuestion,
    previousQuestion,
    setConfidence,
    setMistakeTag,
    retryWrongQuestions,
    reset,
  };
}
