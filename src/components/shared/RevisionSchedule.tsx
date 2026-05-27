import type { RevisionOutput, Subject } from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { getUrgencyStyle, SUBJECT_COLORS } from "@/styles/theme";

type RevisionScheduleProps = {
  revision: RevisionOutput;
  theme: AdaptiveTheme;
};

function formatRevisionDate(nextRevisionDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${nextRevisionDate}T00:00:00Z`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

function priorityStyle(priority: RevisionOutput["schedule"][number]["priority"]) {
  if (priority === "urgent") return getUrgencyStyle(30);
  if (priority === "scheduled") return getUrgencyStyle(60);
  return getUrgencyStyle(90);
}

export function RevisionSchedule({ revision, theme: _theme }: RevisionScheduleProps) {
  const rows = revision.schedule.slice(0, 3);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {rows.map((item) => {
        const style = priorityStyle(item.priority);
        const subjectColor = SUBJECT_COLORS[item.subject as Subject] ?? "#64748b";

        return (
          <div
            key={`${item.subject}-${item.chapter}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#1a2744] bg-[#080f1e] px-3 py-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: subjectColor }}
                aria-hidden
              />
              <span className="truncate text-sm font-medium text-slate-100">{item.name}</span>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{
                  color: style.color,
                  backgroundColor: style.background,
                }}
              >
                {item.priority}
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-slate-400">
              {formatRevisionDate(item.nextRevisionDate)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
