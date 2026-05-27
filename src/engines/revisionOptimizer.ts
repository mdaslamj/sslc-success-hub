import type {
  BlueprintEntry,
  RevisionItem,
  RevisionOutput,
  SessionRecord,
  StudentLearningProfile,
  Subject,
} from "@/types/aura-engine-contracts";

const SUBJECTS: Subject[] = ["math", "science", "social"];
const PRIORITY_ORDER: Record<RevisionItem["priority"], number> = {
  urgent: 0,
  scheduled: 1,
  comfortable: 2,
};

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function addDaysIso(baseDate: string, days: number): string {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.max(0, Math.round((parseDate(toDate) - parseDate(fromDate)) / (1000 * 60 * 60 * 24)));
}

function referenceDate(sessions: SessionRecord[]): string {
  const latest = sessions
    .map((session) => session.date)
    .sort((a, b) => parseDate(b) - parseDate(a))[0];
  return latest ?? new Date().toISOString().slice(0, 10);
}

function intervalDaysForMastery(mastery: number): number {
  if (mastery < 50) return 1;
  if (mastery < 70) return 3;
  if (mastery < 85) return 7;
  return 14;
}

function priorityFor(
  mastery: number,
  daysSincePractice: number,
  intervalDays: number,
): RevisionItem["priority"] {
  if (mastery >= 85 && daysSincePractice <= intervalDays) {
    return "comfortable";
  }
  if (daysSincePractice > intervalDays) {
    return "urgent";
  }
  return "scheduled";
}

function reasonFor(priority: RevisionItem["priority"], mastery: number, daysSincePractice: number): string {
  if (priority === "urgent") {
    return `Last practiced ${daysSincePractice} day(s) ago at ${mastery}% mastery, so this revision is overdue.`;
  }
  if (priority === "comfortable") {
    return `${mastery}% mastery is strong and recently practiced, so this is a maintenance revision.`;
  }
  return `Revision falls within the ${intervalDaysForMastery(mastery)}-day spaced repetition window.`;
}

function iterateChapters(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
) {
  const rows: Array<{
    subject: Subject;
    chapter: string;
    name: string;
    mastery: number;
    lastPracticed: string;
  }> = [];

  SUBJECTS.forEach((subject) => {
    Object.entries(blueprint[subject] ?? {}).forEach(([chapter, entry]) => {
      if (chapter.startsWith("_")) return;
      const masteryEntry = chapterMastery[subject]?.[chapter];
      rows.push({
        subject,
        chapter,
        name: entry.name,
        mastery: masteryEntry?.mastery ?? 0,
        lastPracticed: masteryEntry?.lastPracticed ?? referenceDate([]),
      });
    });
  });

  return rows;
}

export function revisionOptimizerEngine(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
  sessions: SessionRecord[],
): RevisionOutput {
  const today = referenceDate(sessions);
  const schedule = iterateChapters(chapterMastery, blueprint)
    .map((row) => {
      const intervalDays = intervalDaysForMastery(row.mastery);
      const daysSincePractice = daysBetween(row.lastPracticed, today);
      const priority = priorityFor(row.mastery, daysSincePractice, intervalDays);
      const overdueDays = Math.max(0, daysSincePractice - intervalDays);
      const nextRevisionDate =
        priority === "urgent"
          ? addDaysIso(today, 1)
          : addDaysIso(row.lastPracticed, intervalDays + overdueDays);

      return {
        chapter: row.chapter,
        subject: row.subject,
        name: row.name,
        nextRevisionDate,
        intervalDays,
        priority,
        reason: reasonFor(priority, row.mastery, daysSincePractice),
      } satisfies RevisionItem;
    })
    .sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return parseDate(a.nextRevisionDate) - parseDate(b.nextRevisionDate);
    })
    .slice(0, 10);

  const horizonDays =
    schedule.length > 0
      ? Math.max(
          1,
          ...schedule.map((item) => Math.max(1, daysBetween(today, item.nextRevisionDate))),
        )
      : 1;
  const dailyMinutes = Math.max(20, Math.min(60, Math.round((schedule.length * 20) / horizonDays)));

  return {
    schedule,
    totalDays: horizonDays,
    dailyMinutes,
  };
}
