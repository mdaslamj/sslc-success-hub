import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Brain, Clock, ListChecks, Loader2, Target } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContentCatalog } from "@/hooks/use-content-catalog";
import {
  buildChapterTest,
  buildSubjectTest,
  type MockTest,
} from "@/lib/mock-test/engine";
import { cacheTest, computeStats, listAttempts } from "@/lib/mock-test/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mock-test")({
  head: () => ({
    meta: [
      { title: "Mock Tests — Aura" },
      {
        name: "description",
        content:
          "Lightweight chapter and subject mock tests built from your Karnataka SSLC chapter MCQs.",
      },
    ],
  }),
  component: MockTestSelector,
});

function MockTestSelector() {
  const navigate = useNavigate();
  const { subjects, isLoading } = useContentCatalog();
  const stats = useMemo(() => computeStats(listAttempts()), []);
  const subjectsWithQuestions = subjects.filter((s) =>
    s.chapters.some((c) =>
      c.questions.some((q) => q.questionType === "mcq" && q.options.length >= 2),
    ),
  );
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const activeSubject = subjectsWithQuestions.find((s) => s.runtimeId === subjectId);

  function startTest(test: MockTest | null) {
    if (!test) return;
    cacheTest(test);
    navigate({ to: "/mock-test/$testId", params: { testId: test.id } });
  }

  return (
    <DashboardLayout title="Mock Tests">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <header className="space-y-2">
          <Badge variant="outline" className="rounded-full">Phase 1 · MCQs</Badge>
          <h1 className="text-2xl font-semibold">Mock Tests</h1>
          <p className="text-sm text-muted-foreground">
            Quick chapter and subject tests built from your existing chapter content. Timer, instant scoring, full answer review — saved locally on this device.
          </p>
        </header>

        {/* Lightweight stats */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat icon={<ListChecks className="h-4 w-4" />} label="Attempts" value={String(stats.totalAttempts)} />
          <MiniStat icon={<Target className="h-4 w-4" />} label="Latest" value={stats.latestScorePct == null ? "—" : `${stats.latestScorePct}%`} />
          <MiniStat icon={<Brain className="h-4 w-4" />} label="Accuracy" value={stats.avgAccuracyPct == null ? "—" : `${stats.avgAccuracyPct}%`} />
        </div>

        {/* Subject picker */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Pick a subject</h2>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
            </div>
          ) : subjectsWithQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No MCQ content available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {subjectsWithQuestions.map((s) => {
                const active = subjectId === s.runtimeId;
                return (
                  <button
                    key={s.runtimeId}
                    onClick={() => setSubjectId(s.runtimeId)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.chapters.length} chapters
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Subject test + chapter list */}
        {activeSubject ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{activeSubject.name} — Subject Test</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    25 random MCQs spread across all chapters · timed
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    startTest(
                      buildSubjectTest({
                        subjectId: activeSubject.runtimeId,
                        subjectName: activeSubject.name,
                        chapters: activeSubject.chapters,
                      }),
                    )
                  }
                >
                  Start <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Chapter Tests</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {activeSubject.chapters.map((c) => {
                  const mcqCount = c.questions.filter(
                    (q) => q.questionType === "mcq" && q.options.length >= 2,
                  ).length;
                  const disabled = mcqCount === 0;
                  return (
                    <li key={c.chapterId} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {c.chapterNumber ? `${c.chapterNumber}. ` : ""}
                          {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mcqCount} MCQs
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={disabled}
                        onClick={() =>
                          startTest(
                            buildChapterTest({
                              subjectId: activeSubject.runtimeId,
                              subjectName: activeSubject.name,
                              chapter: c,
                              options: { count: Math.min(10, mcqCount) },
                            }),
                          )
                        }
                      >
                        Start
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : (
          <p className="text-xs text-muted-foreground">
            Choose a subject above to see chapter tests or start a full subject test.
          </p>
        )}

        {/* Recent attempts */}
        <RecentAttempts />

        <p className="pt-2 text-center text-xs text-muted-foreground">
          <Link to="/subjects" className="underline">Back to subjects</Link>
        </p>
      </div>
    </DashboardLayout>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function RecentAttempts() {
  const attempts = useMemo(() => listAttempts().slice(0, 5), []);
  if (attempts.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Recent attempts</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {attempts.map((a) => (
          <li key={`${a.testId}-${a.endedAt}`} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{a.title}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(a.endedAt).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{a.result.scorePct}%</div>
              <div className="text-xs text-muted-foreground">
                {a.result.correct}/{a.result.total}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}