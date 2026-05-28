import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MATHEMATICS_CHAPTERS,
  SCIENCE_CHAPTERS,
  SOCIAL_SCIENCE_CHAPTERS,
  type CatalogChapter,
} from "@/data/sslc-academic-catalog";
import { subjects as catalogSubjects, getDaysToExam } from "@/lib/mock-data";
import { getSubjectStatus, SAMPLE_CHAPTERS, SAMPLE_SUBJECTS } from "@/lib/taskPriorityEngine";
import type { PlannerEngineChapter, PlannerEngineSubject } from "@/lib/taskPriorityEngine";
import { addToTodayPlan, hasTaskWithTitle } from "@/lib/today-plan-store";
import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";

/** War Room subject accent colours (spec). */
const SUBJECT_HEX: Record<string, string> = {
  math: "#FBBF24",
  science: "#38BDF8",
  social: "#4ADE80",
  english: "#C084FC",
  kannada: "#FB923C",
  hindi: "#F472B6",
};

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

type WarRoomChapter = {
  id: string;
  subjectId: string;
  name: string;
  chapterRef: string;
  blueprintMarks: number;
  mastery: number;
  level: "Easy" | "Medium" | "Hard";
  duration: number;
  marksAtRisk: number;
  whyText: string;
  subjectColor: string;
  subjectName: string;
  probabilityBump: number;
  task: string;
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

function probabilityFor(target: number, predicted: number, mastery: number): number {
  const gap = target - predicted;
  const k = 0.18;
  const shift = 2;
  const base = 1 / (1 + Math.exp(k * (gap - shift)));
  const adj = base * 100 + (mastery - 70) * 0.15;
  return Math.round(Math.max(5, Math.min(98, adj)));
}

function computeMarksAtRisk(blueprintMarks: number, mastery: number): number {
  return blueprintMarks * (1 - mastery / 100);
}

function estimateMinutes(level: WarRoomChapter["level"], mastery: number): number {
  const base = level === "Hard" ? 45 : level === "Easy" ? 25 : 35;
  if (mastery < 50) return base + 10;
  if (mastery > 80) return Math.max(20, base - 10);
  return base;
}

function taskLabel(name: string, mastery: number): string {
  if (mastery < 50) return `Recover — ${name}`;
  if (mastery < 70) return `Practice — ${name}`;
  if (mastery < 85) return `Revise — ${name}`;
  return `Quick review — ${name}`;
}

function buildWhyText(
  chapter: Pick<WarRoomChapter, "name" | "blueprintMarks" | "mastery">,
  subject: WarRoomSubject | undefined,
  score: number,
): string {
  const marks = chapter.blueprintMarks;
  const gap = subject ? Math.max(0, subject.target - subject.predicted) : 0;
  const mastery = chapter.mastery;
  if (mastery < 55) {
    return `${marks} blueprint marks at risk · mastery ${mastery}% · highest ROI today (score ${score.toFixed(1)})`;
  }
  if (gap > 8) {
    return `Closes ${subject?.name ?? "subject"} target gap (+${gap} pts) · ${marks} marks weighted`;
  }
  return `${marks} marks on paper · ${mastery}% mastery · priority ${score.toFixed(1)}`;
}

function urgencyStyle(marksAtRisk: number): { color: string; bg: string } {
  if (marksAtRisk > 6) return { color: "#F87171", bg: "rgba(248,113,113,0.15)" };
  if (marksAtRisk >= 4) return { color: "#FBBF24", bg: "rgba(251,191,36,0.15)" };
  if (marksAtRisk >= 2) return { color: "#38BDF8", bg: "rgba(56,189,248,0.15)" };
  return { color: "#4ADE80", bg: "rgba(74,222,128,0.15)" };
}

function catalogToEngineChapters(): PlannerEngineChapter[] {
  const attach = (subjectId: string, chapters: CatalogChapter[]): PlannerEngineChapter[] =>
    chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      subjectId,
      mastery: ch.mastery,
      blueprintMarks: ch.blueprintMarks ?? 4,
      difficulty: ch.difficulty,
    }));

  const pool = [
    ...attach("math", MATHEMATICS_CHAPTERS),
    ...attach("science", SCIENCE_CHAPTERS),
    ...attach("social", SOCIAL_SCIENCE_CHAPTERS),
  ];

  return pool.length > 0 ? pool : SAMPLE_CHAPTERS;
}

