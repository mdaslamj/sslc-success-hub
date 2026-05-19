import {
  BookOpen,
  GraduationCap,
  Sigma,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { LibraryCategory } from "@/integrations/firebase/types";

export type QuickAccessAction = {
  label: string;
  category?: LibraryCategory;
  featuredOnly?: boolean;
  icon: LucideIcon;
};

const ACTIONS: QuickAccessAction[] = [
  { label: "Karnataka textbooks", category: "textbook", icon: BookOpen },
  { label: "Board papers", category: "pyq", icon: GraduationCap },
  { label: "Formula bank", category: "formula", icon: Sigma },
  { label: "Featured PDFs", featuredOnly: true, icon: Star },
];

export function QuickAccess({
  onSelect,
}: {
  onSelect: (a: QuickAccessAction) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={() => onSelect(a)}
            className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left shadow-sm transition hover:border-brand/40 hover:bg-brand/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{a.label}</div>
              <div className="text-[11px] text-muted-foreground">
                Quick access
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { ACTIONS as QUICK_ACCESS_ACTIONS };
