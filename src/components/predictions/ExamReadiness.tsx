import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MATHEMATICS_CHAPTERS,
  SCIENCE_CHAPTERS,
  SOCIAL_SCIENCE_CHAPTERS,
  SSLC_SUBJECTS,
  type CatalogChapter,
} from "@/data/sslc-academic-catalog";
import { buildConstellationView } from "@/core/academic-state/constellationView";
import {
  buildAdaptiveStateFromProfile,
  type PlannerSubjectSeed,
} from "@/core/academic-state/plannerCompletionAdapter";
import { computeProbabilitySnapshot } from "@/core/academic-state/probabilityEngine";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import { buildPlannerChapterPool } from "@/lib/planner-chapter-pool";
import {
  getMarksAtRiskStatus,
  getMasteryStatus,
  rankChaptersForToday,
  type PlannerEngineChapter,
  type PlannerEngineSubject,
  type RankedPlannerTask,
} from "@/lib/taskPriorityEngine";
import { SUBJECT_COLORS, STATUS_COLORS } from "@/lib/design-tokens";
import {
  addRankedTaskToTodayPlan,
  hasTaskWithTitle,
} from "@/lib/today-plan-store";
import { ExamReadinessSetTargetsPrompt } from "@/components/empty-states/NewStudentPrompts";
import { hasStudyActivity, hasSubjectTargets } from "@/lib/profileActivity";
import { cn } from "@/lib/utils";

type WarRoomSubject = {
  id: string;
  name: string;
  color: string;
  colorDim: string;
  mastery: number;
  predicted: number;
  target: number;
  totalMarks: number;
  emoji: string;
};

type LadderRow = {
  task: RankedPlannerTask;
  chapterRef: string;
  marksAtRisk: number;
  probabilityBump: number;
  level: "Easy" | "Medium" | "Hard";
};

type ProbabilityRow = {
  subject: WarRoomSubject;
  previousProbability: number;
  currentProbability: number;
  delta: number;
  reason: string;
  statusLabel: string;
  statusColor: string;
};

type TabId = "ladder" | "probability";

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function computeMarksAtRisk(blueprintMarks: number, mastery: number): number {
  return blueprintMarks * (1 - mastery / 100);
}

function buildChapterCatalogMap(): Map<string, CatalogChapter & { subjectId: string }> {
  const map = new Map<string, CatalogChapter & { subjectId: string }>();
  for (const ch of MATHEMATICS_CHAPTERS) map.set(ch.id, { ...ch, subjectId: "math" });
  for (const ch of SCIENCE_CHAPTERS) map.set(ch.id, { ...ch, subjectId: "science" });
  for (const ch of SOCIAL_SCIENCE_CHAPTERS) map.set(ch.id, { ...ch, subjectId: "social" });
  return map;
}

function catalogChapterRef(ch: CatalogChapter, subjectId: string): string {
  if (ch.section) return `${ch.section} · Ch ${ch.chapterNumber}`;
  const prefix =
    subjectId === "math" ? "Math" : subjectId === "science" ? "Sci" : "SSc";
  return `${prefix} · Ch ${ch.chapterNumber}`;
}

function buildProfileChapterPool(
  profile: ReturnType<typeof useAuraEngines>["profile"],
  plannerSubjects: PlannerSubjectSeed[],
): PlannerEngineChapter[] {
  const base = buildPlannerChapterPool();
  const adaptive = buildAdaptiveStateFromProfile(profile, plannerSubjects, base);
  return adaptive.chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.name,
    subjectId: chapter.subjectId,
    mastery: chapter.mastery,
    blueprintMarks: chapter.blueprintMarks,
    difficulty: base.find((row) => row.id === chapter.id)?.difficulty,
  }));
}

