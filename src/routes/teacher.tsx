import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  GraduationCap,
  Loader2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useClassAnalytics } from "@/hooks/useClassAnalytics";
import { cn } from "@/lib/utils";
import type { ChapterClassAnalytics } from "@/types/teacherDashboard";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Aura — Class Intelligence Dashboard" },
      {
        name: "description",
        content:
          "Class-level aggregate analytics for SSLC teachers — chapter struggles and recommended focus, with no individual student data exposed.",
      },
    ],
  }),
  component: TeacherPage,
});

const SUBJECTS = [
  { id: "science", label: "Science" },
  { id: "math", label: "Mathematics" },
  { id: "social", label: "Social Science" },
] as const;

function TeacherPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [subjectId, setSubjectId] = useState<string>("science");
  const { analytics, loading } = useClassAnalytics(subjectId);

  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile || !isTeacher) {
      void navigate({ to: "/" });
    }
  }, [authLoading, user, profile, isTeacher, navigate]);

  const sortedChapters = useMemo(
    () =>
      analytics
        ? [...analytics.chapterAnalytics].sort((a, b) => b.studentsAtRisk - a.studentsAtRisk)
        : [],
    [analytics],
  );

  const schoolLabel =
    analytics?.schoolId && analytics.schoolId !== "demo"
      ? analytics.schoolId
      : "Your school";

  const subjectLabel = SUBJECTS.find((s) => s.id === subjectId)?.label ?? subjectId;

  if (authLoading || !isTeacher) {
    return (
      <DashboardLayout title="Teacher">
        <div className="flex min-h-[40dvh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Teacher">
      <div
        className="mx-auto max-w-3xl space-y-6 pb-24"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <header>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6]/15 px-2.5 py-1 text-[11px] font-medium text-[#8B5CF6]">
            <GraduationCap className="h-3.5 w-3.5" />
            Teacher view
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Class Intelligence Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {schoolLabel} · {subjectLabel}
          </p>
          {analytics ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Last updated{" "}
              {new Date(analytics.lastUpdated).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          ) : null}

          <div className="mt-4 max-w-xs">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : analytics ? (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Total students" value={analytics.totalStudents} />
              <StatTile label="Active this week" value={analytics.activeStudents} />
              <StatTile
                label="On track"
                value={analytics.subjectSummary.studentsOnTrack}
                tone="success"
              />
              <StatTile
                label="Need attention"
                value={analytics.subjectSummary.studentsAtRisk}
                tone="warning"
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-semibold">Chapter breakdown</h2>
                <p className="text-xs text-muted-foreground">
                  Sorted by students at risk — aggregate counts only
                </p>
              </div>
              <div className="divide-y divide-border/40">
                {sortedChapters.map((chapter) => (
                  <ChapterRow key={chapter.chapterId} chapter={chapter} />
                ))}
              </div>
            </section>

            <section
              className="rounded-2xl border border-[#8B5CF6]/40 bg-[#8B5CF6]/5 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8B5CF6]">
                Aura recommends
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {analytics.subjectSummary.recommendedFocus}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                This is based on aggregate performance data — no individual student data was
                used.
              </p>
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
            No class analytics available yet.
          </div>
        )}

        <footer className="rounded-xl bg-secondary/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          This dashboard shows class-level aggregates only. Individual student data is private
          and only visible to each student.
        </footer>
      </div>
    </DashboardLayout>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-bold",
          tone === "success" && "text-[#4ADE80]",
          tone === "warning" && "text-[#FBBF24]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ChapterRow({ chapter }: { chapter: ChapterClassAnalytics }) {
  const barColor =
    chapter.averageMastery < 40
      ? "bg-[#F87171]"
      : chapter.averageMastery <= 70
        ? "bg-[#FBBF24]"
        : "bg-[#4ADE80]";

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{chapter.chapterName}</p>
        <p className="text-xs text-muted-foreground">{chapter.blueprintMarks} blueprint marks</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${Math.min(100, Math.max(0, chapter.averageMastery))}%` }}
          />
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Avg mastery {chapter.averageMastery}%
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <Users className="h-3.5 w-3.5 text-[#F87171]" />
        <span className="font-mono font-semibold text-[#F87171]">{chapter.studentsAtRisk}</span>
        <span className="text-xs text-muted-foreground">at risk</span>
      </div>

      <GapBadge gap={chapter.primaryGapType} />

      <TrendIndicator trend={chapter.trendLastWeek} />

      <p className="text-[11px] text-muted-foreground md:text-right">
        {chapter.studentsStable} stable · {chapter.studentsStrong} strong
      </p>
    </div>
  );
}

function GapBadge({ gap }: { gap: ChapterClassAnalytics["primaryGapType"] }) {
  if (gap === "none") {
    return (
      <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        No gap
      </span>
    );
  }

  const styles = {
    conceptual: "bg-[#FBBF24]/15 text-[#FBBF24]",
    procedural: "bg-[#38BDF8]/15 text-[#38BDF8]",
    expression: "bg-[#8B5CF6]/15 text-[#C4B5FD]",
  };

  const labels = {
    conceptual: "Concept gap",
    procedural: "Procedure gap",
    expression: "Expression gap",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
        styles[gap],
      )}
    >
      {labels[gap]}
    </span>
  );
}

function TrendIndicator({ trend }: { trend: ChapterClassAnalytics["trendLastWeek"] }) {
  if (trend === "improving") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#4ADE80]">
        <ArrowUp className="h-3.5 w-3.5" />
        Improving
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#F87171]">
        <ArrowDown className="h-3.5 w-3.5" />
        Declining
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <ArrowRight className="h-3.5 w-3.5" />
      Stable
    </span>
  );
}
