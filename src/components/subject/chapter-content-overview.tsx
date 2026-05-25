import { BookOpen, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NormalizedChapter } from "@/lib/normalizeChapterData";

export function ChapterContentOverview({
  chapter,
}: {
  chapter: NormalizedChapter;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" /> Chapter overview
      </div>
      <h2 className="mt-1 font-display text-xl font-bold">{chapter.title}</h2>
      {chapter.summary && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {chapter.summary}
        </p>
      )}
      {chapter.learningPoints && chapter.learningPoints.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            <h3 className="font-display font-semibold">Learning points</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {chapter.learningPoints.length}
            </Badge>
          </div>
          <ul className="mt-2 space-y-1.5 pl-1">
            {chapter.learningPoints.map((p: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {chapter.keyTerms && chapter.keyTerms.length > 0 && (
        <div className="mt-5">
          <h3 className="font-display font-semibold">Key terms</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {chapter.keyTerms.map((t, i) => (
              <li
                key={i}
                className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm"
              >
                <div className="font-semibold">{t.term}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t.definition}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {chapter.exercises && chapter.exercises.length > 0 && (
        <div className="mt-5">
          <h3 className="font-display font-semibold">Exercises</h3>
          <ol className="mt-2 space-y-2 pl-4 list-decimal text-sm">
            {chapter.exercises.map((e) => (
              <li key={e.id} className="text-foreground/90">
                <div>{e.question}</div>
                {e.answer && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {e.answer}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}