/**
 * Subject-aware preparation modes shown when a planner task expands.
 *
 * Pure config — no UI. Each mode declares an id, label, short hint, and
 * an optional `to` route so future flows (mock exams, weak-topic engine,
 * revision queue, analytics) can wire in without touching this file.
 */
import { getSubjectAdapter } from "@/lib/subject-adapters";
import type { SubjectKey } from "@/lib/subject-adapters/types";

export type PrepMode = {
  id: string;
  label: string;
  hint: string;
  icon: string;
  /** Optional deep-link target (route path). Future flows can fill these in. */
  to?: string;
};

export const PREP_MODES: Record<SubjectKey, PrepMode[]> = {
  mathematics: [
    { id: "formula", label: "Formula Practice", hint: "Drill key formulas", icon: "∑", to: "/subjects/mathematics" },
    { id: "mcq", label: "MCQ Practice", hint: "Quick objective check", icon: "◉", to: "/practice" },
    { id: "short", label: "Short Answers", hint: "2–3 mark sums", icon: "✎", to: "/practice" },
    { id: "long", label: "Long Answers", hint: "5 mark step-by-step", icon: "✍", to: "/practice" },
    { id: "timed", label: "Timed Solving", hint: "Beat the clock", icon: "⏱", to: "/focus" },
    { id: "pyq", label: "PYQs", hint: "Previous year papers", icon: "📜", to: "/exams" },
  ],
  science: [
    { id: "concept", label: "Concept Learning", hint: "Understand the idea", icon: "💡", to: "/subjects/science" },
    { id: "diagram", label: "Diagram Practice", hint: "Sketch & explain", icon: "✏", to: "/subjects/science" },
    { id: "label", label: "Figure Labeling", hint: "Name every part", icon: "🏷", to: "/subjects/science" },
    { id: "experiment", label: "Experiment Questions", hint: "Apparatus & procedure", icon: "⚗", to: "/subjects/science" },
    { id: "mcq", label: "MCQ Practice", hint: "Quick objective check", icon: "◉", to: "/practice" },
  ],
  "social-science": [
    { id: "map", label: "Map Practice", hint: "Locate & mark", icon: "🗺", to: "/subjects/social-science" },
    { id: "timeline", label: "Timeline Practice", hint: "Order the events", icon: "📅", to: "/subjects/social-science" },
    { id: "oneword", label: "One Word Answers", hint: "Rapid recall", icon: "•", to: "/practice" },
    { id: "long", label: "Long Answers", hint: "Cause → effect", icon: "✍", to: "/practice" },
    { id: "pyq", label: "PYQs", hint: "Previous year papers", icon: "📜", to: "/exams" },
  ],
  languages: [
    { id: "grammar", label: "Grammar Practice", hint: "Rules & usage", icon: "📚", to: "/subjects" },
    { id: "essay", label: "Essay Writing", hint: "Structure & flow", icon: "✍", to: "/practice" },
    { id: "letter", label: "Letter Writing", hint: "Formal & informal", icon: "✉", to: "/practice" },
    { id: "reading", label: "Reading Comprehension", hint: "Read & answer", icon: "📖", to: "/practice" },
    { id: "vocab", label: "Vocabulary Practice", hint: "Build word power", icon: "🔤", to: "/practice" },
  ],
};

/** Resolve prep modes from a free-form subject name/id (uses adapter aliases). */
export function getPrepModes(subject: string | undefined): PrepMode[] {
  const adapter = getSubjectAdapter(subject);
  return PREP_MODES[adapter.subject] ?? PREP_MODES.mathematics;
}