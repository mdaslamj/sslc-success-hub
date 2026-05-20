import { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "calm" | "motivational" | "celebrate";
  className?: string;
}

/**
 * Premium emotionally-aware empty state used across Insights, Subjects,
 * Planner, Exams, and Log when there is no data yet.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "motivational",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "card-premium animate-slide-up flex flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl",
          tone === "celebrate" && "gradient-brand text-brand-foreground shadow-glow",
          tone === "motivational" && "surface-2 text-primary",
          tone === "calm" && "surface-3 text-muted-foreground",
        )}
      >
        {icon ?? <Sparkles className="h-6 w-6" />}
      </div>
      <h3 className="text-title-2 text-foreground">{title}</h3>
      {description && (
        <p className="text-body-sm max-w-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}