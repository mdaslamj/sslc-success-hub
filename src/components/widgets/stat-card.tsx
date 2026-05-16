import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "brand" | "success" | "warning" | "info";
  className?: string;
}) {
  const accentMap: Record<string, string> = {
    brand: "from-brand/15 to-brand-glow/10 text-brand",
    success: "from-success/15 to-success/5 text-success",
    warning: "from-warning/15 to-warning/5 text-warning",
    info: "from-info/15 to-info/5 text-info",
  };
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-glow",
        className,
      )}
    >
      <div className={cn("absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl", accentMap[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold text-foreground">{value}</div>
          {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br", accentMap[accent])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}