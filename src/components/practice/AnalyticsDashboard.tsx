/**
 * AnalyticsDashboard — Task 5
 *
 * Shows student performance:
 *   - Overall accuracy and questions attempted
 *   - Per-subject accuracy bars
 *   - Weak chapters (lowest accuracy)
 *   - Recent activity
 */

import { cn } from "@/lib/utils";
import { Target, BookOpen, TrendingUp, AlertTriangle, Trophy, Clock } from "lucide-react";
import type { AnalyticsData, ChapterStats, SubjectStats } from "@/hooks/use-analytics";
import { SUBJECTS } from "@/lib/question-bank";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  data: AnalyticsData;
  onPracticeChapter: (chapterId: string, subjectId: string) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AccuracyBar({ accuracy, size = "md" }: { accuracy: number; size?: "sm" | "md" }) {
  const color =
    accuracy >= 80 ? "bg-green-500" :
    accuracy >= 60 ? "bg-yellow-500" :
    accuracy >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className={cn("w-full rounded-full bg-muted overflow-hidden", size === "sm" ? "h-1.5" : "h-2.5")}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${accuracy}%` }}
      />
    </div>
  );
}

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const { label, className } =
    accuracy >= 80 ? { label: "Strong", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" } :
    accuracy >= 60 ? { label: "Good", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" } :
    accuracy >= 40 ? { label: "Needs Work", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" } :
    { label: "Weak", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", className)}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalyticsDashboard({ data, onPracticeChapter }: Props) {
  const hasData = data.totalQuestionsAttempted > 0;
  const weakChapters = Object.values(data.chapterStats)
    .filter((c) => c.totalAttempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4);

  if (!hasData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="text-5xl">📊</span>
        <h2 className="mt-4 text-xl font-bold text-foreground">No Data Yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete at least one practice session to see your analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your performance across all subjects</p>
      </div>

      {/* Overall stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Target className="mx-auto mb-1 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold text-foreground">{data.overallAccuracy}%</p>
          <p className="text-xs text-muted-foreground">Overall Accuracy</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <BookOpen className="mx-auto mb-1 h-5 w-5 text-blue-500" />
          <p className="text-2xl font-bold text-foreground">{data.totalQuestionsAttempted}</p>
          <p className="text-xs text-muted-foreground">Questions Done</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-yellow-500" />
          <p className="text-2xl font-bold text-foreground">
            {Object.keys(data.chapterStats).length}
          </p>
          <p className="text-xs text-muted-foreground">Chapters Covered</p>
        </div>
      </div>

      {/* Subject performance */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Subject Performance
        </h2>
        <div className="space-y-3">
          {SUBJECTS.map((subject) => {
            const stats: SubjectStats | undefined = data.subjectStats[subject.id];
            if (!stats) return (
              <div key={subject.id} className="rounded-xl border border-border bg-card p-4 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{subject.icon}</span>
                    <span className="font-medium text-foreground">{subject.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Not started</span>
                </div>
              </div>
            );
            return (
              <div key={subject.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{subject.icon}</span>
                    <span className="font-medium text-foreground">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{stats.accuracy}%</span>
                    <AccuracyBadge accuracy={stats.accuracy} />
                  </div>
                </div>
                <AccuracyBar accuracy={stats.accuracy} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {stats.correctAttempts}/{stats.totalAttempts} correct · {stats.chaptersAttempted} chapter{stats.chaptersAttempted !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weak chapters */}
      {weakChapters.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Chapters Needing Attention
          </h2>
          <div className="space-y-2">
            {weakChapters.map((chapter) => {
              const subject = SUBJECTS.find((s) => s.id === chapter.subjectId);
              return (
                <div key={chapter.chapterId} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{subject?.icon}</span>
                        <p className="text-xs text-muted-foreground truncate">{subject?.name}</p>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{chapter.chapterName}</p>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{chapter.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">{chapter.totalAttempts} attempts</p>
                    </div>
                  </div>
                  <AccuracyBar accuracy={chapter.accuracy} size="sm" />
                  <button
                    onClick={() => onPracticeChapter(chapter.chapterId, chapter.subjectId)}
                    className="mt-3 w-full rounded-lg bg-orange-50 border border-orange-200 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-100 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300"
                  >
                    Practice This Chapter →
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Chapter-level breakdown */}
      {Object.keys(data.chapterStats).length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            All Chapters
          </h2>
          <div className="space-y-2">
            {Object.values(data.chapterStats)
              .sort((a, b) => (b.lastAttemptAt ?? 0) - (a.lastAttemptAt ?? 0))
              .map((chapter) => {
                const subject = SUBJECTS.find((s) => s.id === chapter.subjectId);
                return (
                  <div key={chapter.chapterId} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <span className="text-lg shrink-0">{subject?.icon ?? "📖"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{chapter.chapterName}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <AccuracyBar accuracy={chapter.accuracy} size="sm" />
                        <span className="shrink-0 text-xs text-muted-foreground">{chapter.accuracy}%</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">{chapter.correctAttempts}/{chapter.totalAttempts}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{chapter.avgTimeSecs}s avg</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
