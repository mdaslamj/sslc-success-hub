/**
 * Thin wrapper around the existing semantic reasoning server function for
 * the in-session AI coach (motivation + contextual hints). Returns null
 * if the user is a guest or the call fails — UI falls back to heuristics.
 */
import type { User } from "firebase/auth";
import { runSemanticReasoning } from "@/lib/semantic-reasoning/semantic-reasoning.functions";
import type { DailyTask } from "@/integrations/firebase/types";

export type CoachCue = {
  motivation: string;
  nextStep?: string;
};

export type CoachHint = {
  hint: string;
  followUp?: string;
};

export async function fetchCoachCue(user: User | null, task: DailyTask, daysToExam: number): Promise<CoachCue | null> {
  if (!user) return null;
  try {
    const idToken = await user.getIdToken();
    const res = await runSemanticReasoning({
      data: {
        idToken,
        systemPrompt:
          "You are Aura, a calm, encouraging study coach. Respond ONLY as JSON with keys " +
          "'motivation' (one warm sentence, <=18 words) and 'nextStep' (one concrete first action, <=20 words). No markdown.",
        responseFormat: "json_object",
        temperature: 0.6,
        messages: [
          {
            role: "user",
            content: `Starting a focus block.\nTask: ${task.title}\nSubject: ${task.subject ?? "—"}\nTarget: ${task.durationMin}m\nDays to exam: ${daysToExam}`,
          },
        ],
      },
    });
    if (!res.ok) return null;
    return JSON.parse(res.content) as CoachCue;
  } catch {
    return null;
  }
}

export async function fetchCoachHint(
  user: User | null,
  task: DailyTask,
  problemContext: string,
): Promise<CoachHint | null> {
  if (!user) return null;
  try {
    const idToken = await user.getIdToken();
    const res = await runSemanticReasoning({
      data: {
        idToken,
        systemPrompt:
          "You are Aura, a Socratic study coach for an Indian SSLC student. Give ONE short hint that nudges them " +
          "without revealing the full answer. Respond ONLY as JSON: keys 'hint' (<=30 words) and 'followUp' (one " +
          "question to keep them thinking, <=18 words). No markdown.",
        responseFormat: "json_object",
        temperature: 0.4,
        messages: [
          {
            role: "user",
            content: `Topic: ${task.title}\nSubject: ${task.subject ?? "—"}\nStudent is stuck on: ${problemContext || "the current step"}.`,
          },
        ],
      },
    });
    if (!res.ok) return null;
    return JSON.parse(res.content) as CoachHint;
  } catch {
    return null;
  }
}