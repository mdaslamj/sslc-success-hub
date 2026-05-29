import type {
  AuraEngineOutputs,
  StudentLearningProfile,
  Subject,
  Trend,
} from "@/types/aura-engine-contracts";
import type { ParentSummary, SubjectParentSummary } from "@/types/parentView";

const SUBJECT_COLORS: Record<string, string> = {
  science: "#38BDF8",
  math: "#FBBF24",
  social: "#4ADE80",
  english: "#C084FC",
  kannada: "#FB923C",
  hindi: "#F472B6",
};

const SUBJECT_NAMES: Record<string, string> = {
  science: "Science",
  math: "Mathematics",
  social: "Social Science",
  english: "English",
  kannada: "Kannada",
  hindi: "Hindi",
};

function toParentStatus(predicted: number): {
  status: SubjectParentSummary["status"];
  label: string;
} {
  if (predicted >= 75) return { status: "strong", label: "Doing well" };
  if (predicted >= 55) return { status: "improving", label: "Making progress" };
  return { status: "needs-work", label: "Needs more practice" };
}

function mapTrend(trend: Trend | undefined): SubjectParentSummary["trend"] {
  if (trend === "improving") return "up";
  if (trend === "declining") return "down";
  return "stable";
}

function formatChapterLabel(chapterId: string, profile: StudentLearningProfile): string {
  for (const subject of Object.keys(profile.blueprint ?? {}) as Subject[]) {
    const entry = profile.blueprint[subject]?.[chapterId];
    if (entry?.name) return entry.name;
  }
  return chapterId.replace(/-/g, " ");
}

function subjectTrend(
  profile: StudentLearningProfile,
  subjectId: Subject,
): SubjectParentSummary["trend"] {
  const chapters = profile.chapterMastery?.[subjectId];
  if (!chapters) return "stable";
  const trends = Object.values(chapters).map((c) => c.trend);
  const improving = trends.filter((t) => t === "improving").length;
  const declining = trends.filter((t) => t === "declining").length;
  if (improving > declining) return "up";
  if (declining > improving) return "down";
  return "stable";
}

function deriveSubjectReadiness(
  profile: StudentLearningProfile,
  engines: Partial<AuraEngineOutputs> | null,
): Record<string, { predicted: number; trend: SubjectParentSummary["trend"] }> {
  const fromProjection = engines?.projection?.bySubject;
  if (fromProjection) {
    return Object.fromEntries(
      (Object.entries(fromProjection) as [Subject, { percentage: number }][]).map(
        ([id, data]) => [id, { predicted: data.percentage, trend: subjectTrend(profile, id) }],
      ),
    );
  }

  const fallback: Record<string, { predicted: number; trend: SubjectParentSummary["trend"] }> =
    {};
  for (const subjectId of Object.keys(profile.chapterMastery ?? {}) as Subject[]) {
    const chapters = Object.values(profile.chapterMastery[subjectId] ?? {});
    if (chapters.length === 0) continue;
    const avg = chapters.reduce((sum, c) => sum + c.mastery, 0) / chapters.length;
    fallback[subjectId] = { predicted: avg, trend: subjectTrend(profile, subjectId) };
  }
  return fallback;
}

export function buildParentSummary(
  profile: StudentLearningProfile,
  engines: Partial<AuraEngineOutputs> | null,
): ParentSummary {
  const subjects = deriveSubjectReadiness(profile, engines);

  const subjectSummaries: SubjectParentSummary[] = Object.entries(subjects).map(
    ([id, data]) => {
      const { status, label } = toParentStatus(data.predicted);
      return {
        subjectId: id,
        subjectName: SUBJECT_NAMES[id] ?? id,
        color: SUBJECT_COLORS[id] ?? "#8B5CF6",
        status,
        statusLabel: label,
        trend: data.trend,
      };
    },
  );

  const avgPredicted =
    subjectSummaries.length > 0
      ? Object.values(subjects).reduce((sum, d) => sum + d.predicted, 0) /
        subjectSummaries.length
      : 50;

  const overallReadiness: ParentSummary["overallReadiness"] =
    avgPredicted >= 70 ? "on-track" : avgPredicted >= 45 ? "needs-attention" : "at-risk";

  const recentSessions = profile.sessionHistory?.slice(-7) ?? [];
  const studyMinutes = recentSessions.reduce(
    (sum, session) => sum + (session.durationMinutes ?? 0),
    0,
  );

  const flatChapters: Array<{ id: string; mastery: number; label: string }> = [];
  for (const subjectId of Object.keys(profile.chapterMastery ?? {}) as Subject[]) {
    for (const [chapterId, entry] of Object.entries(profile.chapterMastery[subjectId] ?? {})) {
      flatChapters.push({
        id: chapterId,
        mastery: entry.mastery,
        label: formatChapterLabel(chapterId, profile),
      });
    }
  }

  const strongChapters = flatChapters.filter((c) => c.mastery >= 75);
  const weakChapters = flatChapters.filter((c) => c.mastery < 50);

  const recentWin =
    strongChapters.length > 0
      ? `Mastered ${strongChapters[strongChapters.length - 1].label}`
      : "Building strong foundations";

  const focusArea =
    weakChapters.length > 0
      ? `Working on ${weakChapters[0].label}`
      : "Reviewing all chapters";

  const studentName = profile.student?.name ?? "Your child";
  const messages: Record<ParentSummary["overallReadiness"], string> = {
    "on-track": `${studentName} is studying consistently and making solid progress toward the board exam.`,
    "needs-attention": `${studentName} is working hard. A little extra study time this week would make a real difference.`,
    "at-risk": `${studentName} needs more consistent study sessions. Encouraging a daily 1-hour study routine would help significantly.`,
  };

  const examDate =
    profile.student?.daysToExam != null
      ? new Date(Date.now() + profile.student.daysToExam * 86_400_000).toISOString().slice(0, 10)
      : "2026-03-15";

  const daysUntilExam = Math.max(
    0,
    Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000),
  );

  return {
    studentName,
    examDate,
    daysUntilExam,
    overallReadiness,
    weeklyActivity: {
      sessionsCompleted: recentSessions.length,
      studyMinutes,
      streakDays: engines?.momentum?.streak ?? 0,
    },
    subjectSummaries,
    recentWin,
    focusArea,
    parentMessage: messages[overallReadiness],
    lastUpdated: new Date().toISOString(),
  };
}

/** Fallback when a linked student profile is not readable — still parent-friendly. */
export function buildDemoParentSummary(studentName: string): ParentSummary {
  const profile = {
    student: { name: studentName, daysToExam: 120 },
    chapterMastery: {},
    sessionHistory: [],
    blueprint: {},
  } as unknown as StudentLearningProfile;

  return {
    ...buildParentSummary(profile, {
      projection: {
        bySubject: {
          science: { predicted: 58, max: 80, percentage: 62 },
          math: { predicted: 52, max: 80, percentage: 55 },
          social: { predicted: 60, max: 80, percentage: 68 },
        },
        total: 170,
        totalMax: 240,
        percentage: 62,
        grade: "B",
        computedAt: new Date().toISOString(),
      },
      momentum: { streak: 5 } as AuraEngineOutputs["momentum"],
    }),
    studentName,
  };
}