function catalogChapterRef(ch: CatalogChapter, subjectId: string): string {
  if (ch.section) return `${ch.section} · Ch ${ch.chapterNumber}`;
  const prefix =
    subjectId === "math" ? "Math" : subjectId === "science" ? "Sci" : "SSc";
  return `${prefix} · Ch ${ch.chapterNumber}`;
}

function buildChapterCatalogMap(): Map<string, CatalogChapter & { subjectId: string }> {
  const map = new Map<string, CatalogChapter & { subjectId: string }>();
  for (const ch of MATHEMATICS_CHAPTERS) map.set(ch.id, { ...ch, subjectId: "math" });
  for (const ch of SCIENCE_CHAPTERS) map.set(ch.id, { ...ch, subjectId: "science" });
  for (const ch of SOCIAL_SCIENCE_CHAPTERS) map.set(ch.id, { ...ch, subjectId: "social" });
  return map;
}

function buildWarRoomSubjects(
  engineSubjects: PlannerEngineSubject[],
): Record<string, WarRoomSubject> {
  const chapterPool = catalogToEngineChapters();
  const totalBySubject: Record<string, number> = {};
  for (const ch of chapterPool) {
    totalBySubject[ch.subjectId] =
      (totalBySubject[ch.subjectId] ?? 0) + (ch.blueprintMarks ?? 4);
  }

  const list = engineSubjects.length > 0 ? engineSubjects : SAMPLE_SUBJECTS;
  const out: Record<string, WarRoomSubject> = {};
  for (const s of list) {
    const hex = SUBJECT_HEX[s.id] ?? s.color ?? "#8B5CF6";
    const match = catalogSubjects.find((c) => c.id === s.id);
    out[s.id] = {
      id: s.id,
      name: s.name,
      color: hex,
      colorDim: hexWithAlpha(hex, 0.12),
      mastery: s.mastery ?? match?.mastery ?? 70,
      predicted: s.predicted,
      target: s.target,
      totalMarks: totalBySubject[s.id] ?? 80,
      emoji: s.emoji ?? match?.emoji ?? "📘",
    };
  }
  return out;
}

function enrichChapters(
  rawChapters: PlannerEngineChapter[],
  subjectsById: Record<string, WarRoomSubject>,
): WarRoomChapter[] {
  const catalogMap = buildChapterCatalogMap();

  return rawChapters.map((ch) => {
    const subject = subjectsById[ch.subjectId];
    const catalog = catalogMap.get(ch.id);
    const blueprintMarks = ch.blueprintMarks ?? 4;
    const mastery = ch.mastery ?? 50;
    const marksAtRisk = computeMarksAtRisk(blueprintMarks, mastery);
    const level = ch.difficulty ?? catalog?.difficulty ?? "Medium";
    const gap = subject ? Math.max(0, subject.target - subject.predicted) : 0;
    const probImpact = 1 + gap / 25;
    const weight = Math.max(1, blueprintMarks) / 4;
    const load = level === "Hard" ? 2.2 : level === "Easy" ? 1 : 1.5;
    const priorityScore = (marksAtRisk * probImpact * weight) / load;
    const subjectColor = SUBJECT_HEX[ch.subjectId] ?? subject?.color ?? "#8B5CF6";
    const totalMarks = subject?.totalMarks ?? 80;
    const probabilityBump = Math.min(
      12,
      Math.round((marksAtRisk / totalMarks) * 100 * 0.65),
    );

    return {
      id: ch.id,
      subjectId: ch.subjectId,
      name: ch.title,
      chapterRef: catalog
        ? catalogChapterRef(catalog, ch.subjectId)
        : `${subject?.name ?? ch.subjectId} · ${ch.id}`,
      blueprintMarks,
      mastery,
      level,
      duration: estimateMinutes(level, mastery),
      marksAtRisk,
      whyText: buildWhyText(
        { name: ch.title, blueprintMarks, mastery },
        subject,
        priorityScore,
      ),
      subjectColor,
      subjectName: subject?.name ?? ch.subjectId,
      probabilityBump,
      task: taskLabel(ch.title, mastery),
    };
  });
}

