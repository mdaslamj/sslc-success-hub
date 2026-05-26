/**
 * MockExamPage — Task 9
 * Route: /mock-exam
 *
 * Full timed SSLC-style mock exam.
 * - Pulls questions from all 3 subjects
 * - 45 minute timer
 * - All answers submitted together at end (not one by one)
 * - Results show subject-wise breakdown
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, ChevronLeft, ChevronRight, AlertTriangle, Trophy } from "lucide-react";
import { SUBJECTS, getQuestionsBySubject } from "@/lib/question-bank";
import type { Question } from "@/hooks/use-exam-engine";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EXAM_DURATION_SECS = 45 * 60; // 45 minutes
const QUESTIONS_PER_SUBJECT = 5;    // 5 from each subject = 15 total

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildExamQuestions(): Question[] {
  return SUBJECTS.flatMap((subject) => {
    const all = getQuestionsBySubject(subject.id);
    const easy = shuffle(all.filter((q) => q.difficulty === "easy"));
    const medium = shuffle(all.filter((q) => q.difficulty === "medium"));
    const hard = shuffle(all.filter((q) => q.difficulty === "hard"));
    // Mix: 2 easy, 2 medium, 1 hard per subject
    return [...easy.slice(0, 2), ...medium.slice(0, 2), ...hard.slice(0, 1)];
  });
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "intro" | "exam" | "results";

type ExamResult = {
  question: Question;
  selectedOption: string | null;
  isCorrect: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MockExamPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId → selected option
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECS);
  const [results, setResults] = useState<ExamResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          submitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const startExam = () => {
    const qs = buildExamQuestions();
    setQuestions(qs);
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft(EXAM_DURATION_SECS);
    setPhase("exam");
  };

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const res: ExamResult[] = questions.map((q) => ({
      question: q,
      selectedOption: answers[q.id] ?? null,
      isCorrect: answers[q.id] === q.correctAnswer,
    }));
    setResults(res);
    setPhase("results");
  }, [questions, answers]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft <= 300; // last 5 minutes

  // ── Render: Intro ─────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <DashboardLayout title="Mock Exam">
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <span className="text-6xl">📝</span>
          <h1 className="mt-4 text-2xl font-bold text-foreground">SSLC Mock Exam</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Test yourself with a timed exam across all subjects
          </p>

          {/* Exam details */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-left space-y-3">
            {[
              { icon: "📐", label: "Mathematics", value: `${QUESTIONS_PER_SUBJECT} questions` },
              { icon: "🔬", label: "Science", value: `${QUESTIONS_PER_SUBJECT} questions` },
              { icon: "🌍", label: "Social Science", value: `${QUESTIONS_PER_SUBJECT} questions` },
              { icon: "⏱️", label: "Duration", value: "45 minutes" },
              { icon: "📊", label: "Total Questions", value: `${QUESTIONS_PER_SUBJECT * 3}` },
              { icon: "✅", label: "Marks per question", value: "1 mark" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span>{icon}</span> {label}
                </span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 p-3 text-sm text-orange-700 dark:text-orange-300">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            Once started, the timer cannot be paused.
          </div>

          <button
            onClick={startExam}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Start Exam →
          </button>

          <Link to="/practice">
            <button className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted">
              Practice instead
            </button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render: Exam ──────────────────────────────────────────────────────────

  if (phase === "exam" && currentQuestion) {
    const subjectInfo = SUBJECTS.find((s) =>
      s.chapters.some((c) => c.id === currentQuestion.chapter || c.questions.some((q) => q.id === currentQuestion.id))
    );

    return (
      <DashboardLayout title="Mock Exam">
        <div className="mx-auto max-w-2xl px-4 py-4 flex flex-col gap-4">

          {/* Timer + progress bar */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className={cn("h-4 w-4", isLowTime ? "text-red-500" : "text-muted-foreground")} />
              <span className={cn("font-mono text-lg font-bold", isLowTime ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                {formatTime(timeLeft)}
              </span>
              {isLowTime && <span className="text-xs text-red-500 font-medium">Low time!</span>}
            </div>
            <span className="text-sm text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          {/* Question dots */}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-7 w-7 rounded-full text-xs font-semibold transition",
                  i === currentIndex
                    ? "bg-primary text-primary-foreground scale-110"
                    : answers[q.id]
                      ? "bg-primary/30 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Subject label */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{subjectInfo?.icon}</span>
            <span>{currentQuestion.subject}</span>
            <span>·</span>
            <span className="truncate">{currentQuestion.chapter}</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
              {currentQuestion.difficulty}
            </span>
          </div>

          {/* Question */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <p className="text-base font-medium leading-relaxed text-foreground">
              {currentQuestion.question}
            </p>

            {/* Options */}
            <div className="mt-5 flex flex-col gap-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === option;
                return (
                  <button
                    key={idx}
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }))}
                    className={cn(
                      "w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    <span className="mr-3 font-bold">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>

            <div className="flex-1" />

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="flex items-center gap-1 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={submitExam}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                Submit Exam ✓
              </button>
            )}
          </div>

          {/* Submit early */}
          {answeredCount === questions.length && currentIndex < questions.length - 1 && (
            <button
              onClick={submitExam}
              className="w-full rounded-xl border border-green-300 bg-green-50 dark:bg-green-950 py-2.5 text-sm font-semibold text-green-700 dark:text-green-300 transition hover:bg-green-100"
            >
              All answered — Submit Early ✓
            </button>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── Render: Results ───────────────────────────────────────────────────────

  if (phase === "results") {
    const correct = results.filter((r) => r.isCorrect).length;
    const total = results.length;
    const pct = Math.round((correct / total) * 100);
    const timeTaken = EXAM_DURATION_SECS - timeLeft;
    const grade =
      pct >= 90 ? { label: "Distinction", emoji: "🏆", color: "text-yellow-600" } :
      pct >= 75 ? { label: "First Class", emoji: "🌟", color: "text-blue-600" } :
      pct >= 60 ? { label: "Second Class", emoji: "👍", color: "text-green-600" } :
      pct >= 35 ? { label: "Pass", emoji: "✅", color: "text-orange-600" } :
      { label: "Needs Improvement", emoji: "📚", color: "text-red-600" };

    // Subject-wise breakdown
    const subjectBreakdown = SUBJECTS.map((subject) => {
      const subjectResults = results.filter((r) => r.question.subject === subject.name);
      const subjectCorrect = subjectResults.filter((r) => r.isCorrect).length;
      return {
        subject,
        correct: subjectCorrect,
        total: subjectResults.length,
        pct: subjectResults.length > 0 ? Math.round((subjectCorrect / subjectResults.length) * 100) : 0,
      };
    });

    return (
      <DashboardLayout title="Exam Results">
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

          {/* Grade banner */}
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <span className="text-5xl">{grade.emoji}</span>
            <h1 className={cn("mt-2 text-2xl font-bold", grade.color)}>{grade.label}</h1>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-5xl font-bold text-foreground">{correct}</span>
              <span className="text-2xl text-muted-foreground">/ {total}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {pct}% accuracy · Time taken: {formatTime(timeTaken)}
            </p>
          </div>

          {/* Subject breakdown */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Subject Breakdown
            </h2>
            <div className="space-y-3">
              {subjectBreakdown.map(({ subject, correct, total, pct }) => (
                <div key={subject.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{subject.icon}</span>
                      <span className="font-medium text-foreground">{subject.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{correct}/{total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", pct >= 60 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question review */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Question Review
            </h2>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={r.question.id}
                  className={cn(
                    "rounded-xl border p-4",
                    r.isCorrect
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
                  )}
                >
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    Q{i + 1}. {r.question.question}
                  </p>
                  {!r.isCorrect && (
                    <div className="mt-2 space-y-0.5 text-xs">
                      {r.selectedOption && (
                        <p className="text-red-600 dark:text-red-400">Your answer: {r.selectedOption}</p>
                      )}
                      {!r.selectedOption && (
                        <p className="text-muted-foreground">Not answered</p>
                      )}
                      <p className="text-green-600 dark:text-green-400">Correct: {r.question.correctAnswer}</p>
                      {r.question.explanation && (
                        <p className="text-muted-foreground mt-1">{r.question.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setPhase("intro")}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Try Another Mock Exam
            </button>
            <Link to="/practice">
              <button className="w-full rounded-xl border border-border py-3 font-medium text-foreground transition hover:bg-muted">
                Go to Practice Mode
              </button>
            </Link>
            <Link to="/analytics">
              <button className="w-full rounded-xl border border-border py-3 font-medium text-muted-foreground transition hover:bg-muted">
                View My Progress →
              </button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return null;
}
