import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Timer } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  AnalyticsInsufficientDataPrompt,
} from "@/components/empty-states/NewStudentPrompts";
import { AcademicAnalyticsSection } from "@/components/analytics/AcademicAnalyticsSection";
import { ExamReadiness } from "@/components/predictions/ExamReadiness";
import { numericFontStyle } from "@/lib/design-tokens";
import { sessionCount } from "@/lib/profileActivity";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAuraEngines } from "@/hooks/useAuraEngines";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Aura — Analytics" },
      {
        name: "description",
        content:
          "Trajectory, mastery, and behavioral analytics from your adaptive academic-state graph.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const a = useAnalytics();
  const { profile } = useAuraEngines();
  const sessions = sessionCount(profile);
  const showCharts = sessions >= 3;

  return (
    <DashboardLayout title="Analytics">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Academic intelligence
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Trajectory & <span className="gradient-text">mastery.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Read-only projection from profile, session history, and Aura engines.
            </p>
          </div>
        </header>

        {showCharts ? <AcademicAnalyticsSection /> : <AnalyticsInsufficientDataPrompt />}

        <section className="rounded-2xl border border-border/60 bg-[#08080E] p-4 sm:p-6">
          <ExamReadiness embedded />
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Focus session log</h3>
          <p className="text-xs text-muted-foreground">
            Local focus-timer history · complements profile session records
          </p>
          {a.recentSessions.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No focus sessions yet. Use the focus timer on the planner to log focus time.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {a.recentSessions.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium capitalize">{s.kind} session</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(s.startedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums" style={numericFontStyle}>
                    {s.durationMinutes}m
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
