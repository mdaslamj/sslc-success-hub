import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Flame,
  Sparkles,
  Target,
} from "lucide-react";
import type { ParentSummary, SubjectParentSummary } from "@/types/parentView";
import { cn } from "@/lib/utils";

const READINESS_COPY: Record<
  ParentSummary["overallReadiness"],
  { label: string; hint: string; color: string }
> = {
  "on-track": {
    label: "On track",
    hint: "Steady progress toward the board exam",
    color: "#4ADE80",
  },
  "needs-attention": {
    label: "Keep encouraging",
    hint: "A little extra focus this week will help",
    color: "#FBBF24",
  },
  "at-risk": {
    label: "Extra support helps",
    hint: "Consistency matters most right now",
    color: "#F87171",
  },
};

export function ParentSummaryView({
  summary,
  showShareHint = false,
}: {
  summary: ParentSummary;
  showShareHint?: boolean;
}) {
  const readiness = READINESS_COPY[summary.overallReadiness];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Progress summary
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
          {summary.studentName.split(" ")[0]}&apos;s journey
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {summary.daysUntilExam} days to exam
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: `${readiness.color}20`, color: readiness.color }}
          >
            {readiness.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{readiness.hint}</p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <ActivityTile
          label="Sessions"
          value={`${summary.weeklyActivity.sessionsCompleted}`}
          hint="this week"
        />
        <ActivityTile
          label="Study time"
          value={`${Math.round(summary.weeklyActivity.studyMinutes / 60)}h`}
          hint="this week"
        />
        <ActivityTile
          label="Streak"
          value={`${summary.weeklyActivity.streakDays}d`}
          hint="practice rhythm"
          icon={<Flame className="h-4 w-4 text-warning" />}
        />
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          By subject
        </h3>
        <ul className="mt-3 space-y-3">
          {summary.subjectSummaries.map((subject) => (
            <SubjectRow key={subject.subjectId} subject={subject} />
          ))}
        </ul>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <HighlightCard
          tone="success"
          title="Recent win"
          body={summary.recentWin}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <HighlightCard
          tone="primary"
          title="Current focus"
          body={summary.focusArea}
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      <section className="rounded-3xl border border-primary/25 bg-primary/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">From Aura</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{summary.parentMessage}</p>
      </section>

      {showShareHint ? (
        <p className="text-center text-xs text-muted-foreground">
          Share this calm summary — no test scores or anxiety metrics are included.
        </p>
      ) : null}

      <footer className="rounded-xl bg-secondary/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        This view shows a supportive summary only. Individual study details stay private to{" "}
        {summary.studentName.split(" ")[0]}.
      </footer>
    </div>
  );
}

function ActivityTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function SubjectRow({ subject }: { subject: SubjectParentSummary }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-background/40 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: subject.color }}
          />
          <span className="text-sm font-semibold text-foreground">{subject.subjectName}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{subject.statusLabel}</p>
      </div>
      <TrendBadge trend={subject.trend} />
    </li>
  );
}

function TrendBadge({ trend }: { trend: SubjectParentSummary["trend"] }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
        <ArrowUp className="h-3.5 w-3.5" />
        Up
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive">
        <ArrowDown className="h-3.5 w-3.5" />
        Down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <ArrowRight className="h-3.5 w-3.5" />
      Steady
    </span>
  );
}

function HighlightCard({
  tone,
  title,
  body,
  icon,
}: {
  tone: "success" | "primary";
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border p-4 shadow-soft",
        tone === "success" ? "border-success/30 bg-success/5" : "border-primary/20 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs uppercase tracking-wider",
          tone === "success" ? "text-success" : "text-primary",
        )}
      >
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm text-foreground">{body}</p>
    </section>
  );
}
