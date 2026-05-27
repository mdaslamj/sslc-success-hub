import type { BurnoutOutput } from "@/types/aura-engine-contracts";
import { getUrgencyStyle } from "@/styles/theme";

type BurnoutIndicatorProps = {
  burnout?: BurnoutOutput | null;
};

export function BurnoutIndicator({ burnout }: BurnoutIndicatorProps) {
  const risk = burnout?.risk ?? "low";
  if (risk === "low") {
    return null;
  }

  const urgencyStyle = getUrgencyStyle(risk === "high" ? 25 : 45);

  return (
    <div
      className="aura-slide-down flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"
      style={{
        borderColor: `${urgencyStyle.color}33`,
        backgroundColor: urgencyStyle.background,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-sm" style={{ color: urgencyStyle.color }} aria-hidden>
          ⚠
        </span>
        <p className="truncate text-xs text-slate-300">{burnout?.recommendation ?? ""}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold"
        style={{
          color: urgencyStyle.color,
          backgroundColor: `${urgencyStyle.color}22`,
          border: `1px solid ${urgencyStyle.color}44`,
        }}
        onClick={() => console.log("burnout_action_taken")}
      >
        {burnout?.recoveryAction ?? "Take a break"}
      </button>
    </div>
  );
}