function buildWarRoomSubjects(
  constellationSubjects: ReturnType<typeof buildConstellationView>["subjects"],
  chapterPool: PlannerEngineChapter[],
): Record<string, WarRoomSubject> {
  const totalBySubject: Record<string, number> = {};
  for (const chapter of chapterPool) {
    totalBySubject[chapter.subjectId] =
      (totalBySubject[chapter.subjectId] ?? 0) + (chapter.blueprintMarks ?? 4);
  }

  const out: Record<string, WarRoomSubject> = {};
  for (const catalogSubject of SSLC_SUBJECTS) {
    const view = constellationSubjects[catalogSubject.id];
    const hex = SUBJECT_COLORS[catalogSubject.id as keyof typeof SUBJECT_COLORS] ?? view?.color ?? catalogSubject.color;
    out[catalogSubject.id] = {
      id: catalogSubject.id,
      name: catalogSubject.name,
      color: hex,
      colorDim: hexWithAlpha(hex, 0.12),
      mastery: view?.mastery ?? catalogSubject.mastery,
      predicted: view?.predicted ?? catalogSubject.predicted,
      target: view?.target ?? catalogSubject.target,
      totalMarks: totalBySubject[catalogSubject.id] ?? 0,
      emoji: catalogSubject.emoji,
    };
  }
  return out;
}

function toLadderRow(
  task: RankedPlannerTask,
  subjectsById: Record<string, WarRoomSubject>,
  catalogMap: Map<string, CatalogChapter & { subjectId: string }>,
): LadderRow {
  const chapter = task.chapter;
  const blueprintMarks = chapter.blueprintMarks ?? 4;
  const mastery = chapter.mastery ?? 50;
  const marksAtRisk = computeMarksAtRisk(blueprintMarks, mastery);
  const subject = subjectsById[chapter.subjectId];
  const totalMarks = subject?.totalMarks ?? 80;
  const catalog = catalogMap.get(chapter.id);
  const level = chapter.difficulty ?? catalog?.difficulty ?? "Medium";

  return {
    task,
    chapterRef: catalog
      ? catalogChapterRef(catalog, chapter.subjectId)
      : `${subject?.name ?? chapter.subjectId} · ${chapter.id}`,
    marksAtRisk,
    probabilityBump: Math.min(
      12,
      Math.round((marksAtRisk / Math.max(totalMarks, 1)) * 100 * 0.65),
    ),
    level,
  };
}

function urgencyStyle(marksAtRisk: number): { color: string; bg: string } {
  const band = getMarksAtRiskStatus(marksAtRisk);
  return { color: band.color, bg: band.bg };
}

function subjectSessionsToday(
  sessions: ReturnType<typeof useAuraEngines>["profile"]["sessionHistory"],
  subjectId: string,
  todayKey: string,
): number {
  return sessions.filter(
    (session) => session.subject === subjectId && session.date === todayKey,
  ).length;
}

