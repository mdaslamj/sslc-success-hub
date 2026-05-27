import type { AuraEngineOutputs } from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";

const SUBJECT_LABEL: Record<string, string> = {
  math: "Math",
  science: "Science",
  social: "Social",
};

const SUBJECT_COLOR: Record<string, string> = {
  math: "#6366f1",
  science: "#06b6d4",
  social: "#f59e0b",
};

const URGENCY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#22c55e",
  low: "#34d399",
};

export type AuraDashboardProps = {
  engines: AuraEngineOutputs;
  theme: AdaptiveTheme;
};

function ScoreOrb({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#1a2744" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
        <text
          x="48"
          y="52"
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="18"
          fontWeight="700"
          fontFamily="Syne, sans-serif"
        >
          {Math.round(value)}%
        </text>
      </svg>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}

function MissionCard({
  title,
  action,
  gain,
  minutes,
  urgency,
  rationale,
  accent,
}: {
  title: string;
  action: string;
  gain: string;
  minutes: number;
  urgency: string;
  rationale: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: `${accent}44`, backgroundColor: "#080f1e" }}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="text-sm font-bold text-slate-100">{action}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        <span style={{ color: URGENCY_COLOR[urgency] ?? accent }}>{urgency.toUpperCase()}</span>
        <span className="text-slate-400">{gain}</span>
        <span className="text-slate-500">{minutes} min</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{rationale}</p>
    </div>
  );
}

