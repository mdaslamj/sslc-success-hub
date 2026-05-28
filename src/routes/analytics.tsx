import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Waves,
  CheckCircle2,
  Clock,
  Timer,
  TrendingUp,
  BookOpen,
  Plus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/widgets/stat-card";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Aura — Analytics" },
      {
        name: "description",
        content:
          "Track your study time, consistency, focus sessions, and subject-wise progress across the Karnataka SSLC syllabus.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const a = useAnalytics();
  const [busy, setBusy] = useState(false);

  // Dev-only quick-add to seed local data so charts aren't empty on first visit.
  function addDemoFocusSession() {
    setBusy(true);
    const now = Date.now();
    a.logSession({
      kind: "focus",
      startedAt: now - 25 * 60_000,
      endedAt: now,
      durationMinutes: 25,
    });
    setBusy(false);
  }

  return (
    <DashboardLayout title="Analytics">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Progress & Analytics
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Your learning, <span className="gradient-text">measured.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Overall progress, study time, consistency, and per-subject breakdown.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={addDemoFocusSession}
            disabled={busy}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Log 25-min focus
          </Button>
        </header>

        {/* Top stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Overall Progress"
            value={`${a.overallProgress}%`}
            hint={`${a.completedChapters} of ${a.totalChapters} chapters`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            accent="brand"
          />
          <StatCard
            label="Study Hours"
            value={a.totalStudyHours}
            hint={`${a.todayMinutes} min today`}
            icon={<Clock className="h-4 w-4" />}
            accent="info"
          />
          <StatCard
            label="Focus Sessions"
            value={a.focusSessions}
            hint="Pomodoro blocks completed"
            icon={<Timer className="h-4 w-4" />}
            accent="warning"
          />
          <StatCard
            label="Consistency"
            value={`${a.consistency.daysActiveLast14}/14`}
            hint={a.consistency.label}
            icon={<Waves className="h-4 w-4" />}
            accent="success"
          />
        </section>

        {/* Weekly + overall ring */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Weekly Study Activity</h3>
                <p className="text-xs text-muted-foreground">Minutes studied per day · last 7 days</p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-bold gradient-text">
                  {a.weekly.reduce((s, d) => s + d.minutes, 0)}m
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">this week</div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={a.weekly}>
                  <defs>
                    <linearGradient id="gAnalyticsWeek" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} min`, "Study"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="var(--brand)"
                    strokeWidth={2.5}
                    fill="url(#gAnalyticsWeek)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card flex flex-col items-center justify-center">
            <ProgressRing value={a.overallProgress} sublabel="Syllabus" />
            <div className="mt-4 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Chapters complete
              </div>
              <div className="font-display text-2xl font-semibold">
                {a.completedChapters}
                <span className="text-muted-foreground"> / {a.totalChapters}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Subject-wise progress */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand" />
            <h3 className="font-display text-lg font-semibold">Subject-wise Progress</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {a.bySubject.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/60 bg-background/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="font-display font-semibold">{s.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.chaptersDone}/{s.chaptersTotal} ch · {s.minutes}m
                  </span>
                </div>
                <div className="relative mt-3 h-2 rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${s.completion}%`,
                      background: `linear-gradient(90deg, ${s.color}, var(--brand-glow))`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>{s.completion}% complete</span>
                  <span>{Math.round(s.minutes / 60 * 10) / 10}h logged</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent sessions */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Recent Sessions</h3>
          <p className="text-xs text-muted-foreground">Your last 20 study blocks</p>
          {a.recentSessions.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No sessions yet. Use the focus timer or log a session to start tracking.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {a.recentSessions.map((s) => (
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
                  <div className="font-semibold tabular-nums">{s.durationMinutes}m</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}