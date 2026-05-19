import { mathAdapter } from "./math-adapter";
import { scienceAdapter } from "./science-adapter";
import { socialScienceAdapter } from "./social-science-adapter";
import { languageAdapter } from "./language-adapter";
import type { SubjectAdapter, SubjectKey } from "./types";

/**
 * Central registry. Adding a new subject = drop adapter here.
 * Callers must always go through `getSubjectAdapter` so the backbone
 * (planner, memory tracking, prediction engine, tutoring continuity)
 * stays single-sourced.
 */
export const SUBJECT_ADAPTERS: Record<SubjectKey, SubjectAdapter> = {
  mathematics: mathAdapter,
  science: scienceAdapter,
  "social-science": socialScienceAdapter,
  languages: languageAdapter,
};

const SUBJECT_ID_ALIASES: Record<string, SubjectKey> = {
  math: "mathematics",
  maths: "mathematics",
  mathematics: "mathematics",
  science: "science",
  sci: "science",
  physics: "science",
  chemistry: "science",
  biology: "science",
  social: "social-science",
  socialscience: "social-science",
  "social-science": "social-science",
  history: "social-science",
  geography: "social-science",
  civics: "social-science",
  economics: "social-science",
  language: "languages",
  languages: "languages",
  english: "languages",
  kannada: "languages",
  hindi: "languages",
  sanskrit: "languages",
};

/** Resolve a free-form subject id to a known adapter; defaults to math. */
export function getSubjectAdapter(subjectId: string | undefined): SubjectAdapter {
  if (!subjectId) return mathAdapter;
  const key = SUBJECT_ID_ALIASES[subjectId.toLowerCase().trim()];
  return SUBJECT_ADAPTERS[key ?? "mathematics"];
}

export function listSubjectAdapters(): SubjectAdapter[] {
  return Object.values(SUBJECT_ADAPTERS);
}