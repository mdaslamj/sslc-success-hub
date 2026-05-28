import { loadManifest } from "@/lib/contentLoader";
import {
  chapterKeysMatch,
  findChapterByKey,
  normalizeChapterKey,
} from "@/lib/normalizeChapterKey";

/**
 * Canonical route IDs and chapter slug helpers for content routes.
 * Content JSON lives at `/content/chapters/{folder}/{slug}.json`.
 */

const SUBJECT_ROUTE_IDS: Record<string, string> = {
  math: "mathematics",
  mathematics: "mathematics",
  science: "science",
  social: "social-science",
  socialscience: "social-science",
  "social-science": "social-science",
};

export function canonicalSubjectRouteId(subjectId: string): string {
  return SUBJECT_ROUTE_IDS[subjectId] ?? subjectId;
}

export function chapterRouteSlug(
  chapterId: string | undefined,
  title?: string,
): string {
  const id = (chapterId ?? "").trim();
  if (id && !id.startsWith("math-ch")) return id;
  if (title) return slugifyChapterTitle(title);
  if (id) return id;
  return "unknown-chapter";
}

export function slugifyChapterTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "chapter"
  );
}

/** Map migrated question-bank chapter ids (math-chN) to content JSON slugs. */
export function migratedChapterIdToContentSlug(
  migratedId: string,
  manifestChapters: { id: string; chapterNumber?: number }[],
): string | null {
  const match = migratedId.match(/^math-ch(\d+)$/i);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  const sorted = [...manifestChapters].sort(
    (a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0),
  );
  return sorted[index]?.id ?? null;
}

export async function resolveChapterContentSlug(
  contentFolder: string,
  chapterParam: string,
): Promise<string> {
  const direct = chapterRouteSlug(chapterParam);
  if (direct && !direct.startsWith("math-ch")) return direct;

  try {
    const manifest = (await loadManifest(contentFolder)) as {
      chapters?: { id: string; chapterNumber?: number; title?: string }[];
    };
    const chapters = manifest.chapters ?? [];
    const fromMigrated = migratedChapterIdToContentSlug(chapterParam, chapters);
    if (fromMigrated) return fromMigrated;

    const byKey = findChapterByKey(chapters, chapterParam);
    if (byKey?.id) return byKey.id;

    const byTitle = chapters.find(
      (c) =>
        slugifyChapterTitle(c.title ?? "") === slugifyChapterTitle(chapterParam) ||
        chapterKeysMatch(c.title ?? "", chapterParam) ||
        normalizeChapterKey(c.id) === normalizeChapterKey(chapterParam),
    );
    if (byTitle?.id) return byTitle.id;
  } catch {
    // fall through
  }

  return direct;
}

export function isSubjectNestedChapterRoute(pathname: string): boolean {
  return /\/subjects\/[^/]+\/(formulas|topics)\//.test(pathname);
}

export function isFormulaDetailRoute(pathname: string): boolean {
  return /\/subjects\/[^/]+\/formulas\/[^/]+\/[^/]+$/.test(pathname);
}

export function isTopicDetailRoute(pathname: string): boolean {
  return /\/subjects\/[^/]+\/topics\/[^/]+\/[^/]+$/.test(pathname);
}

export function contentItemSlug(label: string, index: number): string {
  const base = slugifyChapterTitle(label);
  return base ? `${base}-${index}` : `item-${index}`;
}

export function topicItemSlug(
  kind: "learning-point" | "key-term",
  index: number,
  label: string,
): string {
  const prefix = kind === "learning-point" ? "lp" : "kt";
  const base = slugifyChapterTitle(label);
  return base ? `${prefix}-${index}-${base}` : `${prefix}-${index}`;
}

export type TopicListItem = {
  slug: string;
  kind: "learning-point" | "key-term";
  title: string;
  preview: string;
  body: string;
};

export function buildTopicListItems(chapter: {
  learningPoints?: string[];
  keyTerms?: { term: string; definition: string }[];
}): TopicListItem[] {
  const items: TopicListItem[] = [];

  (chapter.learningPoints ?? []).forEach((point, index) => {
    items.push({
      slug: topicItemSlug("learning-point", index, point),
      kind: "learning-point",
      title: `Learning point ${index + 1}`,
      preview: point.length > 110 ? `${point.slice(0, 110)}…` : point,
      body: point,
    });
  });

  (chapter.keyTerms ?? []).forEach((term, index) => {
    items.push({
      slug: topicItemSlug("key-term", index, term.term),
      kind: "key-term",
      title: term.term,
      preview: term.definition,
      body: term.definition,
    });
  });

  return items;
}

export function findTopicListItem(
  items: TopicListItem[],
  slug: string,
): TopicListItem | null {
  return items.find((item) => item.slug === slug) ?? null;
}

export function findFormulaIndexBySlug(
  formulas: { label: string }[],
  slug: string,
): number {
  return formulas.findIndex(
    (formula, index) => contentItemSlug(formula.label, index) === slug,
  );
}
