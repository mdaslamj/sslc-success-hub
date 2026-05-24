import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { subjects } from "@/lib/mock-data";
import {
  readCachedAttempt,
  readCachedExam,
  readCachedResult,
} from "@/lib/mock-exam-store";
import {
  fetchExamAttempt,
  fetchExamResult,
  fetchMockExam,
} from "@/integrations/firebase/services/mock-exams";
import type {
  MockExamAttemptDoc,
  MockExamDoc,
  MockExamResultDoc,
} from "@/integrations/firebase/types";

export const Route = createFileRoute("/exam-results/$attemptId")({
  head: () => ({
    meta: [
      { title: "Exam Result — VidyaPath" },
      {
        name: "description",
        content:
          "Detailed analytics for your mock exam: subject-wise performance, weak areas, time analysis and predicted board score.",
      },
    ],
  }),
  component: ExamResultPage,
});

function ExamResultPage() {
  const { attemptId } = Route.useParams();
  const [result, setResult] = useState<MockExamResultDoc | null>(null);
  const [attempt, setAttempt] = useState<MockExamAttemptDoc | null>(null);
  const [exam, setExam] = useState<MockExamDoc | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    // Local-first.
    const r = readCachedResult(attemptId);
    const a = readCachedAttempt(attemptId);
    if (r) setResult(r);
    if (a) setAttempt(a);
    if (r) {
      const e = readCachedExam(r.examId);
      if (e) setExam(e);
      else fetchMockExam(r.examId).then((x) => x && setExam(x)).catch(() => {});
    }
    if (!r) {
      // Fallback: try Firestore.
      Promise.all([fetchExamResult(attemptId), fetchExamAttempt(attemptId)])
        .then(async ([fr, fa]) => {
          if (!fr) {
            setMissing(true);
            return;
          }
          setResult(fr);
          if (fa) setAttempt(fa);
          const e = await fetchMockExam(fr.examId);
          if (e) setExam(e);
        })
        .catch(() => setMissing(true));
    }
  }, [attemptId]);

  if (missing) {
    return (
      <DashboardLayout title="Exam Result">
        <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm">We couldn't find this result.</p>
          <Link to="/exams">
            <Button className="mt-4 rounded-full">Back to exams</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }
  if (!result) {
    return (
      <DashboardLayout title="Exam Result">
        <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          Loading result…
        </div>
      </DashboardLayout>
    );
  }
  return <Results result={result} exam={exam} attempt={attempt} />;
}

function Results({
  result,
  exam,
  attempt,
}: {
  result: MockExamResultDoc;
  exam: MockExamDoc | null;
  attempt: MockExamAttemptDoc | null;
}) {
  const grade = useMemo(() => gradeFor(result.percentage), [result.percentage]);
  const minutes = Math.round(result.durationSeconds / 60);

  const subjectRows = Object.entries(result.bySubject);

  return (
    <DashboardLayout title="Exam Result">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Hero */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {exam?.title ?? "Mock exam"}
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-5xl md:text-6xl font-bold tabular-nums">
                  {result.percentage}%
                </span>
                <span className="font-display text-2xl text-muted-foreground">
                  · {grade}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.marksScored} / {result.totalMarks} marks · {result.accuracy}% accuracy
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <HeroStat icon={<Brain className="h-4 w-4" />} label="Predicted board" value={`${result.predictedBoardScore}%`} />
              <HeroStat icon={<Clock className="h-4 w-4" />} label="Time taken" value={`${minutes}m`} />
              <HeroStat icon={<Trophy className="h-4 w-4" />} label="XP earned" value={`+${result.xpAwarded}`} />
            </div>
          </div>
        </section>

        {/* Stat row */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile icon={<Target className="h-4 w-4" />} label="Accuracy" value={`${result.accuracy}%`} />
          <Tile icon={<CheckCircle2 className="h-4 w-4" />} label="Completion" value={`${result.completion}%`} />
          <Tile icon={<BarChart3 className="h-4 w-4" />} label="Avg time / Q" value={`${result.avgTimePerQuestion}s`} />
          <Tile icon={<TrendingUp className="h-4 w-4" />} label="Predicted board" value={`${result.predictedBoardScore}%`} />
        </section>

        {/* Subject-wise */}
        {subjectRows.length > 0 && (
          <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-6">
            <h3 className="font-display text-lg font-semibold">Subject-wise performance</h3>
            <div className="mt-4 space-y-4">
              {subjectRows.map(([sid, s]) => {
                const name = subjects.find((x) => x.id === sid)?.name ?? sid;
                return (
                  <div key={sid}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.correct} / {s.total} · {s.accuracy}%
                      </span>
                    </div>
                    <Progress value={s.accuracy} className="h-2" />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Weak areas */}
        {result.weakAreas.length > 0 && (
          <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 md:p-6">
            <h3 className="font-display text-lg font-semibold text-destructive">
              Weak areas to revise
            </h3>
            <p className="text-xs text-muted-foreground">
              Topics where you got less than half right. Added to your revision list.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.weakAreas.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-destructive/30 bg-background px-3 py-1 text-xs font-medium text-destructive"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Question review */}
        {exam && attempt && (
          <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-6">
            <h3 className="font-display text-lg font-semibold">Question review</h3>
            <ol className="mt-4 space-y-3">
              {exam.questions.map((q, i) => {
                const a = attempt.answers[i];
                const right = a?.correct;
                const skipped = a?.selectedIndex == null;
                return (
                  <li
                    key={q.mcqId}
                    className="rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                          right
                            ? "bg-success/15 text-success"
                            : skipped
                              ? "bg-muted text-muted-foreground"
                              : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {right ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {i + 1}. {q.question}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Correct: {q.options[q.correctIndex]}
                          {a?.selectedIndex != null && !right && (
                            <> · Your answer: {q.options[a.selectedIndex]}</>
                          )}
                          {skipped && <> · Skipped</>}
                        </p>
                        {q.explanation && (
                          <p className="mt-1 text-xs text-muted-foreground/80">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link to="/exams">
            <Button variant="outline" className="rounded-full">
              <RefreshCcw className="mr-1 h-4 w-4" /> Take another
            </Button>
          </Link>
          <Link to="/analytics">
            <Button className="rounded-full">
              View analytics <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function gradeFor(p: number): string {
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B+";
  if (p >= 60) return "B";
  if (p >= 50) return "C";
  if (p >= 35) return "D";
  return "E";
}