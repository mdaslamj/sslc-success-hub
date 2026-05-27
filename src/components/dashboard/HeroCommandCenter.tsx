import type {
  MomentumOutput,
  NextActionOutput,
  RankPredictionOutput,
  ScoreProjectionOutput,
  Subject,
} from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { MomentumMeter } from "@/components/shared/MomentumMeter";
import { RankBadge } from "@/components/shared/RankBadge";

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

type LayoutDensity = AdaptiveTheme["layoutDensity"];

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

type HeroCommandCenterProps = {
  projection: ScoreProjectionOutput;
  nextAction: NextActionOutput;
  dashboardTone: string;
  theme: AdaptiveTheme;
  layoutDensity: LayoutDensity;
  momentum: MomentumOutput;
  rank: RankPredictionOutput;
  archetype: string;
};

export function HeroCommandCenter({
  projection,
  nextAction,
  dashboardTone,
  theme,
  layoutDensity,
  momentum,
  rank,
  archetype,
}: HeroCommandCenterProps) {
  const missions = [nextAction, nextAction.followUp].filter(
    (mission): mission is NextActionOutput => Boolean(mission),
  );

  const subjectRows = (["math", "science", "social"] as Subject[]).map((subject) => ({
    subject,
    label: SUBJECT_LABEL[subject] ?? subject,
    color: SUBJECT_COLOR[subject] ?? theme.primary,
    percentage: projection.bySubject[subject]?.percentage ?? 0,
  }));

  const densityGap =
    layoutDensity === "simple" ? "gap-3" : layoutDensity === "advanced" ? "gap-5" : "gap-4";

  return (
    <section
      className={`grid shrink-0 grid-cols-1 px-4 py-3 md:grid-cols-3 ${densityGap}`}
      style={{ minHeight: 160 }}
    >
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Today&apos;s Critical Mission
          </span>
          {layoutDensity === "advanced" ? (
            <span className="text-[10px] text-slate-400">
              {Math.round(nextAction.confidence * 100)}% confidence
            </span>
          ) : null}
        </div>
        <div className="space-y-2">
          {missions.map((mission, index) => (
            <MissionCard
              key={`${mission.chapter}-${index}`}
              title={index === 0 ? "Primary" : "Follow-up"}
              action={mission.recommendedAction}
              gain={mission.estimatedGain}
              minutes={mission.timeRequired}
              urgency={mission.urgency}
              rationale={mission.rationale}
              accent={theme.accent}
            />
          ))}
        </div>
      </div>

      {archetype === "topper" ? (
        <div className="rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Momentum
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div
                className="text-3xl font-black"
                style={{ color: theme.primary, fontFamily: "Syne, sans-serif" }}
              >
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
          <RankBadge rank={rank} archetype={archetype} />
        </div>
      ) : (
        <MomentumMeter
          momentum={momentum}
          dashboardTone={dashboardTone}
          theme={theme}
          layoutDensity={layoutDensity}
        />
      )}
    </section>
  );
}
