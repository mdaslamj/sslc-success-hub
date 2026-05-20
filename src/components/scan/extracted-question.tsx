import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ScanDoc } from "@/integrations/firebase/types";

export function ExtractedQuestion({
  scan,
  onEdit,
}: {
  scan: ScanDoc;
  onEdit?: (text: string) => void;
}) {
  const u = scan.understanding;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(scan.extractedText);

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {u?.subject && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
              {u.subject}
            </span>
          )}
          {u?.chapterTitle && (
            <span className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] text-muted-foreground">
              {u.chapterTitle}
            </span>
          )}
          {u?.difficulty && u.difficulty !== "unknown" && (
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
              {u.difficulty}
            </span>
          )}
          {typeof u?.boardRelevance === "number" && (
            <span className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] text-muted-foreground">
              Board {u.boardRelevance}%
            </span>
          )}
        </div>
        {onEdit && !editing && (
          <Button size="icon" variant="ghost" className="h-8 w-8 press" onClick={() => setEditing(true)} aria-label="Edit question">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="resize-none rounded-2xl"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setDraft(scan.extractedText); setEditing(false); }}>
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" className="gradient-brand text-brand-foreground" onClick={() => { onEdit?.(draft.trim()); setEditing(false); }}>
              <Check className="mr-1 h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap font-display text-[15px] leading-relaxed text-foreground">
          {scan.extractedText || "—"}
        </p>
      )}

      {(u?.concepts?.length || u?.formulas?.length) ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
          {u?.concepts?.map((c) => (
            <span key={c} className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              # {c}
            </span>
          ))}
          {u?.formulas?.map((f) => (
            <span key={f} className="rounded-full border border-brand/30 bg-brand/5 px-2 py-0.5 text-[11px] font-mono text-brand">
              {f}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}