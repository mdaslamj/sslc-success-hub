import { Sparkles, ArrowRight, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { recommendRevisions } from "@/lib/revision-planner";
import { subjects as allSubjects } from "@/lib/mock-data";

export type RevisionPick = {
  subjectId: string;
  subjectName: string;
  topic: string;
  minutes: number;
};

/**
 * Self-contained revision planner card. Reads analytics + subjects, scores
 * with the pure recommender, renders a ranked list. Optional `onAddToPlan`
 * lets the parent slot suggestions straight into today's schedule.
 */
export function RevisionPlannerCard({
  onAddToPlan,
  limit = 3,
}: {
  onAddToPlan?: (pick: RevisionPick) => void;
  limit?: number;
}) {
  const a = useAnalytics();

  const recs = recommendRevisions({
    subjects: allSubjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      emoji: s.emoji,
      completion: s.completion,
      weakTopics: s.weakTopics,
      chaptersDone: s.chaptersDone,
      chaptersTotal: s.chapters,
    })),
    sessions: a.recentSessions,
    streak: a.streak,
    limit,
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" /> Smart Revision
        </h3>
        <Badge variant="outline" className="rounded-full gap-1">
          <Flame className="h-3 w-3" />
          {a.streak.current}d
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Ranked by weak topics, syllabus gaps, staleness, and time balance.
      </p>

      <ul className="mt-4 space-y-2">
        {recs.map((r, i) => (
          <li
            key={r.subjectId}
            className="rounded-2xl border border-border/60 bg-background/40 p-3 transition hover:border-brand/40"
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold"
                style={{
                  background: `color-mix(in oklab, ${r.color} 18%, transparent)`,
                  color: r.color,
                }}
              >
                {r.emoji ?? i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-semibold truncate">
                    {r.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.suggestedMinutes} min
                  </span>
                </div>
                <div className="text-xs text-foreground/80 truncate">{r.topic}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {r.reasons.slice(0, 2).map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
              {onAddToPlan && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 gap-1 rounded-full px-2 text-[11px]"
                  onClick={() =>
                    onAddToPlan({
                      subjectId: r.subjectId,
                      subjectName: r.name,
                      topic: r.topic,
                      minutes: r.suggestedMinutes,
                    })
                  }
                >
                  Add <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {recs.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
          Nothing to revise yet. Add some subjects to get recommendations.
        </div>
      )}
    </div>
  );
}