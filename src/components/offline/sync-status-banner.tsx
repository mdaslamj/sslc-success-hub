import { useMemo } from "react";
import { CloudOff, RefreshCw, CheckCircle2, UploadCloud, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOffline } from "@/hooks/use-offline";

/**
 * Subtle status strip — only shows when there is something for the
 * student to know (offline, syncing, or queued items). Keeps the calm
 * educational tone; never alarms.
 */
export function SyncStatusBanner({ className }: { className?: string }) {
  const { status, queue, syncNow, lightweight, setLightweight } = useOffline();

  const visible = !status.online || status.syncing || queue.length > 0;
  const tone = useMemo(() => {
    if (!status.online) return "offline";
    if (status.syncing) return "syncing";
    if (queue.length > 0) return "pending";
    return "ok";
  }, [status, queue.length]);

  if (!visible) return null;

  const label =
    tone === "offline"
      ? "You're offline. Your work is being saved safely."
      : tone === "syncing"
        ? "Syncing your progress…"
        : `${queue.length} update${queue.length === 1 ? "" : "s"} waiting to sync`;

  const Icon = tone === "offline" ? CloudOff : tone === "syncing" ? RefreshCw : UploadCloud;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border/50 bg-secondary/60 px-3 py-2 text-xs backdrop-blur",
        tone === "offline" && "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
        tone === "syncing" && "border-primary/30 bg-primary/5 text-primary",
        tone === "pending" && "border-border/60 text-foreground/80",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone === "syncing" && "animate-spin")} />
      <span className="truncate">{label}</span>
      <div className="ml-auto flex items-center gap-1">
        {status.online && queue.length > 0 && !status.syncing ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2 text-[11px]"
            onClick={() => void syncNow()}
          >
            Sync now
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2 text-[11px]"
          onClick={() => void setLightweight(!lightweight.enabled)}
          aria-pressed={lightweight.enabled}
          title="Lightweight mode reduces data and animations"
        >
          <Zap className="mr-1 h-3 w-3" />
          {lightweight.enabled ? "Lite on" : "Lite"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Tiny inline confirmation — useful in lists to indicate a row is
 * queued and will sync when the network returns.
 */
export function QueuedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      <UploadCloud className="h-3 w-3" /> Queued
    </span>
  );
}

export function SyncedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300",
        className,
      )}
    >
      <CheckCircle2 className="h-3 w-3" /> Synced
    </span>
  );
}