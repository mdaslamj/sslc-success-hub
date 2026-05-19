import { useQueries } from "@tanstack/react-query";
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Languages,
  Lightbulb,
  ListChecks,
  PlayCircle,
  Sigma,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChapterDoc, ResourceKind } from "@/integrations/firebase/types";
import {
  fetchChapterNote,
  fetchChapterResources,
  fetchSyllabusContent,
  fetchTextbookLink,
  groupResourcesByKind,
} from "@/integrations/firebase/services/syllabus-content";

const KIND_META: Record<ResourceKind, { label: string; icon: LucideIcon }> = {
  textbook: { label: "Textbook", icon: BookOpen },
  notes: { label: "Notes", icon: FileText },
  worksheet: { label: "Worksheets", icon: ListChecks },
  video: { label: "Videos", icon: PlayCircle },
  pyq: { label: "Previous year papers", icon: GraduationCap },
  revision: { label: "Revision", icon: Sparkles },
  kannada: { label: "Kannada notes", icon: Languages },
  other: { label: "Other", icon: ExternalLink },
};

/**
 * Reusable per-chapter resource panel. Reads from the new structured
 * collections (syllabusContent, chapterResources, textbookLinks, chapterNotes)
 * and falls back to fields already present on the ChapterDoc so existing
 * imports keep working.
 *
 * Designed to be embedded inside any chapter detail / planner / AI tutor
 * surface without re-fetching the underlying chapter.
 */
export function ChapterResources({ chapter }: { chapter: ChapterDoc }) {
  const [contentQ, resourcesQ, textbookQ, noteQ] = useQueries({
    queries: [
      {
        queryKey: ["syllabus-content", chapter.id],
        queryFn: () => fetchSyllabusContent(chapter.id),
        staleTime: 5 * 60_000,
      },
      {
        queryKey: ["chapter-resources", chapter.id],
        queryFn: () => fetchChapterResources(chapter.id),
        staleTime: 5 * 60_000,
      },
      {
        queryKey: ["textbook-link", chapter.id],
        queryFn: () => fetchTextbookLink(chapter.id),
        staleTime: 5 * 60_000,
      },
      {
        queryKey: ["chapter-note", chapter.id],
        queryFn: () => fetchChapterNote(chapter.id),
        staleTime: 5 * 60_000,
      },
    ],
  });

  const loading =
    contentQ.isLoading || resourcesQ.isLoading || textbookQ.isLoading || noteQ.isLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  // Merge structured content + fallbacks from the chapter doc itself.
  const importantTopics =
    contentQ.data?.importantTopics?.length
      ? contentQ.data.importantTopics
      : (chapter.importantTopics ?? []);
  const formulas =
    contentQ.data?.formulas?.length ? contentQ.data.formulas : (chapter.formulas ?? []);
  const objectives =
    contentQ.data?.learningObjectives?.length
      ? contentQ.data.learningObjectives
      : (chapter.learningObjectives ?? []);
  const summary = contentQ.data?.summary;

  const grouped = groupResourcesByKind(resourcesQ.data ?? []);

  // Hydrate "textbook" section from the dedicated TextbookLinkDoc if the
  // resources collection didn't have one.
  if (textbookQ.data && grouped.textbook.length === 0) {
    grouped.textbook.push({
      id: textbookQ.data.id,
      subjectId: textbookQ.data.subjectId,
      chapterId: textbookQ.data.chapterId,
      kind: "textbook",
      title: textbookQ.data.title,
      url: textbookQ.data.url,
      createdAt: textbookQ.data.updatedAt,
    });
  }
  // Same for curated chapter note.
  if (noteQ.data?.url && grouped.notes.length === 0) {
    grouped.notes.push({
      id: noteQ.data.id,
      subjectId: noteQ.data.subjectId,
      chapterId: noteQ.data.chapterId,
      kind: "notes",
      title: noteQ.data.title,
      url: noteQ.data.url,
      createdAt: noteQ.data.updatedAt,
    });
  }

  // Final fallback: pull URLs straight off the ChapterDoc for legacy imports.
  if (chapter.textbookUrl && grouped.textbook.length === 0) {
    grouped.textbook.push({
      id: `${chapter.id}__legacy_tb`,
      subjectId: chapter.subjectId,
      chapterId: chapter.id,
      kind: "textbook",
      title: "Official textbook",
      url: chapter.textbookUrl,
      createdAt: 0,
    });
  }
  if (chapter.notesUrl && grouped.notes.length === 0) {
    grouped.notes.push({
      id: `${chapter.id}__legacy_notes`,
      subjectId: chapter.subjectId,
      chapterId: chapter.id,
      kind: "notes",
      title: "Notes",
      url: chapter.notesUrl,
      createdAt: 0,
    });
  }
  if (chapter.worksheetUrl && grouped.worksheet.length === 0) {
    grouped.worksheet.push({
      id: `${chapter.id}__legacy_ws`,
      subjectId: chapter.subjectId,
      chapterId: chapter.id,
      kind: "worksheet",
      title: "Worksheet",
      url: chapter.worksheetUrl,
      createdAt: 0,
    });
  }
  if (chapter.videoUrls?.length && grouped.video.length === 0) {
    chapter.videoUrls.forEach((url, i) => {
      grouped.video.push({
        id: `${chapter.id}__legacy_vid_${i}`,
        subjectId: chapter.subjectId,
        chapterId: chapter.id,
        kind: "video",
        title: `Video ${i + 1}`,
        url,
        createdAt: 0,
      });
    });
  }

  const hasAnyResource = (
    Object.keys(grouped) as ResourceKind[]
  ).some((k) => grouped[k].length > 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <SectionHeader icon={Sparkles} title="Chapter summary" />
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {summary}
          </p>
        </section>
      )}

      {/* Important topics */}
      {importantTopics.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <SectionHeader icon={Lightbulb} title="Important topics" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {importantTopics.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="rounded-full bg-brand/5 border-brand/30 text-foreground"
              >
                {t}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Formulas */}
      {formulas.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <SectionHeader icon={Sigma} title="Formulas" />
          <ul className="mt-2 space-y-2">
            {formulas.map((f) => (
              <li
                key={f.label}
                className="rounded-xl border border-border/40 bg-muted/30 p-3"
              >
                <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
                <div className="mt-0.5 font-mono text-sm">{f.expression}</div>
                {f.description && (
                  <div className="mt-1 text-xs text-muted-foreground">{f.description}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Learning objectives */}
      {objectives.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <SectionHeader icon={ListChecks} title="Learning objectives" />
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Resource sections, fixed order */}
      {(
        ["textbook", "notes", "video", "worksheet", "pyq", "revision", "kannada", "other"] as ResourceKind[]
      ).map((kind) => {
        const items = grouped[kind];
        if (!items.length) return null;
        const meta = KIND_META[kind];
        return (
          <section
            key={kind}
            className="rounded-2xl border border-border/60 bg-card p-4"
          >
            <SectionHeader icon={meta.icon} title={meta.label} />
            <ul className="mt-2 space-y-1.5">
              {items.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/30 p-3 text-sm transition hover:border-brand/40 hover:bg-brand/5"
                  >
                    <span className="min-w-0 truncate font-medium">{r.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-brand" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {!hasAnyResource &&
        !summary &&
        importantTopics.length === 0 &&
        formulas.length === 0 &&
        objectives.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No resources yet for this chapter.
          </div>
        )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="font-display text-sm font-semibold">{title}</h4>
    </div>
  );
}
