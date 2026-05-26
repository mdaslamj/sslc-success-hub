/**
 * DailyPracticePage — Task 11
 * Route: /daily-practice
 *
 * Generates a fresh 10-question session every day from the student's
 * weakest chapters. Shows streak and today's completion status.
 */

import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { SessionResultsScreen } from "@/components/practice/SessionResultsScreen";
import type { QuestionResult } from "@/components/practice/SessionResultsScreen";
import { useAnalytics } from "@/hooks/use-analytics";
import { SUBJECTS, getQuestionsByChapter, getSubjectByChapterId } from "@/lib/question-bank";
import type { Question } from "@/hooks/use-exam-engine";
import { Flame, CheckCircle2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAILY_QUESTION_COUNT = 10;
const STORAGE_KEY = "aura_daily_practice_v1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayKey(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getDailyStreak(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    return data.streak ?? 0;
  } catch { return 0; }
}

function isTodayComplete(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.lastCompletedDate === todayKey();
  } catch { return false; }
}

function markTodayComplete(score: number, total: number): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const today = todayKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const streak = data.lastCompletedDate === yesterday
      ? (data.streak ?? 0) + 1
      : 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lastCompletedDate: today,
      streak,
      lastScore: score,
      lastTotal: total,
    }));
  } catch {}
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "intro" | "practicing" | "results";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyPracticePage() {
  const analytics = useAnalytics();
  const streak = getDailyStreak();
  const alreadyDone = isTodayComplete();

  const [phase, setPhase] = useState<Phase>("intro");
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [score, setScore] = useState(0);

  // Build today's 10 questions from weakest chapters
  const dailyQuestions = useMemo((): Question[] => {
    const weakChapters = analytics.getWeakChapters();

    let pool: Question[] = [];

    if (weakChapters.length > 0) {
      // Pull from weak chapters first
      for (const ch of weakChapters) {
        const qs = getQuestionsByChapter(ch.chapterId);
        pool.push(...qs);
        if (pool.length >= DAILY_QUESTION_COUNT * 2) break;
      }
    }

    // If not enough, fill from all subjects
    if (pool.length < DAILY_QUESTION_COUNT) {
      SUBJECTS.forEach((subject) => {
        subject.chapters.forEach((chapter) => {
          pool.push(...chapter.questions);
        });
      });
    }

    return shuffle([...new Map(pool.map((q) => [q.id, q])).values()])
      .slice(0, DAILY_QUESTION_COUNT);
  }, []);

  const chapterId = dailyQuestions[0]?.chapter ?? "daily";
  const subjectId = getSubjectByChapterId(dailyQuestions[0]?.chapter ?? "")?.id ?? "science";

  const handleComplete = (score: number, results: QuestionResult[]) => {
    markTodayComplete(score, DAILY_QUESTION_COUNT);
    setScore(score);
    setResults(results);
    setPhase("results");
  };

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <DashboardLayout title="Daily Practice">
        <div className="mx-auto max-w-lg px-4 py-8 space-y-6">

          {/* Streak banner */}
          <div className="rounded-2xl bg-gradient-to-br from-primary to-brand-glow p-5 text-primary-foreground">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8" />
              <div>
                <p className="text-2xl font-bold">{streak} day streak</p>
                <p className="text-sm text-primary-foreground/80">Keep it going!</p>
              </div>
            </div>
          </div>

          {/* Today's status */}
          {alreadyDone ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
              <h2 className="mt-2 text-lg font-bold text-foreground">Today's challenge complete! 🎉</h2>
              <p className="mt-1 text-sm text-muted-foreground">Come back tomorrow for a new set of questions.</p>
              <Link to="/practice">
                <button className="mt-4 w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground hover:bg-muted transition">
                  Practice more chapters →
                </button>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Today's 10 Questions</h2>
                  <p className="text-sm text-muted-foreground">
                    Picked from your weakest chapters
                  </p>
                </div>
              </div>

              {/* Chapter preview */}
              <div className="space-y-2">
                {[...new Set(dailyQuestions.map((q) => q.chapter))].slice(0, 4).map((ch) => (
                  <div key={ch} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {ch}
                  </div>
                ))}
                {[...new Set(dailyQuestions.map((q) => q.chapter))].length > 4 && (
                  <p className="text-xs text-muted-foreground">
                    + {[...new Set(dailyQuestions.map((q) => q.chapter))].length - 4} more chapters
                  </p>
                )}
              </div>

              <button
                onClick={() => setPhase("practicing")}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Start Daily Challenge →
              </button>
            </div>
          )}

          <Link to="/">
            <button className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition">
              ← Back to dashboard
            </button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ── Practice screen ───────────────────────────────────────────────────────

  if (phase === "practicing") {
    return (
      <DashboardLayout title="Daily Challenge">
        <PracticeSession
          key="daily-practice"
          questions={dailyQuestions}
          chapterId={chapterId}
          chapterName="Daily Challenge"
          subjectId={subjectId}
          onSessionComplete={handleComplete}
        />
      </DashboardLayout>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Daily Results">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-brand-glow p-6 text-primary-foreground text-center">
          <span className="text-5xl">{score >= 8 ? "🏆" : score >= 6 ? "⭐" : "💪"}</span>
          <h2 className="mt-2 text-2xl font-bold">Daily Challenge Done!</h2>
          <p className="mt-1 text-4xl font-bold">{score}/{DAILY_QUESTION_COUNT}</p>
          <p className="text-primary-foreground/80 text-sm mt-1">
            {streak + 1} day streak 🔥
          </p>
        </div>

        <SessionResultsScreen
          chapterName="Daily Challenge"
          subjectName="Mixed Subjects"
          score={score}
          totalMarks={DAILY_QUESTION_COUNT}
          results={results}
          onRetryWrong={() => setPhase("intro")}
          onRetryAll={() => setPhase("intro")}
          onNewChapter={() => setPhase("intro")}
        />
      </div>
    </DashboardLayout>
  );
}
