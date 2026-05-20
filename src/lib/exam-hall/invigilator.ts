import type {
  ExamHallAnswer,
  ExamHallSection,
  ExamHallSessionDoc,
  InvigilatorEventDoc,
} from "@/integrations/firebase/types";

/**
 * Heuristic AI invigilator. Pure, side-effect-free — given the live
 * session state it returns a list of event drafts that should be
 * persisted. Caller decides whether to surface them as toasts.
 */
export function detectInvigilatorEvents(
  session: ExamHallSessionDoc,
): Omit<InvigilatorEventDoc, "id">[] {
  const now = Date.now();
  const out: Omit<InvigilatorEventDoc, "id">[] = [];

  const section = session.sections[session.cursor.sectionIndex];
  const question = section?.questions[session.cursor.questionIndex];
  const answer = question ? session.answers[question.id] : undefined;

  // 1. Slow solving — stuck on a single MCQ/Short for too long.
  if (question && answer) {
    const cap =
      question.kind === "mcq" ? 120 : question.kind === "short" ? 240 : 540;
    if (answer.timeSpentSec > cap && (answer.text?.length ?? 0) < 6) {
      out.push({
        userId: session.userId,
        sessionId: session.id,
        kind: "slow_solving",
        severity: "warning",
        message: "You've been on this question a while. Flag it and move on — circle back later.",
        questionId: question.id,
        sectionId: section.id,
        createdAt: now,
      });
    }
  }

  // 2. Panic — many quick visits with no growing answer.
  if (answer && answer.visits > 4 && (answer.text?.length ?? 0) < 12) {
    out.push({
      userId: session.userId,
      sessionId: session.id,
      kind: "panic",
      severity: "warning",
      message: "Breathe for 10 seconds. Re-read the question and write the first idea you remember.",
      questionId: question?.id,
      sectionId: section?.id,
      createdAt: now,
    });
  }

  // 3. Time imbalance — one section already over its budget.
  const balance = sectionTimeBalance(session);
  for (const b of balance) {
    if (b.overspendSec > 5 * 60) {
      out.push({
        userId: session.userId,
        sessionId: session.id,
        kind: "time_imbalance",
        severity: "warning",
        message: `Section "${b.sectionTitle}" is over budget by ${Math.round(b.overspendSec / 60)} min. Speed up to protect the rest.`,
        sectionId: b.sectionId,
        createdAt: now,
      });
      break;
    }
  }

  // 4. Section skipped — fully untouched while past its allocation.
  for (let i = 0; i < session.sections.length; i++) {
    if (i >= session.cursor.sectionIndex) continue;
    const sec = session.sections[i];
    const anyAnswered = sec.questions.some(
      (q) => (session.answers[q.id]?.text?.trim().length ?? 0) > 0,
    );
    if (!anyAnswered) {
      out.push({
        userId: session.userId,
        sessionId: session.id,
        kind: "section_skipped",
        severity: "critical",
        message: `You haven't started "${sec.title}". Worth ${sectionMarks(sec)} marks.`,
        sectionId: sec.id,
        createdAt: now,
      });
      break;
    }
  }

  // 5. Fatigue — performance fading past the midpoint.
  if (session.elapsedSec > session.totalDurationSec * 0.6) {
    const drop = performanceDropPct(session);
    if (drop > 0.3) {
      out.push({
        userId: session.userId,
        sessionId: session.id,
        kind: "fatigue",
        severity: "info",
        message: "Slow down for one question. Loosen your shoulders, then continue.",
        createdAt: now,
      });
    }
  }

  return out;
}

export function sectionMarks(sec: ExamHallSection) {
  return sec.questions.reduce((a, q) => a + q.marks, 0);
}

export function sectionTimeBalance(session: ExamHallSessionDoc) {
  return session.sections.map((sec) => {
    const spent = sec.questions.reduce(
      (s, q) => s + (session.answers[q.id]?.timeSpentSec ?? 0),
      0,
    );
    return {
      sectionId: sec.id,
      sectionTitle: sec.title,
      allocSec: sec.durationSec,
      spentSec: spent,
      overspendSec: Math.max(0, spent - sec.durationSec),
    };
  });
}

/**
 * Compare avg answer length per minute in the first half vs the second
 * half of the session — a rough proxy for fatigue.
 */
export function performanceDropPct(session: ExamHallSessionDoc): number {
  const answers = Object.values(session.answers) as ExamHallAnswer[];
  if (answers.length < 4) return 0;
  const half = Math.floor(answers.length / 2);
  const first = answers.slice(0, half);
  const second = answers.slice(half);
  const rate = (xs: ExamHallAnswer[]) => {
    const t = xs.reduce((s, a) => s + Math.max(a.timeSpentSec, 1), 0) / 60;
    const len = xs.reduce((s, a) => s + (a.text?.length ?? 0), 0);
    return t > 0 ? len / t : 0;
  };
  const a = rate(first);
  const b = rate(second);
  if (a <= 0) return 0;
  return Math.max(0, Math.min(1, (a - b) / a));
}