import { Sigma } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentFormula } from "@/lib/normalizeChapterData";

export function FormulasSection({
  formulas,
  loading,
}: {
  formulas: ContentFormula[];
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (formulas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        No formulas available for this chapter yet.
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {formulas.map((f, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Sigma className="h-4 w-4" />
            </div>
            <h3 className="font-display font-semibold">{f.label}</h3>
          </div>
          <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-3 font-mono text-sm">
            {f.expression}
          </div>
          {f.description && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {f.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}