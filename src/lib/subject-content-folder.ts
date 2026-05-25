const MATH_SUBJECT_IDS = new Set(["mathematics", "math"]);
const SCIENCE_SUBJECT_IDS = new Set(["science"]);
const SOCIAL_SUBJECT_IDS = new Set([
  "social",
  "social-science",
  "socialscience",
]);

export function contentFolderFor(subjectId: string): string | null {
  if (MATH_SUBJECT_IDS.has(subjectId)) return "mathematics";
  if (SCIENCE_SUBJECT_IDS.has(subjectId)) return "science";
  if (SOCIAL_SUBJECT_IDS.has(subjectId)) return "social-science";
  return null;
}