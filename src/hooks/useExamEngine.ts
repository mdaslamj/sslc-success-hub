import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AttemptMode,
  ConfidenceLevel,
  MistakeTag,
  Question,
  QuestionAttempt,
} from "@/types/question";

export interface ExamEngineState {
  currentQuestion: Question | null;
  currentIndex: number;
  totalQuestions: number;
  selectedOption: string | null;
  isChecked: boolean;
  isCorrect: boolean | null;
  showExplanation: boolean;
  confidenceSelection: ConfidenceLevel | null;
  mistakeTag: MistakeTag | null;
  score: number;
  attemptedCount: number;
  timeTakenMs: number;
  sessionAttempts: QuestionAttempt[];
  wrongQuestionIds: string[];
  isRetryMode: boolean;
}

export interface ExamEngineActions {
  selectOption: (option: string) => void;
  checkAnswer: () => void;
  setConfidence: (level: ConfidenceLevel) => void;
  setMistakeTag: (tag: MistakeTag | null) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  retryWrongQuestions: () => void;
  reset: () => void;
  goToQuestion: (index: number) => void;
}

export type AttemptStatus = "unattempted" | "correct" | "wrong";

export interface UseExamEngineReturn {
  state: ExamEngineState;
  actions: ExamEngineActions;
  questionStatuses: AttemptStatus[];
  canGoNext: boolean;
  canGoPrev: boolean;
  isLastQuestion: boolean;
  isComplete: boolean;
}

function buildInitialState(): ExamEngineState {
  return {
    currentQuestion: null,
    currentIndex: 0,
    totalQuestions: 0,
    selectedOption: null,
    isChecked: false,
    isCorrect: null,
    showExplanation: false,
    confidenceSelection: null,
    mistakeTag: null,
    score: 0,
    attemptedCount: 0,
    timeTakenMs: 0,
    sessionAttempts: [],
    wrongQuestionIds: [],
    isRetryMode: false,
  };
}

