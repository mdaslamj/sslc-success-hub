import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Brain, Clock, Sparkles, Target, Trophy } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/widgets/stat-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subjects } from "@/lib/mock-data";
import { SEED_MCQS } from "@/lib/quiz-seed";
import { buildQuizFromMcqs } from "@/lib/quiz-engine";
import { cacheQuiz } from "@/lib/quiz-store";
import { useQuizStats } from "@/hooks/use-quiz-stats";

export const Route = createFileRoute("/quizzes")({
  head: () => ({
    meta: [
      { title: "Quizzes — VidyaPath SSLC Prep" },
      {
        name: "description",
        content:
          "Chapter-wise MCQs and timed quizzes across the Karnataka SSLC syllabus. Track accuracy, weak topics, and earn XP.",
      },
    ],
  }),
  component: QuizzesPage,
});

type Mode = "practice" | "timed";

function QuizzesPage() {
  const stats = useQuizStats();
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id ?? "math");
  const [mode, setMode] = useState<Mode>("practice");

  const subject = subjects.find((s) => s.id === subjectId);

  // Group seed MCQs into chapter-wise quizzes for the active subject.
  const groups = useMemo(() => {
    const pool = SEED_MCQS.filter((m) => m.subjectId === subjectId);
    const byChapter = new Map<string, typeof pool>();
    for (const m of pool) {
      const key = m.chapterId ?? "general";
      const arr = byChapter.get(key) ?? [];
      arr.push(m);
      byChapter.set(key, arr);
    }
    return Array.from(byChapter.entries()).map(([chapterId, mcqs]) => ({
      chapterId,
      mcqs,
    }));
  }, [subjectId]);

  function startChapterQuiz(chapterId: string, mcqs: typeof SEED_MCQS) {
    const quiz = buildQuizFromMcqs(mcqs, {
      subjectId,
      chapterId: chapterId === "general" ? undefined : chapterId,
      title: `${subject?.name ?? subjectId} · ${prettyChapter(chapterId)}`,
      mode,
      durationSeconds: mode === "timed" ? Math.max(60, mcqs.length * 45) : 0,
      shuffle: true,
      source: "system",
    });
    cacheQuiz(quiz);
    return quiz.id;
  }

  return (
    <DashboardLayout title="Quizzes">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Quizzes Taken"
          value={stats.attempts.toString()}
          icon={<Brain className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Accuracy"
          value={`${stats.averageScore}%`}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          label="Best Score"
          value={`${stats.bestAccuracy}%`}
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          label="Perfect Scores"
          value={stats.perfectScores.toString()}
          icon={<Sparkles className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubjectId(s.id)}
            className={cn(
              "rounded-full border border-border/60 px-3 py-1.5 text-sm transition-colors",
              subjectId === s.id
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="mr-1">{s.emoji}</span>
            {s.name}
          </button>
        ))}
        <div className="ml-auto inline-flex rounded-full border border-border/60 bg-card p-1 text-xs">
          {(["practice", "timed"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-3 py-1 capitalize transition-colors",
                mode === m
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "timed" ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Timed
                </span>
              ) : (
                "Practice"
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {groups.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            No quizzes yet for this subject. Once admins import MCQs into
            Firestore, chapter-wise quizzes appear here automatically.
          </div>
        )}
        {groups.map((g) => (
          <div
            key={g.chapterId}
            className="rounded-3xl border border-border/60 bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {subject?.name}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold">
                  {prettyChapter(g.chapterId)}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {g.mcqs.length} questions ·{" "}
                  {mode === "timed"
                    ? `${Math.max(1, Math.round((g.mcqs.length * 45) / 60))} min`
                    : "Untimed"}
                </p>
              </div>
              <Link
                to="/quiz/$quizId"
                params={{ quizId: startChapterQuiz(g.chapterId, g.mcqs) }}
              >
                <Button size="sm" className="rounded-full">
                  Start
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

function prettyChapter(id: string): string {
  if (id === "general") return "Mixed Practice";
  return id
    .replace(/_/g, " ")
    .replace(/\bch(\d+)\b/i, "Chapter $1")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}