export function ExamReadiness({ embedded = false }: { embedded?: boolean }) {
  const { profile, projection, momentum, analytics, isLoading } = useAuraEngines();
  const [tab, setTab] = useState<TabId>("ladder");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());

  const constellation = useMemo(
    () => buildConstellationView(profile, projection),
    [profile, projection],
  );

  const plannerSubjects = useMemo<PlannerSubjectSeed[]>(
    () =>
      SSLC_SUBJECTS.map((subject) => {
        const view = constellation.subjects[subject.id];
        return {
          id: subject.id,
          name: subject.name,
          color: SUBJECT_COLORS[subject.id as keyof typeof SUBJECT_COLORS] ?? view?.color ?? subject.color,
          target: view?.target ?? subject.target,
          predicted: view?.predicted ?? subject.predicted,
          mastery: view?.mastery ?? subject.mastery,
        };
      }),
    [constellation],
  );

  const rankSubjects = useMemo<PlannerEngineSubject[]>(
    () =>
      plannerSubjects.map((subject) => ({
        ...subject,
        emoji: SSLC_SUBJECTS.find((row) => row.id === subject.id)?.emoji,
      })),
    [plannerSubjects],
  );

  const chapterPool = useMemo(
    () => buildProfileChapterPool(profile, plannerSubjects),
    [profile, plannerSubjects],
  );

  const subjectsById = useMemo(
    () => buildWarRoomSubjects(constellation.subjects, chapterPool),
    [constellation.subjects, chapterPool],
  );

  const catalogMap = useMemo(() => buildChapterCatalogMap(), []);

  const [rankedTasks, setRankedTasks] = useState<RankedPlannerTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    void rankChaptersForToday(chapterPool, rankSubjects, 8).then((tasks) => {
      if (!cancelled) setRankedTasks(tasks);
    });
    return () => {
      cancelled = true;
    };
  }, [chapterPool, rankSubjects]);

  const rankedLadder = useMemo(
    () =>
      rankedTasks.map((task) => toLadderRow(task, subjectsById, catalogMap)),
    [rankedTasks, subjectsById, catalogMap],
  );

  const topFour = useMemo(() => rankedLadder.slice(0, 4), [rankedLadder]);

  const totalMarksAtRisk = useMemo(() => {
    const sum = chapterPool.reduce(
      (acc, chapter) =>
        acc +
        computeMarksAtRisk(
          chapter.blueprintMarks ?? 4,
          chapter.mastery ?? 50,
        ),
      0,
    );
    return Math.round(sum);
  }, [chapterPool]);

  const criticalCount = useMemo(
    () =>
      chapterPool.filter(
        (chapter) =>
          (chapter.mastery ?? 50) < 50 ||
          computeMarksAtRisk(chapter.blueprintMarks ?? 4, chapter.mastery ?? 50) >= 6,
      ).length,
    [chapterPool],
  );

  const recoveryMinutes = useMemo(
    () => topFour.reduce((acc, row) => acc + row.task.durationMin, 0),
    [topFour],
  );

  const subjectCount = Object.keys(subjectsById).length;
  const daysLeft = profile.student.daysToExam ?? 0;

  const probabilityRows: ProbabilityRow[] = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);

    return Object.values(subjectsById).map((subject) => {
      const sessionsToday = subjectSessionsToday(
        profile.sessionHistory,
        subject.id,
        todayKey,
      );
      const masteryGain = sessionsToday > 0 ? Math.min(8, sessionsToday * 2) : 0;
      const previousPredicted = Math.max(40, subject.predicted - masteryGain);
      const previousMastery = Math.max(40, subject.mastery - masteryGain);

      const currentProbability = computeProbabilitySnapshot(
        subject.target,
        subject.predicted,
        subject.mastery,
      );
      const previousProbability = computeProbabilitySnapshot(
        subject.target,
        previousPredicted,
        previousMastery,
      );
      const delta = currentProbability - previousProbability;
      const status = getMasteryStatus(subject.mastery);

      let reason = "No sessions completed today";
      if (masteryGain > 0) {
        reason = `Mastery improved ${masteryGain}% from completed sessions`;
      } else if (momentum?.trend === "improving") {
        reason = `Momentum improving (${Math.round(momentum.score)} score)`;
      } else if (analytics?.dimensions.recovery.trend === "improving") {
        reason = analytics.dimensions.recovery.description;
      }

      return {
        subject,
        previousProbability,
        currentProbability,
        delta,
        reason,
        statusLabel: status.label,
        statusColor: status.color,
      };
    });
  }, [subjectsById, profile.sessionHistory, momentum, analytics]);

  function markAdded(id: string) {
    setAddedIds((prev) => new Set(prev).add(id));
  }

  function handleAddToPlan(row: LadderRow) {
    const { task } = row;
    if (hasTaskWithTitle(task.task) || addedIds.has(task.chapter.id)) {
      toast("Already on today's plan");
      markAdded(task.chapter.id);
      return;
    }

    const ok = addRankedTaskToTodayPlan(task);
    if (ok) {
      markAdded(task.chapter.id);
      toast.success("Added to today's plan", {
        description: `${task.subject} · ${task.durationMin} min`,
      });
    }
  }

  function handleAddAll() {
    let added = 0;
    for (const row of topFour) {
      const { task } = row;
      if (hasTaskWithTitle(task.task) || addedIds.has(task.chapter.id)) {
        markAdded(task.chapter.id);
        continue;
      }
      if (addRankedTaskToTodayPlan(task)) {
        markAdded(task.chapter.id);
        added += 1;
      }
    }
    if (added > 0) {
      toast.success(`Added ${added} session${added === 1 ? "" : "s"} to today's plan`);
    } else {
      toast("Top sessions are already on today's plan");
    }
  }

  if (isLoading) {
    return (
      <div
        className={
          embedded
            ? "flex min-h-[240px] items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#08080E] text-sm text-[rgba(240,240,248,0.70)]"
            : "mx-auto flex min-h-[480px] w-full max-w-7xl items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#08080E] text-sm text-[rgba(240,240,248,0.70)]"
        }
        aria-busy="true"
      >
        Loading exam readiness…
      </div>
    );
  }

  if (!hasSubjectTargets(profile) && !hasStudyActivity(profile)) {
    return <ExamReadinessSetTargetsPrompt className={embedded ? undefined : "mx-auto w-full max-w-7xl"} />;
  }

  return (
    <div
      className={
        embedded
          ? "space-y-6 text-[#F0F0F8]"
          : "mx-auto w-full max-w-7xl space-y-6 bg-[#08080E] text-[#F0F0F8]"
      }
    >
      {!embedded ? (
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(240,240,248,0.70)]">
                Exam Readiness
              </span>
            </div>
            <h1
              className="text-3xl font-extrabold tracking-tight sm:text-4xl"
              style={{ fontFamily: "Syne, sans-serif", fontWeight: 800 }}
            >
              Targets, gaps & probability
            </h1>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#14141F] px-4 py-3 text-center">
            <div
              className="text-2xl font-semibold leading-none text-[#8B5CF6]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {daysLeft}
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[rgba(240,240,248,0.70)]">
              Days left
            </div>
          </div>
        </header>
      ) : (
        <header className="space-y-1">
          <h2
            className="text-xl font-bold tracking-tight text-[#F0F0F8]"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Exam Readiness
          </h2>
          <p className="text-sm text-[rgba(240,240,248,0.65)]">
            Targets, gaps, and probability movement across SSLC subjects
          </p>
        </header>
      )}

      {/* Hero card */}
      <section className="rounded-2xl border border-[rgba(248,113,113,0.15)] bg-[#14141F] p-5 sm:p-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(240,240,248,0.70)]">
          Total marks at risk
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <span
            className="text-[52px] font-bold leading-none text-[#F87171]"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {totalMarksAtRisk}
          </span>
          <span className="pb-2 text-sm text-[rgba(240,240,248,0.70)]">
            marks across / {subjectCount} subjects
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[rgba(248,113,113,0.1)] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(240,240,248,0.70)]">
              Critical chapters
            </div>
            <div
              className="mt-1 text-2xl font-bold text-[#F87171]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {criticalCount}
            </div>
          </div>
          <div className="rounded-xl bg-[rgba(251,191,36,0.1)] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(240,240,248,0.70)]">
              4 sessions recovers
            </div>
            <div
              className="mt-1 text-2xl font-bold text-[#FBBF24]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              ~{recoveryMinutes}m
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex">
          <button
            type="button"
            onClick={() => setTab("ladder")}
            className={cn(
              "flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition",
              tab === "ladder"
                ? "border-[#8B5CF6] text-[#F0F0F8]"
                : "border-transparent text-[rgba(240,240,248,0.70)] hover:text-[#F0F0F8]",
            )}
          >
            Chapter Recovery Ladder
          </button>
          <button
            type="button"
            onClick={() => setTab("probability")}
            className={cn(
              "flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition",
              tab === "probability"
                ? "border-[#8B5CF6] text-[#F0F0F8]"
                : "border-transparent text-[rgba(240,240,248,0.70)] hover:text-[#F0F0F8]",
            )}
          >
            Probability Movement
          </button>
        </div>
      </div>

      {tab === "ladder" ? (
        <section className="space-y-3">
          <button
            type="button"
            onClick={handleAddAll}
            className="w-full rounded-xl border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.12)] px-4 py-3 text-left text-sm font-semibold text-[#C084FC] transition hover:bg-[rgba(139,92,246,0.2)]"
          >
            Add top 4 sessions to today&apos;s plan →
          </button>

          <ul className="space-y-2">
            {rankedLadder.map((row, index) => {
              const { task } = row;
              const urgency = urgencyStyle(row.marksAtRisk);
              const isExpanded = expandedId === task.chapter.id;
              const isAdded =
                addedIds.has(task.chapter.id) || hasTaskWithTitle(task.task);
              const subjectColor =
                SUBJECT_COLORS[task.subjectId as keyof typeof SUBJECT_COLORS] ??
                subjectsById[task.subjectId]?.color ??
                task.subjectColor;

              return (
                <li
                  key={task.chapter.id}
                  className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#08080E]"
                  style={{ borderLeft: `3px solid ${subjectColor}` }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : task.chapter.id)
                    }
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="text-[11px] text-[rgba(240,240,248,0.45)]"
                            style={{ fontFamily: "JetBrains Mono, monospace" }}
                          >
                            #{index + 1}
                          </span>
                          <span className="truncate text-sm font-bold">
                            {task.title}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[rgba(240,240,248,0.70)]">
                          {task.subject} · {row.chapterRef}
                        </div>
                        <div
                          className="mt-1.5 text-[11px] font-medium"
                          style={{ color: subjectColor }}
                        >
                          +{row.probabilityBump}% {task.subject} if completed today
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                        style={{ color: urgency.color, backgroundColor: urgency.bg }}
                      >
                        {row.marksAtRisk.toFixed(1)}m at risk
                      </span>
                    </div>

                    {isExpanded && (
                      <div
                        className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                        style={{
                          color: subjectColor,
                          backgroundColor: hexWithAlpha(subjectColor, 0.1),
                        }}
                      >
                        {task.whyText}
                      </div>
                    )}
                  </button>

                  <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-2">
                    <button
                      type="button"
                      onClick={() => handleAddToPlan(row)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition",
                        isAdded
                          ? "bg-[rgba(74,222,128,0.12)] text-[#4ADE80]"
                          : "bg-[#0F0F18] text-[rgba(240,240,248,0.75)] hover:bg-[rgba(255,255,255,0.04)]",
                      )}
                    >
                      {isAdded ? "✓ Added" : "Add to today's plan →"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="space-y-2">
          {probabilityRows.map((row) => (
            <div
              key={row.subject.id}
              className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#14141F] p-4"
              style={{ borderLeft: `3px solid ${row.subject.color}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: row.subject.colorDim, color: row.subject.color }}
                  >
                    {row.subject.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold">{row.subject.name}</div>
                    <div
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: row.statusColor }}
                    >
                      {row.statusLabel}
                    </div>
                  </div>
                </div>
                <div
                  className="shrink-0 text-right text-sm"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  <span className="text-[rgba(240,240,248,0.45)]">
                    {row.previousProbability}%
                  </span>
                  <span className="mx-1.5 text-[rgba(240,240,248,0.45)]">→</span>
                  <span style={{ color: row.subject.color }}>{row.currentProbability}%</span>
                  {row.delta > 0 && (
                    <span className="ml-2" style={{ color: STATUS_COLORS.stable }}>
                      +{row.delta}%
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#0F0F18]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${row.currentProbability}%`,
                    backgroundColor: row.subject.color,
                  }}
                />
              </div>

              <p className="mt-2 text-[11px] text-[rgba(240,240,248,0.70)]">{row.reason}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
