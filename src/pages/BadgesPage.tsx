/**
 * BadgesPage — Tasks 13 & 14
 * Route: /badges
 *
 * Shows:
 *   - Earned badges from practice & exam history (T14)
 *   - Mock exam history with scores over time (T13)
 */

import { DashboardLayout } from "@/components/dashboard-layout";
import { useAnalytics } from "@/hooks/use-analytics";
import { useMockExamHistory } from "@/hooks/use-mock-exam-history";
import { useBadges } from "@/hooks/use-badges";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Trophy, Lock, TrendingUp, Clock } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

const CATEGORY_LABELS: Record<string, string> = {
  practice: "Practice",
  accuracy: "Accuracy",
  explorer: "Explorer",
  exam: "Mock Exam",
  streak: "Streak",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BadgesPage() {
  const { data: analyticsData } = useAnalytics();
  const { history, bestScore, averageAccuracy, totalExamsTaken, clearHistory } = useMockExamHistory();
  const { badges, earned, locked, nextBadge } = useBadges(analyticsData, history);

  const categories = ["practice", "accuracy", "explorer", "exam"];

  return (
    <DashboardLayout title="Badges & Exams">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">

        {/* Badge summary */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-brand-glow p-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">{earned.length}/{badges.length} Badges</p>
              <p className="text-sm text-primary-foreground/80">Keep practising to unlock more!</p>
            </div>
          </div>
          {nextBadge && (
            <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm">
              Next: {nextBadge.emoji} <span className="font-semibold">{nextBadge.title}</span>
              {" — "}{nextBadge.description}
            </div>
          )}
        </div>

        {/* Badges by category */}
        {categories.map((cat) => {
          const catBadges = badges.filter((b) => b.category === cat);
          if (!catBadges.length) return null;
          return (
            <section key={cat}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {catBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={cn(
                      "rounded-2xl border p-4 text-center transition",
                      badge.earned
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-muted/30 opacity-60",
                    )}
                  >
                    <div className="text-3xl mb-2">
                      {badge.earned ? badge.emoji : <Lock className="mx-auto h-7 w-7 text-muted-foreground" />}
                    </div>
                    <p className={cn(
                      "text-sm font-semibold",
                      badge.earned ? "text-foreground" : "text-muted-foreground",
                    )}>
                      {badge.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Mock Exam History — T13 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Mock Exam History
          </h2>

          {/* Summary stats */}
          {totalExamsTaken > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">{totalExamsTaken}</p>
                <p className="text-xs text-muted-foreground">Exams Taken</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">{bestScore}%</p>
                <p className="text-xs text-muted-foreground">Best Score</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">{averageAccuracy}%</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <span className="text-4xl">📝</span>
              <p className="mt-2 font-semibold text-foreground">No exams yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete a mock exam to see your history here
              </p>
              <Link to="/mock-exam">
                <button className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
                  Take Mock Exam →
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record, i) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        Exam #{totalExamsTaken - i}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(record.dateTaken)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-bold",
                        record.accuracy >= 75 ? "text-green-600" :
                        record.accuracy >= 50 ? "text-yellow-600" : "text-red-600",
                      )}>
                        {record.accuracy}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.score}/{record.total}
                      </p>
                    </div>
                  </div>

                  {/* Accuracy bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        record.accuracy >= 75 ? "bg-green-500" :
                        record.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500",
                      )}
                      style={{ width: `${record.accuracy}%` }}
                    />
                  </div>

                  {/* Subject breakdown */}
                  <div className="flex flex-wrap gap-2">
                    {record.subjectBreakdown.map((s) => (
                      <span
                        key={s.subjectName}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {s.subjectName}: {s.correct}/{s.total}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(record.timeTakenSecs)}</span>
                  </div>
                </div>
              ))}

              {/* Clear history */}
              <button
                onClick={() => {
                  if (confirm("Clear all exam history?")) clearHistory();
                }}
                className="w-full rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-muted transition"
              >
                Clear History
              </button>
            </div>
          )}
        </section>

        {/* Action links */}
        <div className="flex flex-col gap-3">
          <Link to="/mock-exam">
            <button className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm">
              Take Mock Exam
            </button>
          </Link>
          <Link to="/practice">
            <button className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition">
              Practice Chapters →
            </button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
