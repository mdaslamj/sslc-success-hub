import type { RecoveryEngineOutput } from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { numericFontStyle } from "@/lib/design-tokens";

const SUBJECT_LABEL: Record<string, string> = {
  math: "Math",
  science: "Science",
  social: "Social",
};

const URGENCY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#22c55e",
  low: "#34d399",
};

type LayoutDensity = AdaptiveTheme["layoutDensity"];

type RecoverySectionProps = {
  recovery: RecoveryEngineOutput;
  theme: AdaptiveTheme;
  layoutDensity: LayoutDensity;
};

export function RecoverySection({ recovery, theme, layoutDensity }: RecoverySectionProps) {
  const itemLimit = layoutDensity === "simple" ? 2 : 4;
  const topItems = recovery?.top3 ?? [];

  return (
    <div className="overflow-y-auto rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Mark Rescue
        </span>
        <span className="text-xs text-red-400 tabular-nums" style={numericFontStyle}>
          {(recovery?.totalAtRisk ?? 0).toFixed(1)} at risk
        </span>
      </div>
      <div className="space-y-2">
        {topItems.slice(0, itemLimit).map((item) => (
          <div
            key={item.chapter}
            className={`aura-archetype-transition rounded-lg border border-[#1a2744] bg-[#050c1c] p-2.5 ${
              item.urgency === "critical" ? "aura-recovery-critical" : ""
            }`}
            style={
              item.urgency === "critical"
                ? { borderLeft: "2px solid #ef4444" }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-100">{item.name ?? item.chapter}</div>
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
              <span className="tabular-nums" style={numericFontStyle}>
                {item.currentMastery ?? 0}% mastery
              </span>
              <span className="tabular-nums" style={numericFontStyle}>
                +{(item.recoverableMarks ?? 0).toFixed(1)} recoverable
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
