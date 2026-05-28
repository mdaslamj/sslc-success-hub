import { memo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};

function StatTile({ label, value, hint, accent = "text-foreground" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${accent}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Aura Analytics — read-only trajectory and mastery visualization.
 * Pure presentation: all intelligence comes from `view` prop.
 */
function AuraAnalytics({ view }) {
  if (!view) return null;

  const weekMinutes = view.sessionActivity.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Exam readiness"
          value={`${view.readiness}%`}
          hint={`Target ${view.targetScore}% · gap ${view.gap} pts`}
          accent="gradient-text"
        />
        <StatTile
          label="Chapters done"
          value={`${view.chaptersDone}/${view.totalChapters}`}
          hint={`${view.overallProgress}% overall progress`}
        />
        <StatTile
          label="Target probability"
          value={`${view.probability}%`}
          hint="From projection + mastery curve"
        />
        <StatTile
          label="Momentum"
          value={`${view.momentum.score}`}
          hint={`${view.momentum.badge} · ${view.momentum.streak} day streak`}
        />
        <StatTile
          label="Energy"
          value={`${view.burnout.score}`}
          hint={view.burnout.recommendation}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-card">
          <h3 className="font-display text-base font-semibold sm:text-lg">
            Readiness trajectory
          </h3>
          <p className="text-xs text-muted-foreground">
            Session score trend converging on current engine readiness
          </p>
          <div className="mt-4 h-52 w-full min-w-0 sm:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={view.trajectory}>
                <defs>
                  <linearGradient id="gAuraTrajectory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v}%`, "Readiness"]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#gAuraTrajectory)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-card">
          <div className="mb-4 flex items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-semibold sm:text-lg">
                Study rhythm
              </h3>
              <p className="text-xs text-muted-foreground">
                Minutes from profile session history · last 14 days
              </p>
            </div>
            <p className="text-right text-sm font-semibold tabular-nums text-brand">
              {weekMinutes}m
            </p>
          </div>
          <div className="h-52 w-full min-w-0 sm:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={view.sessionActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v} min`, "Study"]}
                />
                <Bar dataKey="minutes" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-card">
        <h3 className="font-display text-base font-semibold sm:text-lg">Target gap recovery</h3>
        <p className="text-xs text-muted-foreground">
          Per-subject gap from engines.target.bySubject · recovered vs session baseline
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {view.gapData.map((row) => (
            <div
              key={row.subjectId}
              className="rounded-xl border border-border/60 bg-background/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{row.subject}</span>
                <span className="text-xs tabular-nums text-muted-foreground">+{row.gap} gap</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, row.recovered + row.gap > 0 ? (row.recovered / (row.recovered + row.gap)) * 100 : 0)}%`,
                    background: row.color,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {row.recovered} pts recovered
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-card">
          <h3 className="font-display text-base font-semibold sm:text-lg">Session heatmap</h3>
          <p className="text-xs text-muted-foreground">
            Profile session history · 0 = none, 3 = three or more per day
          </p>
          <div className="mt-4 overflow-x-auto">
            <div className="inline-grid grid-cols-7 gap-1">
              {view.sessionHeatmap.map((cell, index) => (
                <div
                  key={`${cell.week}-${cell.dayIndex}-${index}`}
                  title={`${cell.week} ${cell.day}: ${cell.sessions} session(s)`}
                  className="h-6 w-6 rounded-sm"
                  style={{
                    backgroundColor:
                      cell.intensity === 0
                        ? "var(--muted)"
                        : cell.intensity === 1
                          ? "color-mix(in oklab, var(--brand) 35%, transparent)"
                          : cell.intensity === 2
                            ? "color-mix(in oklab, var(--brand) 65%, transparent)"
                            : "var(--brand)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-card">
          <h3 className="font-display text-base font-semibold sm:text-lg">Weekly summary</h3>
          <p className="text-xs text-muted-foreground">Grouped from profile.sessionHistory</p>
          <ul className="mt-4 space-y-2">
            {view.weeklySummary.length === 0 ? (
              <li className="text-sm text-muted-foreground">No weekly sessions yet.</li>
            ) : (
              view.weeklySummary.map((row) => (
                <li
                  key={row.week}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs"
                >
                  <span className="font-medium">{row.week}</span>
                  <span className="text-muted-foreground">
                    {row.sessions} sessions · {row.marksRecovered}m est. · +{row.probGain} prob
                  </span>
                  <span className="text-muted-foreground">Best: {row.bestSubject}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-card">
        <h3 className="font-display text-base font-semibold sm:text-lg">
          Subject mastery & probability
        </h3>
        <p className="text-xs text-muted-foreground">
          Live from profile chapter mastery and score projection
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {view.subjects.map((subject) => (
            <div
              key={subject.id}
              className="rounded-xl border border-border/60 bg-background/40 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: subject.color }}
                  />
                  <span className="truncate font-medium">{subject.name}</span>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  P(hit) {subject.probability}%
                </span>
              </div>
              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-35"
                  style={{
                    width: `${Math.min(100, subject.predicted)}%`,
                    background: subject.color,
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.min(100, subject.mastery)}%`,
                    background: `linear-gradient(90deg, ${subject.color}aa, ${subject.color})`,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>Mastery {subject.mastery}%</span>
                <span>Predicted {subject.predicted}% · Target {subject.target}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-semibold sm:text-lg">
              Learning dimensions
            </h3>
            <p className="text-xs text-muted-foreground">
              Behavioral analytics from session history · health {view.overallHealth}%
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {view.dimensions.map((dim) => (
            <div
              key={dim.key}
              className="rounded-xl border border-border/60 bg-background/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{dim.label}</span>
                <span className="text-sm font-semibold tabular-nums">{dim.score}</span>
              </div>
              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand"
                  style={{ width: `${Math.min(100, dim.score)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                {dim.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default memo(AuraAnalytics);
