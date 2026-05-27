import type { MomentumOutput } from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { AdaptiveMessage } from "@/components/shared/AdaptiveMessage";

type LayoutDensity = AdaptiveTheme["layoutDensity"];

type MomentumMeterProps = {
  momentum: MomentumOutput;
  dashboardTone: string;
  theme: AdaptiveTheme;
  layoutDensity: LayoutDensity;
};

function WeeklySparkline({
  pattern,
  color,
}: {
  pattern: MomentumOutput["weeklyPattern"];
  color: string;
}) {
  if (pattern.length === 0) return null;

  const width = 120;
  const height = 32;
  const points = pattern
    .map((day, index) => {
      const x = pattern.length === 1 ? width / 2 : (index / (pattern.length - 1)) * width;
      const y = height - (day.avgScore / 100) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="mt-2" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function MomentumMeter({
  momentum,
  dashboardTone,
  theme,
  layoutDensity,
}: MomentumMeterProps) {
  if (!momentum) {
    return null;
  }

  const score = momentum.score ?? 0;
  const badge = momentum.badge ?? "";
  const streak = momentum.streak ?? 0;
  const trend = momentum.trend ?? "stable";
  const weeklyPattern = momentum.weeklyPattern ?? [];

  return (
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
            {score}
          </div>
          <div className="text-xs text-slate-400">{badge}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-orange-400">{streak}d</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">streak</div>
          <div className="mt-1 text-xs capitalize text-slate-300">{trend}</div>
        </div>
      </div>
      {layoutDensity === "advanced" ? (
        <WeeklySparkline pattern={weeklyPattern} color={theme.accent} />
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{dashboardTone ?? ""}</p>
      <AdaptiveMessage context="onPanicDetected" />
      <AdaptiveMessage context="onMissedDay" />
      <AdaptiveMessage context="onStreak" />
      <AdaptiveMessage context="onLogin" />
    </div>
  );
}
