import type {
  ArchetypeOutput,
  MomentumOutput,
  NextActionOutput,
  RecoveryEngineOutput,
  RecoveryItem,
  ROIChapter,
  SessionRecord,
  SessionType,
  TargetGapOutput,
  Trend,
  UrgencyLevel,
} from "@/types/aura-engine-contracts";

type ActionSource = "recovery-critical" | "streak-rescue" | "target-gap" | "topper-precision";

type ActionCandidate = {
  source: ActionSource;
  subject: RecoveryItem["subject"] | ROIChapter["subject"];
  chapter: string;
  name: string;
  sessionType: SessionType;
  urgency: UrgencyLevel;
  gainMarks: number;
  timeMinutes: number;
  rationale: string;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatGain(marks: number): string {
  return `+${round1(marks)} marks`;
}

function chapterKey(subject: string, chapter: string): string {
  return `${subject}:${chapter}`;
}

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function addDaysIso(baseDate: string, days: number): string {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isStreakAtRisk(sessions: SessionRecord[]): boolean {
  if (sessions.length === 0) return false;

  const sortedDates = [...new Set(sessions.map((session) => session.date))].sort(
    (a, b) => parseDate(a) - parseDate(b),
  );
  const latestDate = sortedDates.at(-1)!;
  const yesterday = addDaysIso(latestDate, -1);
  const yesterdaySessions = sessions.filter((session) => session.date === yesterday);

  if (yesterdaySessions.length === 0) return false;
  return yesterdaySessions.every((session) => session.durationMinutes === 0);
}

function recoveryItemToCandidate(item: RecoveryItem): ActionCandidate {
  const sessionType = item.actionPlan[0]?.type ?? "recovery";

  return {
    source: "recovery-critical",
    subject: item.subject,
    chapter: item.chapter,
    name: item.name ?? item.chapter,
    sessionType,
    urgency: item.urgency,
    gainMarks: item.recoverableMarks,
    timeMinutes: item.sessionsNeeded * 20,
    rationale: `${item.name} is critical at ${item.currentMastery}% mastery with ${item.blueprintMarks} blueprint marks, so a focused recovery session protects the most marks at risk right now.`,
  };
}

function roiChapterToCandidate(
  chapter: ROIChapter,
  source: ActionSource,
  sessionType: SessionType,
  rationale: string,
): ActionCandidate {
  return {
    source,
    subject: chapter.subject,
    chapter: chapter.chapter,
    name: chapter.name,
    sessionType,
    urgency:
      chapter.currentMastery < 50
        ? "critical"
        : chapter.currentMastery < 62
          ? "high"
          : chapter.currentMastery < 72
            ? "medium"
            : "low",
    gainMarks: chapter.gainPossible,
    timeMinutes: Math.round(chapter.hoursEstimate * 60),
    rationale,
  };
}

function selectCandidate(
  recovery: RecoveryEngineOutput,
  target: TargetGapOutput,
  sessions: SessionRecord[],
  skip: Set<string>,
): ActionCandidate | null {
  const skipKey = (subject: string, chapter: string) => skip.has(chapterKey(subject, chapter));

  const criticalRecovery = recovery.items
    .filter(
      (item) =>
        item.urgency === "critical" &&
        item.blueprintMarks >= 6 &&
        !skipKey(item.subject, item.chapter),
    )
    .sort((a, b) => b.marksAtRisk - a.marksAtRisk);

  if (criticalRecovery.length > 0) {
    return recoveryItemToCandidate(criticalRecovery[0]!);
  }

  if (isStreakAtRisk(sessions)) {
    const streakRescue = target.rankedChapters
      .filter(
        (chapter) =>
          chapter.currentMastery > 60 && !skipKey(chapter.subject, chapter.chapter),
      )
      .sort((a, b) => b.roi - a.roi || a.hoursEstimate - b.hoursEstimate)[0];

    if (streakRescue) {
      return roiChapterToCandidate(
        streakRescue,
        "streak-rescue",
        "adaptive",
        `Your streak is at risk after a zero-minute day, so a high-ROI ${streakRescue.name} session keeps momentum without overloading you.`,
      );
    }
  }

  if (target.gapPercentage > 10) {
    const targetChapter = target.rankedChapters.find(
      (chapter) => !skipKey(chapter.subject, chapter.chapter),
    );

    if (targetChapter) {
      return roiChapterToCandidate(
        targetChapter,
        "target-gap",
        "adaptive",
        `${targetChapter.name} offers the best marks-per-hour return while closing your ${round1(target.gapPercentage)} point target gap.`,
      );
    }
  }

  const topperCandidates = target.rankedChapters
    .filter((chapter) => !skipKey(chapter.subject, chapter.chapter))
    .sort((a, b) => {
      const distanceDiff =
        Math.abs(a.currentMastery - 85) - Math.abs(b.currentMastery - 85);
      if (distanceDiff !== 0) return distanceDiff;
      return b.blueprintMarks - a.blueprintMarks;
    });

  const topperChapter = topperCandidates[0];
  if (!topperChapter) return null;

  return roiChapterToCandidate(
    topperChapter,
    "topper-precision",
    "formula_drill",
    `${topperChapter.name} is closest to 85% mastery with strong blueprint weight, making it the best precision drill for topper mode.`,
  );
}

function selectFollowUpCandidate(
  recovery: RecoveryEngineOutput,
  target: TargetGapOutput,
  sessions: SessionRecord[],
  primary: ActionCandidate,
): ActionCandidate | null {
  const skip = new Set([chapterKey(primary.subject, primary.chapter)]);
  const nextFromRules = selectCandidate(recovery, target, sessions, skip);

  if (primary.source === "recovery-critical") {
    const nextRecovery = recovery.items.find(
      (item) =>
        item.blueprintMarks >= 6 &&
        !skip.has(chapterKey(item.subject, item.chapter)),
    );

    if (nextRecovery) {
      const sessionType = nextRecovery.actionPlan[0]?.type ?? "recovery";
      return {
        source: "recovery-critical",
        subject: nextRecovery.subject,
        chapter: nextRecovery.chapter,
        name: nextRecovery.name ?? nextRecovery.chapter,
        sessionType,
        urgency: nextRecovery.urgency,
        gainMarks: nextRecovery.recoverableMarks,
        timeMinutes: nextRecovery.sessionsNeeded * 20,
        rationale: `${nextRecovery.name} is the next highest-impact recovery chapter after ${primary.name}, with ${nextRecovery.blueprintMarks} marks still exposed.`,
      };
    }
  }

  return nextFromRules;
}

function computeConfidence(
  momentum: MomentumOutput,
  archetype: ArchetypeOutput,
  trend: Trend,
): number {
  let confidence = 0.65;

  if (trend === "improving") confidence += 0.1;
  if (momentum.streak > 3) confidence += 0.1;
  if (archetype.signals.panicIndex > 40) confidence -= 0.1;

  return round1(Math.max(0.35, Math.min(0.95, confidence)));
}

function recommendedActionLabel(candidate: ActionCandidate): string {
  if (candidate.source === "recovery-critical") {
    return `Practice ${candidate.name} — recovery session`;
  }
  if (candidate.source === "streak-rescue") {
    return `Quick win: ${candidate.name}`;
  }
  if (candidate.source === "topper-precision") {
    return `Precision drill: ${candidate.name}`;
  }
  return `Target session: ${candidate.name}`;
}

function resolveTrend(
  candidate: ActionCandidate,
  momentum: MomentumOutput,
  archetype: ArchetypeOutput,
): Trend {
  if (candidate.source === "recovery-critical" || candidate.source === "streak-rescue") {
    return momentum.trend;
  }
  return archetype.signals.accuracyTrend;
}

function toActionOutput(
  candidate: ActionCandidate,
  momentum: MomentumOutput,
  archetype: ArchetypeOutput,
): Omit<NextActionOutput, "followUp"> {
  const trend = resolveTrend(candidate, momentum, archetype);

  return {
    recommendedAction: recommendedActionLabel(candidate),
    subject: candidate.subject,
    chapter: candidate.chapter,
    sessionType: candidate.sessionType,
    estimatedGain: formatGain(candidate.gainMarks),
    timeRequired: candidate.timeMinutes,
    urgency: candidate.urgency,
    confidence: computeConfidence(momentum, archetype, trend),
    rationale: candidate.rationale,
    computedAt: new Date().toISOString(),
  };
}

export function nextActionEngine(
  recovery: RecoveryEngineOutput,
  target: TargetGapOutput,
  momentum: MomentumOutput,
  archetype: ArchetypeOutput,
  sessions: SessionRecord[],
): NextActionOutput {
  const primary = selectCandidate(recovery, target, sessions, new Set());
  if (!primary) {
    throw new Error("NextActionEngine could not determine a recommended action.");
  }

  const primaryOutput = toActionOutput(primary, momentum, archetype);
  const followUpCandidate = selectFollowUpCandidate(recovery, target, sessions, primary);
  const followUp = followUpCandidate
    ? toActionOutput(followUpCandidate, momentum, archetype)
    : null;

  return {
    ...primaryOutput,
    followUp,
  };
}
