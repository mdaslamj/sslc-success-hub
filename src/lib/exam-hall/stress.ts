import type {
  ExamHallSessionDoc,
  InvigilatorEventDoc,
  StressPatternDoc,
} from "@/integrations/firebase/types";
import { performanceDropPct } from "./invigilator";

export function summarizeStress(args: {
  session: ExamHallSessionDoc;
  events: InvigilatorEventDoc[];
}): Omit<StressPatternDoc, "id"> {
  const { session, events } = args;
  const hesitationCount = Object.values(session.answers).reduce(
    (s, a) => s + (a.hesitations ?? 0),
    0,
  );
  const panicSpikes = events.filter((e) => e.kind === "panic").length;
  const fatigueScore = Math.min(1, events.filter((e) => e.kind === "fatigue").length / 3);
  const drop = performanceDropPct(session);
  const overspend = events.filter((e) => e.kind === "time_imbalance").length;

  const pressureScore =
    panicSpikes * 0.4 + overspend * 0.25 + drop * 0.25 + fatigueScore * 0.1;
  const pressureResponse: StressPatternDoc["pressureResponse"] =
    pressureScore < 0.2
      ? "calm"
      : pressureScore < 0.5
        ? "steady"
        : pressureScore < 0.8
          ? "rattled"
          : "overwhelmed";

  const notes: string[] = [];
  if (panicSpikes > 0) notes.push("Reset breath after each tough question.");
  if (overspend > 0) notes.push("Practise strict per-section timers in revision.");
  if (drop > 0.3) notes.push("Build stamina with two-hour focus blocks.");

  return {
    userId: session.userId,
    sessionId: session.id,
    hesitationCount,
    panicSpikes,
    fatigueScore,
    performanceDropPct: drop,
    pressureResponse,
    notes,
    createdAt: Date.now(),
  };
}