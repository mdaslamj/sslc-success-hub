/** Human-readable chapter labels for evaluation UI. */
export function formatChapterLabel(chapterId: string): string {
  return chapterId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
