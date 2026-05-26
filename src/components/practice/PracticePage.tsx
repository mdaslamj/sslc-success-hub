/**
 * PracticePage — Full practice flow wiring Tasks 2, 3 & 4 together.
 *
 * State machine:
 *   "selecting"  → SubjectChapterSelector  (Task 4)
 *   "practicing" → PracticeSession          (Task 1 engine)
 *   "results"    → SessionResultsScreen     (Task 2)
 *
 * Usage: drop this into src/pages/Practice.tsx (or your existing practice page)
 */

import { useState, useCallback } from "react";
import { SubjectChapterSelector } from "@/components/practice/SubjectChapterSelector";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { SessionResultsScreen } from "@/components/practice/SessionResultsScreen";
import { getQuestionsByChapter, getSubjectByChapterId } from "@/lib/question-bank";
import type { Question } from "@/hooks/use-exam-engine";
import type { QuestionResult } from "@/components/practice/SessionResultsScreen";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "selecting" | "practicing" | "results";

type SessionState = {
  chapterId: string;
  subjectId: string;
  questions: Question[];
  score: number;
  totalMarks: number;
  results: QuestionResult[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>("selecting");
  const [session, setSession] = useState<SessionState | null>(null);

  // ── Start a new session ───────────────────────────────────────────────────
  const handleStart = useCallback((chapterId: string, subjectId: string) => {
    const questions = getQuestionsByChapter(chapterId);
    if (questions.length === 0) return;
    setSession({
      chapterId,
      subjectId,
      questions,
      score: 0,
      totalMarks: questions.reduce((acc, q) => acc + q.marks, 0),
      results: [],
    });
    setPhase("practicing");
  }, []);

  // ── Session completed → go to results ────────────────────────────────────
  const handleSessionComplete = useCallback(
    (score: number, _results: QuestionResult[]) => {
      if (!session) return;
      setSession((prev) => (prev ? { ...prev, score } : prev));
      setPhase("results");
    },
    [session],
  );

  // ── Retry only wrong questions ────────────────────────────────────────────
  const handleRetryWrong = useCallback(() => {
    if (!session) return;
    const wrongQuestions = session.results
      .filter((r) => !r.isCorrect)
      .map((r) => r.question);
    if (wrongQuestions.length === 0) return;
    setSession((prev) =>
      prev
        ? {
            ...prev,
            questions: wrongQuestions,
            totalMarks: wrongQuestions.reduce((acc, q) => acc + q.marks, 0),
            score: 0,
            results: [],
          }
        : prev,
    );
    setPhase("practicing");
  }, [session]);

  // ── Retry all questions ───────────────────────────────────────────────────
  const handleRetryAll = useCallback(() => {
    if (!session) return;
    setSession((prev) =>
      prev
        ? {
            ...prev,
            questions: getQuestionsByChapter(prev.chapterId),
            score: 0,
            results: [],
          }
        : prev,
    );
    setPhase("practicing");
  }, [session]);

  // ── Go back to chapter selector ───────────────────────────────────────────
  const handleNewChapter = useCallback(() => {
    setSession(null);
    setPhase("selecting");
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "selecting") {
    return <SubjectChapterSelector onStart={handleStart} />;
  }

  if (phase === "practicing" && session) {
    const subject = getSubjectByChapterId(session.chapterId);
    return (
      <PracticeSession
        key={`${session.chapterId}-${session.questions.length}`}
        questions={session.questions}
        chapterId={session.chapterId}
        onSessionComplete={handleSessionComplete}
      />
    );
  }

  if (phase === "results" && session) {
    const subject = getSubjectByChapterId(session.chapterId);
    const chapterName =
      subject?.chapters.find((c) => c.id === session.chapterId)?.name ?? session.chapterId;

    return (
      <SessionResultsScreen
        chapterName={chapterName}
        subjectName={subject?.name ?? session.subjectId}
        score={session.score}
        totalMarks={session.totalMarks}
        results={session.results}
        onRetryWrong={handleRetryWrong}
        onRetryAll={handleRetryAll}
        onNewChapter={handleNewChapter}
      />
    );
  }

  return null;
}
