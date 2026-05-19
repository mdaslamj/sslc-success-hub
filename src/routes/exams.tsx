import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  FlaskConical,
  GraduationCap,
  History,
  Layers,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { subjects } from "@/lib/mock-data";
import { SEED_MOCK_EXAMS } from "@/lib/mock-exam-seed";
import { cacheExam, listLocalResults } from "@/lib/mock-exam-store";
import { fetchMockExams } from "@/integrations/firebase/services/mock-exams";
import type { MockExamDoc, MockExamKind } from "@/integrations/firebase/types";

export const Route = createFileRoute("/exams")({
  head: () => ({
    meta: [
      { title: "Mock Exams — VidyaPath SSLC Prep" },
      {
        name: "description",
        content:
          "Full subject mock exams, chapter tests, mixed papers and previous-year KSEAB pattern simulations for Karnataka SSLC.",
      },
    ],
  }),
  component: ExamsPage,
});

const KIND_META: Record<MockExamKind, { label: string; icon: typeof Layers }> = {
  full: { label: "Full subject", icon: GraduationCap },
  chapter: { label: "Chapter test", icon: BookOpen },
  mixed: { label: "Mixed", icon: Layers },
  previous: { label: "Previous year", icon: History },
};

type Filter = "all" | MockExamKind;

function ExamsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data: remote } = useQuery({
    queryKey: ["mockExams"],
    queryFn: fetchMockExams,
    staleTime: 5 * 60_000,
  });
  const catalog = useMemo<MockExamDoc[]>(() => {
    return remote && remote.length > 0 ? remote : SEED_MOCK_EXAMS;
  }, [remote]);

  const visible = useMemo(
    () => (filter === "all" ? catalog : catalog.filter((e) => e.kind === filter)),
    [catalog, filter],
  );

  const recent = useMemo(() => listLocalResults().slice(0, 4), []);
  const bestScore = recent.reduce((m, r) => Math.max(m, r.percentage), 0);

  return (
    <DashboardLayout title="Mock Exams">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Exam centre</span>
              </div>
              <h1 className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight">
                Practice like it's the real board exam.
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Timed mock papers · auto-grading · weak-area analysis.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Stat label="Exams" value={catalog.length} />
              <Stat label="Best score" value={`${bestScore}%`} />
              <Stat label="Taken" value={recent.length} />
            </div>
          </div>
        </section>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {(["all", "full", "chapter", "mixed", "previous"] as Filter[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                filter === k
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "all" ? "All" : KIND_META[k].label}
            </button>
          ))}
        </div>

        {/* Exam grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
          {visible.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No exams in this category yet.
            </p>
          )}
        </div>

        {/* Recent results */}
        {recent.length > 0 && (
          <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-6">
            <h3 className="font-display text-lg font-semibold">Recent attempts</h3>
            <div className="mt-3 divide-y divide-border/60">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  to="/exam-results/$attemptId"
                  params={{ attemptId: r.id }}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-secondary/40 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.examId}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.endedAt).toLocaleDateString()} · {r.completion}% completed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base font-bold">{r.percentage}%</div>
                    <div className="text-[11px] text-muted-foreground">predicted {r.predictedBoardScore}%</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ExamCard({ exam }: { exam: MockExamDoc }) {
  const Meta = KIND_META[exam.kind];
  const Icon = Meta.icon;
  const subjectName =
    exam.subjectId
      ? subjects.find((s) => s.id === exam.subjectId)?.name ?? exam.subjectId
      : exam.subjects.length > 1
        ? "Multi-subject"
        : exam.subjects[0];
  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all hover:border-foreground/40 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant="outline" className="rounded-full text-[10px]">
          {Meta.label}
        </Badge>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base font-semibold leading-snug">{exam.title}</h3>
        {exam.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{exam.description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
          <Clock className="h-3 w-3" />
          {Math.round(exam.durationSeconds / 60)} min
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
          <Target className="h-3 w-3" />
          {exam.totalMarks} marks
        </span>
        {exam.negativeMarkingFactor > 0 && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
            −{exam.negativeMarkingFactor}× neg
          </span>
        )}
        {subjectName && (
          <span className="rounded-full bg-muted px-2 py-0.5">{subjectName}</span>
        )}
        {exam.year && <span className="rounded-full bg-muted px-2 py-0.5">{exam.year}</span>}
      </div>
      <Link
        to="/exams/$examId"
        params={{ examId: exam.id }}
        onClick={() => cacheExam(exam)}
      >
        <Button className="w-full rounded-full gap-2">
          <Play className="h-3.5 w-3.5" />
          Start exam
        </Button>
      </Link>
    </article>
  );
}

// Eslint hint — Sparkles imported for future use placeholder; keep used.
void Sparkles;