export function AuraWarRoom() {
  const { bySubject } = useAnalytics();
  const [tab, setTab] = useState<TabId>("ladder");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());

  // Real catalog-backed data (same pattern as Study Planner). TODO: wire Firebase fetchChapters when unified.
  const engineSubjects: PlannerEngineSubject[] = useMemo(
    () =>
      catalogSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        color: SUBJECT_HEX[s.id] ?? s.color,
        target: s.target,
        predicted: s.predicted,
        mastery: s.mastery,
        emoji: s.emoji,
      })),
    [],
  );

  const rawChapters = useMemo(() => catalogToEngineChapters(), []);
  const subjectsById = useMemo(
    () => buildWarRoomSubjects(engineSubjects),
    [engineSubjects],
  );

  const enriched = useMemo(
    () => enrichChapters(rawChapters, subjectsById),
    [rawChapters, subjectsById],
  );

  const rankedLadder = useMemo(
    () =>
      [...enriched]
        .sort((a, b) => b.marksAtRisk - a.marksAtRisk)
        .slice(0, 8),
    [enriched],
  );

  const topFour = useMemo(
    () =>
      [...enriched]
        .sort((a, b) => b.marksAtRisk - a.marksAtRisk)
        .slice(0, 4),
    [enriched],
  );

  const totalMarksAtRisk = useMemo(() => {
    const sum = enriched.reduce((acc, ch) => acc + ch.marksAtRisk, 0);
    return sum > 0 ? Math.round(sum) : 47;
  }, [enriched]);

  const criticalCount = useMemo(
    () => enriched.filter((ch) => ch.mastery < 50 || ch.marksAtRisk >= 6).length,
    [enriched],
  );

  const recoveryMinutes = useMemo(
    () => topFour.reduce((acc, ch) => acc + ch.duration, 0),
    [topFour],
  );

  const subjectCount = Object.keys(subjectsById).length || 6;
  const daysLeft = getDaysToExam();

  const probabilityRows: ProbabilityRow[] = useMemo(() => {
    return Object.values(subjectsById).map((subject) => {
      const analyticsRow = bySubject.find((b) => b.id === subject.id);
      const sessionCount = analyticsRow?.sessions ?? 0;
      const masteryGain = sessionCount > 0 ? Math.min(8, sessionCount * 2) : 0;
      const previousPredicted = Math.max(40, subject.predicted - masteryGain);
      const previousMastery = Math.max(40, subject.mastery - masteryGain);
      const currentProbability = probabilityFor(
        subject.target,
        subject.predicted,
        subject.mastery,
      );
      const previousProbability = probabilityFor(
        subject.target,
        previousPredicted,
        previousMastery,
      );
      const delta = currentProbability - previousProbability;
      const status = getSubjectStatus(subject.predicted, subject.target);
      const reason =
        masteryGain > 0
          ? `Mastery improved ${masteryGain}% from completed sessions`
          : "No sessions completed";

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
  }, [subjectsById, bySubject]);

  function markAdded(id: string) {
    setAddedIds((prev) => new Set(prev).add(id));
  }

  function handleAddToPlan(chapter: WarRoomChapter) {
    if (hasTaskWithTitle(chapter.task) || addedIds.has(chapter.id)) {
      toast("Already on today's plan");
      markAdded(chapter.id);
      return;
    }
    const ok = addToTodayPlan({
      subject: chapter.subjectName,
      task: chapter.task,
      durationMin: chapter.duration,
    });
    if (ok) {
      markAdded(chapter.id);
      toast.success("Added to today's plan", {
        description: `${chapter.subjectName} · ${chapter.duration} min`,
      });
    }
  }

  function handleAddAll() {
    let added = 0;
    for (const ch of topFour) {
      if (hasTaskWithTitle(ch.task) || addedIds.has(ch.id)) {
        markAdded(ch.id);
        continue;
      }
      const ok = addToTodayPlan({
        subject: ch.subjectName,
        task: ch.task,
        durationMin: ch.duration,
      });
      if (ok) {
        markAdded(ch.id);
        added += 1;
      }
    }
    if (added > 0) {
      toast.success(`Added ${added} session${added === 1 ? "" : "s"} to today's plan`);
    } else {
      toast("Top sessions are already on today's plan");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 bg-[#08080E] text-[#F0F0F8]">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(240,240,248,0.55)]">
              AI Prediction
            </span>
            <span className="rounded-full border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.12)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F87171]">
              War Room
            </span>
          </div>
          <h1
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ fontFamily: "Syne, sans-serif", fontWeight: 800 }}
          >
            Exam Intelligence
          </h1>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#14141F] px-4 py-3 text-center">
          <div
            className="text-2xl font-semibold leading-none text-[#8B5CF6]"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {daysLeft}
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[rgba(240,240,248,0.55)]">
            Days left
          </div>
        </div>
      </header>

      {/* Hero card */}
      <section className="rounded-2xl border border-[rgba(248,113,113,0.15)] bg-[#14141F] p-5 sm:p-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(240,240,248,0.55)]">
          Total marks at risk
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <span
            className="text-[52px] font-bold leading-none text-[#F87171]"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {totalMarksAtRisk}
          </span>
          <span className="pb-2 text-sm text-[rgba(240,240,248,0.55)]">
            marks across / {subjectCount} subjects
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[rgba(248,113,113,0.1)] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(240,240,248,0.55)]">
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
            <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(240,240,248,0.55)]">
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
                : "border-transparent text-[rgba(240,240,248,0.55)] hover:text-[#F0F0F8]",
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
                : "border-transparent text-[rgba(240,240,248,0.55)] hover:text-[#F0F0F8]",
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
            {rankedLadder.map((ch, index) => {
              const urgency = urgencyStyle(ch.marksAtRisk);
              const isExpanded = expandedId === ch.id;
              const isAdded = addedIds.has(ch.id) || hasTaskWithTitle(ch.task);

              return (
                <li
                  key={ch.id}
                  className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#08080E]"
                  style={{ borderLeft: `3px solid ${ch.subjectColor}` }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : ch.id)}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="text-[11px] text-[rgba(240,240,248,0.35)]"
                            style={{ fontFamily: "JetBrains Mono, monospace" }}
                          >
                            #{index + 1}
                          </span>
                          <span className="truncate text-sm font-bold">{ch.name}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[rgba(240,240,248,0.55)]">
                          {ch.subjectName} · {ch.chapterRef}
                        </div>
                        <div
                          className="mt-1.5 text-[11px] font-medium"
                          style={{ color: ch.subjectColor }}
                        >
                          +{ch.probabilityBump}% {ch.subjectName} if completed today
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                        style={{ color: urgency.color, backgroundColor: urgency.bg }}
                      >
                        {ch.marksAtRisk.toFixed(1)}m at risk
                      </span>
                    </div>

                    {isExpanded && (
                      <div
                        className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                        style={{
                          color: ch.subjectColor,
                          backgroundColor: hexWithAlpha(ch.subjectColor, 0.1),
                        }}
                      >
                        {ch.whyText}
                      </div>
                    )}
                  </button>

                  <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-2">
                    <button
                      type="button"
                      onClick={() => handleAddToPlan(ch)}
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
                  <span className="text-[rgba(240,240,248,0.35)]">
                    {row.previousProbability}%
                  </span>
                  <span className="mx-1.5 text-[rgba(240,240,248,0.35)]">→</span>
                  <span style={{ color: row.subject.color }}>{row.currentProbability}%</span>
                  {row.delta > 0 && (
                    <span className="ml-2 text-[#4ADE80]">+{row.delta}%</span>
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

              <p className="mt-2 text-[11px] text-[rgba(240,240,248,0.55)]">{row.reason}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
