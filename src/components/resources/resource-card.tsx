import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Languages,
  Library,
  ListChecks,
  PlayCircle,
  Sigma,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  LibraryCategory,
  LibraryResourceDoc,
} from "@/integrations/firebase/types";
import { incrementLibraryResourceViews } from "@/integrations/firebase/services/library-resources";

const CATEGORY_ICON: Record<LibraryCategory, LucideIcon> = {
  textbook: BookOpen,
  pyq: GraduationCap,
  notes: FileText,
  worksheet: ListChecks,
  video: PlayCircle,
  formula: Sigma,
  qbank: Library,
  revision: Sparkles,
};

export function ResourceCard({ resource }: { resource: LibraryResourceDoc }) {
  const Icon = CATEGORY_ICON[resource.category] ?? Library;
  const href = resource.url ?? "#";
  const onOpen = () => {
    void incrementLibraryResourceViews(resource.id);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onOpen}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-brand/40 hover:shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-display text-sm font-semibold text-foreground">
            {resource.title}
          </h3>
          {resource.titleKn && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {resource.titleKn}
            </p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-brand" />
      </div>

      {resource.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {resource.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {resource.isOfficial && (
          <Badge
            variant="outline"
            className="h-5 rounded-full border-success/40 bg-success/10 px-2 text-[10px] text-success"
          >
            Official
          </Badge>
        )}
        {resource.year !== undefined && (
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
            {resource.year}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="h-5 gap-1 rounded-full px-2 text-[10px] capitalize"
        >
          <Languages className="h-3 w-3" />
          {resource.language}
        </Badge>
        {resource.tags.slice(0, 2).map((t) => (
          <Badge
            key={t}
            variant="outline"
            className="h-5 rounded-full px-2 text-[10px] text-muted-foreground"
          >
            {t}
          </Badge>
        ))}
      </div>
    </a>
  );
}