export function useExamEngine(
  questions: Question[],
  mode: AttemptMode = "practice",
): UseExamEngineReturn {
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(questions);
  const [state, setState] = useState<ExamEngineState>({
    ...buildInitialState(),
    currentQuestion: questions[0] ?? null,
    totalQuestions: questions.length,
  });

  const [questionStatuses, setQuestionStatuses] = useState<AttemptStatus[]>(() =>
    Array(questions.length).fill("unattempted"),
  );

  const questionStartTime = useRef<number>(Date.now());

  useEffect(() => {
    setActiveQuestions(questions);
    setQuestionStatuses(Array(questions.length).fill("unattempted"));
    questionStartTime.current = Date.now();
    setState({
      ...buildInitialState(),
      currentQuestion: questions[0] ?? null,
      totalQuestions: questions.length,
    });
  }, [questions]);

  const selectOption = useCallback((option: string) => {
    setState((prev) => {
      if (prev.isChecked) return prev;
      return { ...prev, selectedOption: option };
    });
  }, []);

  const checkAnswer = useCallback(() => {
    setState((prev) => {
      if (!prev.currentQuestion || !prev.selectedOption || prev.isChecked) {
        return prev;
      }

      const timeTaken = Date.now() - questionStartTime.current;
      const correct = prev.selectedOption === prev.currentQuestion.correctAnswer;

      return {
        ...prev,
        isChecked: true,
        isCorrect: correct,
        showExplanation: true,
        timeTakenMs: timeTaken,
        score: correct
          ? prev.score + (prev.currentQuestion.marks ?? 1)
          : prev.score,
        attemptedCount: prev.attemptedCount + 1,
      };
    });
  }, []);

  const setConfidence = useCallback(
    (level: ConfidenceLevel) => {
      setState((prev) => {
        if (!prev.currentQuestion || !prev.isChecked) return prev;

        const attempt: QuestionAttempt = {
          questionId: prev.currentQuestion.id,
          chapterId: prev.currentQuestion.chapterId ?? "",
          subject: prev.currentQuestion.subject,
          concept: prev.currentQuestion.concept ?? "",
          timeTakenMs: prev.timeTakenMs,
          selectedAnswer: prev.selectedOption ?? "",
          isCorrect: prev.isCorrect ?? false,
          confidenceLevel: level,
          mistakeTag: prev.mistakeTag ?? undefined,
          attemptMode: mode,
          timestamp: Date.now(),
        };

        persistAttempt(attempt);

        const newWrongIds =
          !prev.isCorrect && prev.currentQuestion
            ? [...new Set([...prev.wrongQuestionIds, prev.currentQuestion.id])]
            : prev.wrongQuestionIds;

        const newStatuses = [...questionStatuses];
        newStatuses[prev.currentIndex] = prev.isCorrect ? "correct" : "wrong";
        setQuestionStatuses(newStatuses);

        return {
          ...prev,
          confidenceSelection: level,
          sessionAttempts: [...prev.sessionAttempts, attempt],
          wrongQuestionIds: newWrongIds,
        };
      });
    },
    [mode, questionStatuses],
  );

  const setMistakeTag = useCallback((tag: MistakeTag | null) => {
    setState((prev) => ({ ...prev, mistakeTag: tag }));
  }, []);

  const goToQuestion = useCallback(
    (index: number) => {
      if (index < 0 || index >= activeQuestions.length) return;
      setState((prev) => ({
        ...prev,
        currentIndex: index,
        currentQuestion: activeQuestions[index],
        selectedOption: null,
        isChecked: false,
        isCorrect: null,
        showExplanation: false,
        confidenceSelection: null,
        mistakeTag: null,
        timeTakenMs: 0,
      }));
      questionStartTime.current = Date.now();
    },
    [activeQuestions],
  );

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= activeQuestions.length) return prev;
      return {
        ...prev,
        currentIndex: nextIndex,
        currentQuestion: activeQuestions[nextIndex],
        selectedOption: null,
        isChecked: false,
        isCorrect: null,
        showExplanation: false,
        confidenceSelection: null,
        mistakeTag: null,
        timeTakenMs: 0,
      };
    });
    questionStartTime.current = Date.now();
  }, [activeQuestions]);

  const previousQuestion = useCallback(() => {
    setState((prev) => {
      const prevIndex = prev.currentIndex - 1;
      if (prevIndex < 0) return prev;
      return {
        ...prev,
        currentIndex: prevIndex,
        currentQuestion: activeQuestions[prevIndex],
        selectedOption: null,
        isChecked: false,
        isCorrect: null,
        showExplanation: false,
        confidenceSelection: null,
        mistakeTag: null,
        timeTakenMs: 0,
      };
    });
    questionStartTime.current = Date.now();
  }, [activeQuestions]);

  const retryWrongQuestions = useCallback(() => {
    const wrongOnes = questions.filter((q) =>
      state.wrongQuestionIds.includes(q.id),
    );
    if (wrongOnes.length === 0) return;
    setActiveQuestions(wrongOnes);
    setQuestionStatuses(Array(wrongOnes.length).fill("unattempted"));
    questionStartTime.current = Date.now();
    setState({
      ...buildInitialState(),
      currentQuestion: wrongOnes[0],
      totalQuestions: wrongOnes.length,
      isRetryMode: true,
    });
  }, [questions, state.wrongQuestionIds]);

  const reset = useCallback(() => {
    setActiveQuestions(questions);
    setQuestionStatuses(Array(questions.length).fill("unattempted"));
    questionStartTime.current = Date.now();
    setState({
      ...buildInitialState(),
      currentQuestion: questions[0] ?? null,
      totalQuestions: questions.length,
    });
  }, [questions]);

  const canGoNext = state.currentIndex < activeQuestions.length - 1;
  const canGoPrev = state.currentIndex > 0;
  const isLastQuestion = state.currentIndex === activeQuestions.length - 1;
  const isComplete =
    state.attemptedCount === activeQuestions.length &&
    activeQuestions.length > 0;

  return {
    state,
    actions: {
      selectOption,
      checkAnswer,
      setConfidence,
      setMistakeTag,
      nextQuestion,
      previousQuestion,
      retryWrongQuestions,
      reset,
      goToQuestion,
    },
    questionStatuses,
    canGoNext,
    canGoPrev,
    isLastQuestion,
    isComplete,
  };
}

function persistAttempt(attempt: QuestionAttempt): void {
  try {
    const raw = localStorage.getItem("aura_attempts");
    const existing: QuestionAttempt[] = raw ? JSON.parse(raw) : [];
    const updated = [...existing, attempt].slice(-500);
    localStorage.setItem("aura_attempts", JSON.stringify(updated));
  } catch {
    // silent — never crash the exam
  }
}
