import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Brain, Clock, Loader2, Play, Sparkles, Target, Trophy } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/widgets/stat-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subjects } from "@/lib/mock-data";
import { cacheQuiz } from "@/lib/quiz-store";
import { useQuizStats } from "@/hooks/use-quiz-stats";
import { useContentCatalog } from "@/hooks/use-content-catalog";
import {
  buildChapterTestQuiz,
  chapterTestQuizId,
  type ChapterTestLevel,
} from "@/lib/content-exam-builder";
import type { IndexedChapter } from "@/lib/content-question-index";

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

const LEVELS: { id: ChapterTestLevel; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "8 questions · untimed" },
  { id: "board", label: "Board", hint: "15 questions · 20 min" },
  { id: "challenge", label: "Challenge", hint: "20 questions · 25 min" },
];

function QuizzesPage() {
  const stats = useQuizStats();
  const catalog = useContentCatalog();
  const contentSubjects = catalog.subjects.filter((s) => s.chapters.length > 0);
  const defaultSubjectId =
    contentSubjects[0]?.runtimeId ?? subjects[0]?.id ?? "math";
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId);
  const [level, setLevel] = useState<ChapterTestLevel>("board");

  const subject = subjects.find((s) => s.id === subjectId);
  const activeContent = contentSubjects.find((s) => s.runtimeId === subjectId);
  const chapters = useMemo(
    () => activeContent?.chapters ?? [],
    [activeContent],
  );

  // Pre-compute ids so we don't rebuild during render.
  const chapterRows = useMemo(
    () =>
      chapters.map((c) => {
        const id = chapterTestQuizId(c.subjectId, c.chapterId, level);
        const mcqCount = c.questions.filter(
          (q) => q.questionType === "mcq",
        ).length;
        return { chapter: c, id, mcqCount };
      }),
    [chapters, level],
  );

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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubjectId(s.id)}
            className={cn(
              "shrink-0 rounded-full border border-border/60 px-3 py-1.5 text-sm transition-colors",
              subjectId === s.id
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="mr-1">{s.emoji}</span>
            {s.name}
          </button>
        ))}
        </div>
        <div className="inline-flex w-max self-start rounded-full border border-border/60 bg-card p-1 text-xs sm:ml-auto sm:self-auto">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                level === l.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.id === "board" ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {l.label}
                </span>
              ) : (
                l.label
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {catalog.isLoading && chapterRows.length === 0 && (
          <div className="col-span-full flex items-center gap-2 rounded-3xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading chapters…
          </div>
        )}
        {!catalog.isLoading && chapterRows.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            No quizzes are available yet for {subject?.name ?? subjectId}.
            New chapters appear here automatically as they're added.
          </div>
        )}
        {chapterRows.map(({ chapter, mcqCount }) => (
          <div
            key={chapter.chapterId}
            className="rounded-3xl border border-border/60 bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Ch {chapter.chapterNumber} · {subject?.name}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold">
                  {chapter.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mcqCount} MCQs available · {LEVELS.find((l) => l.id === level)?.hint}
                </p>
              </div>
              {mcqCount === 0 ? (
                <Button size="sm" disabled className="rounded-full">
                  No MCQs
                </Button>
              ) : (
                <StartChapterTestButton
                  chapter={chapter}
                  level={level}
                  disabled={catalog.isLoading}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

/**
 * Defers quiz construction until the user actually clicks "Start" — keeps
 * the catalog render cheap and avoids writing 30+ quizzes to localStorage
 * just because the user opened the Quizzes page.
 */
function StartChapterTestButton({
  chapter,
  level,
  disabled,
}: {
  chapter: IndexedChapter;
  level: ChapterTestLevel;
  disabled?: boolean;
}) {
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      className="rounded-full gap-1.5"
      disabled={disabled || isLaunching}
      onClick={() => {
        if (isLaunching) return;
        setIsLaunching(true);
        const quiz = buildChapterTestQuiz({ chapter, level });
        if (!quiz) {
          setIsLaunching(false);
          return;
        }
        cacheQuiz(quiz);
        console.debug("[quizzes] launch", {
          quizId: quiz.id,
          chapterId: chapter.chapterId,
          level,
        });
        navigate({ to: "/quiz/$quizId", params: { quizId: quiz.id } });
      }}
    >
      {isLaunching ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Starting…
        </>
      ) : disabled ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </>
      ) : (
        <>
          <Play className="h-3 w-3" />
          Start
        </>
      )}
    </Button>
  );
}