export function AuraDashboard({ engines, theme }: AuraDashboardProps) {
  const { projection, archetype, recovery, target, momentum, nextAction, analytics, profile } =
    engines;

  const missions = [
    nextAction,
    nextAction.followUp,
  ].filter(Boolean);

  const planTasks = recovery.top3.slice(0, 3).map((item, index) => ({
    id: item.chapter,
    subject: item.subject,
    name: item.name,
    minutes: item.sessionsNeeded * 20,
    reason:
      index === 0
        ? nextAction.rationale
        : `${item.recoverableMarks.toFixed(1)} marks recoverable`,
    urgency: item.urgency,
  }));

  const subjectRows = (["math", "science", "social"] as const).map((subject) => ({
    subject,
    label: SUBJECT_LABEL[subject] ?? subject,
    color: SUBJECT_COLOR[subject] ?? theme.primary,
    percentage: projection.bySubject[subject]?.percentage ?? 0,
    predicted: projection.bySubject[subject]?.predicted ?? 0,
    max: projection.bySubject[subject]?.max ?? 0,
  }));

  const densityGap =
    theme.layoutDensity === "simple" ? "gap-3" : theme.layoutDensity === "advanced" ? "gap-5" : "gap-4";

  return (
    <div
      className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#020817] text-slate-200"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* Section 1 — NavBar */}
      <header className="flex h-[50px] shrink-0 items-center justify-between border-b border-[#1a2744] px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black tracking-tight text-slate-100" style={{ fontFamily: "Syne, sans-serif" }}>
            Aura
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
            style={{ color: theme.primary, backgroundColor: theme.dim, border: `1px solid ${theme.primary}44` }}
          >
            {theme.badge}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{profile.student.daysToExam} days to exam</span>
          <span className="font-medium text-slate-200">{profile.student.name}</span>
        </div>
      </header>

      {/* Section 2 — Hero Command Center */}
      <section className={`grid shrink-0 grid-cols-1 gap-3 px-4 py-3 md:grid-cols-3 ${densityGap}`} style={{ minHeight: 160 }}>
        <div className="flex items-center gap-4 rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
          <ScoreOrb value={projection.percentage} label="Predicted" color={theme.primary} />
          <div className="flex-1 space-y-2">
            {subjectRows.map((row) => (
              <div key={row.subject}>
                <div className="mb-0.5 flex justify-between text-[10px] text-slate-400">
                  <span>{row.label}</span>
                  <span>{Math.round(row.percentage)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#050c1c]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.percentage}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Today&apos;s Critical Mission
          </div>
          <div className="space-y-2">
            {missions.map((mission, index) => (
              <MissionCard
                key={`${mission!.chapter}-${index}`}
                title={index === 0 ? "Primary" : "Follow-up"}
                action={mission!.recommendedAction}
                gain={mission!.estimatedGain}
                minutes={mission!.timeRequired}
                urgency={mission!.urgency}
                rationale={mission!.rationale}
                accent={theme.accent}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Momentum
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-black" style={{ color: theme.primary, fontFamily: "Syne, sans-serif" }}>
                {momentum.score}
              </div>
              <div className="text-xs text-slate-400">{momentum.badge}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-orange-400">{momentum.streak}d</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">streak</div>
              <div className="mt-1 text-xs capitalize text-slate-300">{momentum.trend}</div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">{archetype.dashboardTone}</p>
        </div>
      </section>

      {/* Section 3 — Middle Grid */}
      <section className={`grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden px-4 pb-3 md:grid-cols-3 ${densityGap}`}>
        <div className="overflow-y-auto rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Subject Balance
          </div>
          <div className="space-y-3">
            {subjectRows.map((row) => (
              <div key={row.subject}>
                <div className="mb-1 flex justify-between text-xs">
                  <span style={{ color: row.color }}>{row.label}</span>
                  <span className="text-slate-400">
                    {row.predicted.toFixed(1)}/{row.max} marks
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#050c1c]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${row.percentage}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Analytics health: {analytics.overallHealthScore}/100 · {theme.tone}
          </div>
        </div>

        <div className="overflow-y-auto rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Mark Rescue
            </span>
            <span className="text-xs text-red-400">{recovery.totalAtRisk.toFixed(1)} at risk</span>
          </div>
          <div className="space-y-2">
            {recovery.top3.slice(0, 4).map((item) => (
              <div
                key={item.chapter}
                className="rounded-lg border border-[#1a2744] bg-[#050c1c] p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{item.name}</div>
                    <div className="text-[10px] uppercase text-slate-500">
                      {SUBJECT_LABEL[item.subject] ?? item.subject}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase"
                    style={{ color: URGENCY_COLOR[item.urgency] ?? theme.accent }}
                  >
                    {item.urgency}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                  <span>{item.currentMastery}% mastery</span>
                  <span>+{item.recoverableMarks.toFixed(1)} recoverable</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Target Gap
          </div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-slate-100" style={{ fontFamily: "Syne, sans-serif" }}>
                {Math.round(projection.percentage)}%
              </div>
              <div className="text-xs text-slate-400">current prediction</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.accent }}>
                {target.targetScore}%
              </div>
              <div className="text-xs text-slate-400">target</div>
            </div>
          </div>
          <div className="mb-3 text-xs text-slate-400">
            Gap {target.gapPercentage.toFixed(1)}% · {target.estimatedHours.toFixed(1)}h path
            {target.reachableBy ? ` · by ${target.reachableBy}` : ""}
          </div>
          <div className="space-y-2">
            {target.rankedChapters.slice(0, 5).map((chapter) => (
              <div
                key={chapter.chapter}
                className="flex items-center justify-between rounded-lg bg-[#050c1c] px-2 py-1.5 text-[11px]"
              >
                <span className="truncate text-slate-200">{chapter.name}</span>
                <span className="shrink-0 text-slate-400">ROI {chapter.roi.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Today's Plan */}
      <section className="shrink-0 border-t border-[#1a2744] px-4 py-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Today&apos;s Plan
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {planTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-[#1a2744] bg-[#080f1e] px-3 py-2"
            >
              <input type="checkbox" className="h-4 w-4 rounded border-[#1a2744]" readOnly />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-100">{task.name}</div>
                <div className="text-[10px] text-slate-500">
                  {SUBJECT_LABEL[task.subject] ?? task.subject} · {task.minutes} min ·{" "}
                  {task.urgency}
                </div>
                <div className="truncate text-[11px] text-slate-400">{task.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
