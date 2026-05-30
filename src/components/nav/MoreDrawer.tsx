import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export type MoreDrawerItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** When false the tile is omitted. Defaults to true. */
  show?: boolean;
};

type MoreDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MoreDrawerItem[];
};

export function MoreDrawer({ open, onOpenChange, items }: MoreDrawerProps) {
  const navigate = useNavigate();
  const visibleItems = items.filter((item) => item.show !== false);

  const handleSelect = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl border-0 px-4 pb-8 pt-3 md:hidden",
          "[&>button]:hidden",
        )}
        style={{
          background: "#0F0F18",
          paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" aria-hidden />

        <h2
          className="mb-5 text-center text-base font-semibold text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          More features
        </h2>

        <ul className="mx-auto grid max-w-lg grid-cols-2 gap-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to + item.label}>
                <button
                  type="button"
                  onClick={() => handleSelect(item.to)}
                  className={cn(
                    "press focus-ring flex w-full flex-col items-center gap-2 rounded-2xl",
                    "border border-white/8 bg-white/5 px-3 py-4 text-center",
                    "transition-colors hover:bg-white/10 active:bg-white/15",
                  )}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B5CF6]/15">
                    <Icon className="h-5 w-5 text-[#8B5CF6]" aria-hidden />
                  </span>
                  <span className="text-[13px] font-medium leading-tight text-white/90">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
