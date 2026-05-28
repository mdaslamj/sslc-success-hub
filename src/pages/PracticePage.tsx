/**
 * PracticePage — Task 10
 * Route: /practice
 *
 * handleSessionComplete correctly receives (score, results) from
 * PracticeSession, matching the updated prop signature.
 */

import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SubjectChapterSelector } from "@/components/practice/SubjectChapterSelector";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { SessionResultsScreen } from "@/components/practice/SessionResultsScreen";
import type { QuestionResult } from "@/components/practice/SessionResultsScreen";
import { getQuestionsByChapter, getSubjectByChapterId } from "@/lib/question-bank";
import type { BankQuestion } from "@/lib/question-bank";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "selecting" | "practicing" | "results";

type SessionState = {
  chapterId: string;
  subjectId: string;
  chapterName: string;
  questions: BankQuestion[];
  score: number;
  totalMarks: number;
  results: QuestionResult[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PracticePage() {
  const search = useSearch({ strict: false }) as {
    subject?: string;
    chapter?: string;
  };

  const [phase, setPhase] = useState<Phase>(
    search.chapter ? "practicing" : "selecting"
  );

  const [session, setSession] = useState<SessionState | null>(() => {
    if (search.chapter) {
      const questions = getQuestionsByChapter(search.chapter);
      const subject = getSubjectByChapterId(search.chapter);
      const chapterName =
        subject?.chapters.find((c) => c.id === search.chapter)?.name ?? search.chapter;
      return {
        chapterId: search.chapter,
        subjectId: search.subject ?? subject?.id ?? "",
        chapterName,
        questions,
        score: 0,
        totalMarks: questions.reduce((a, q) => a + q.marks, 0),
        results: [],
      };
    }
    return null;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = (chapterId: string, subjectId: string) => {
    const questions = getQuestionsByChapter(chapterId);
    if (!questions.length) return;
    const subject = getSubjectByChapterId(chapterId);
    const chapterName =
      subject?.chapters.find((c) => c.id === chapterId)?.name ?? chapterId;
    setSession({
      chapterId,
      subjectId,
      chapterName,
      questions,
      score: 0,
      totalMarks: questions.reduce((a, q) => a + q.marks, 0),
      results: [],
    });
    setPhase("practicing");
  };

  // Matches updated PracticeSession signature: (score, results)
  const handleSessionComplete = (score: number, results: QuestionResult[]) => {
    setSession((prev) => prev ? { ...prev, score, results } : prev);
    setPhase("results");
  };

  const handleRetryWrong = () => {
    if (!session) return;
    const wrongQuestions = session.results
      .filter((r) => !r.isCorrect)
      .map((r) => r.question);
    if (!wrongQuestions.length) return;
    setSession((prev) => prev ? {
      ...prev,
      questions: wrongQuestions,
      totalMarks: wrongQuestions.reduce((a, q) => a + q.marks, 0),
      score: 0,
      results: [],
    } : prev);
    setPhase("practicing");
  };

  const handleRetryAll = () => {
    if (!session) return;
    setSession((prev) => prev ? {
      ...prev,
      questions: getQuestionsByChapter(prev.chapterId),
      score: 0,
      results: [],
    } : prev);
    setPhase("practicing");
  };

  const handleNewChapter = () => {
    setSession(null);
    setPhase("selecting");
  };

  const handleExit = () => {
    setSession(null);
    setPhase("selecting");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const title =
    phase === "selecting" ? "Practice" :
    phase === "practicing" ? session?.chapterName ?? "Practice" :
    "Results";

  return (
    <DashboardLayout title={title}>
      {phase === "selecting" && (
        <SubjectChapterSelector onStart={handleStart} />
      )}

      {phase === "practicing" && session && (
        <PracticeSession
          key={`${session.chapterId}-${session.questions.length}`}
          questions={session.questions}
          chapterId={session.chapterId}
          chapterName={session.chapterName}
          subjectId={session.subjectId}
          onSessionComplete={handleSessionComplete}
          onExit={handleExit}
        />
      )}

      {phase === "results" && session && (
        <SessionResultsScreen
          chapterName={session.chapterName}
          subjectName={getSubjectByChapterId(session.chapterId)?.name ?? ""}
          score={session.score}
          totalMarks={session.totalMarks}
          results={session.results}
          onRetryWrong={handleRetryWrong}
          onRetryAll={handleRetryAll}
          onNewChapter={handleNewChapter}
        />
      )}
    </DashboardLayout>
  );
}
