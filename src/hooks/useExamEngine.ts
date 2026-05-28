import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AttemptMode,
  ConfidenceLevel,
  MistakeTag,
  Question,
  QuestionAttempt,
} from "@/types/question";
import { saveAttempt } from "@/engines/analytics/attemptLogger";
import {
  finaliseSession,
  updateAfterAttempt,
} from "@/engines/analytics/profileUpdater";

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
  endSession: () => void;
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

function resetTransientState(): Pick<
  ExamEngineState,
  | "selectedOption"
  | "isChecked"
  | "isCorrect"
  | "showExplanation"
  | "confidenceSelection"
  | "mistakeTag"
  | "timeTakenMs"
> {
  return {
    selectedOption: null,
    isChecked: false,
    isCorrect: null,
    showExplanation: false,
    confidenceSelection: null,
    mistakeTag: null,
    timeTakenMs: 0,
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
  const navigationKeyRef = useRef<string>("");

  useEffect(() => {
    navigationKeyRef.current = "";
    setActiveQuestions(questions);
    setQuestionStatuses(Array(questions.length).fill("unattempted"));
    questionStartTime.current = Date.now();
    setState({
      ...buildInitialState(),
      currentQuestion: questions[0] ?? null,
      totalQuestions: questions.length,
    });
  }, [questions]);

  // Safety net: clear per-question UI state whenever the active question changes.
  useEffect(() => {
    const question = state.currentQuestion;
    if (!question) return;

    const key = `${state.currentIndex}:${question.id}`;
    if (navigationKeyRef.current === key) return;
    navigationKeyRef.current = key;
    questionStartTime.current = Date.now();

    setState((prev) => {
      if (
        prev.selectedOption === null &&
        !prev.isChecked &&
        prev.isCorrect === null &&
        !prev.showExplanation &&
        prev.confidenceSelection === null &&
        prev.mistakeTag === null
      ) {
        return prev;
      }
      return { ...prev, ...resetTransientState() };
    });
  }, [state.currentIndex, state.currentQuestion?.id]);

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

        saveAttempt(attempt);
        updateAfterAttempt(
          attempt.chapterId,
          attempt.concept,
          attempt.isCorrect,
          level,
          attempt.mistakeTag,
          attempt.timeTakenMs,
        );

        setQuestionStatuses((statuses) => {
          const next = [...statuses];
          next[prev.currentIndex] = attempt.isCorrect ? "correct" : "wrong";
          return next;
        });

        const newWrongIds = !attempt.isCorrect
          ? [...new Set([...prev.wrongQuestionIds, prev.currentQuestion.id])]
          : prev.wrongQuestionIds;

        return {
          ...prev,
          confidenceSelection: level,
          sessionAttempts: [...prev.sessionAttempts, attempt],
          wrongQuestionIds: newWrongIds,
        };
      });
    },
    [mode],
  );

  const setMistakeTag = useCallback((tag: MistakeTag | null) => {
    setState((prev) => ({ ...prev, mistakeTag: tag }));
  }, []);

  const resetQuestionState = useCallback(
    (index: number): Partial<ExamEngineState> => ({
      currentIndex: index,
      currentQuestion: activeQuestions[index] ?? null,
      ...resetTransientState(),
    }),
    [activeQuestions],
  );

  const goToQuestion = useCallback(
    (index: number) => {
      if (index < 0 || index >= activeQuestions.length) return;
      const nextQuestion = activeQuestions[index];
      navigationKeyRef.current = nextQuestion
        ? `${index}:${nextQuestion.id}`
        : "";
      questionStartTime.current = Date.now();
      setState((prev) => ({ ...prev, ...resetQuestionState(index) }));
    },
    [activeQuestions, resetQuestionState],
  );

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      const next = prev.currentIndex + 1;
      if (next >= activeQuestions.length) return prev;
      const nextQuestion = activeQuestions[next];
      navigationKeyRef.current = nextQuestion
        ? `${next}:${nextQuestion.id}`
        : "";
      questionStartTime.current = Date.now();
      return { ...prev, ...resetQuestionState(next) };
    });
  }, [activeQuestions, resetQuestionState]);

  const previousQuestion = useCallback(() => {
    setState((prev) => {
      const prevIdx = prev.currentIndex - 1;
      if (prevIdx < 0) return prev;
      const prevQuestion = activeQuestions[prevIdx];
      navigationKeyRef.current = prevQuestion
        ? `${prevIdx}:${prevQuestion.id}`
        : "";
      questionStartTime.current = Date.now();
      return { ...prev, ...resetQuestionState(prevIdx) };
    });
  }, [activeQuestions, resetQuestionState]);

  const retryWrongQuestions = useCallback(() => {
    const wrongOnes = questions.filter((q) =>
      state.wrongQuestionIds.includes(q.id),
    );
    if (wrongOnes.length === 0) return;
    navigationKeyRef.current = wrongOnes[0]
      ? `0:${wrongOnes[0].id}`
      : "";
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
    navigationKeyRef.current = questions[0] ? `0:${questions[0].id}` : "";
    setActiveQuestions(questions);
    setQuestionStatuses(Array(questions.length).fill("unattempted"));
    questionStartTime.current = Date.now();
    setState({
      ...buildInitialState(),
      currentQuestion: questions[0] ?? null,
      totalQuestions: questions.length,
    });
  }, [questions]);

  const endSession = useCallback(() => {
    navigationKeyRef.current = "";
    setActiveQuestions(questions);
    setQuestionStatuses(Array(questions.length).fill("unattempted"));
    questionStartTime.current = Date.now();
    setState({
      ...buildInitialState(),
      currentQuestion: questions[0] ?? null,
      totalQuestions: questions.length,
    });
  }, [questions]);

  const isComplete =
    state.attemptedCount === activeQuestions.length &&
    activeQuestions.length > 0;

  useEffect(() => {
    if (isComplete && state.sessionAttempts.length > 0) {
      finaliseSession(
        state.sessionAttempts.map((a) => ({
          isCorrect: a.isCorrect,
          confidenceLevel: a.confidenceLevel,
        })),
      );
    }
  }, [isComplete, state.sessionAttempts]);

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
      endSession,
      goToQuestion,
    },
    questionStatuses,
    canGoNext: state.currentIndex < activeQuestions.length - 1,
    canGoPrev: state.currentIndex > 0,
    isLastQuestion: state.currentIndex === activeQuestions.length - 1,
    isComplete,
  };
}
