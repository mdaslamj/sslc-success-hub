import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { resetAuraAppState } from "@/lib/dev/aura-app-reset";
import { AURA_CACHE_VERSION } from "@/lib/dev/aura-cache-registry";

type Props = {
  variant?: "button" | "menu-item";
  className?: string;
};

/**
 * Development-only control to wipe Aura caches and reload cleanly.
 */
export function AuraDevResetAction({ variant = "button", className }: Props) {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  if (!import.meta.env.DEV) return null;

  const runReset = async () => {
    setBusy(true);
    try {
      toast.message("Resetting Aura data…");
      await resetAuraAppState({
        queryClient,
        reload: true,
        preserveTheme: true,
      });
    } catch (err) {
      console.error(err);
      toast.error("Reset failed — check console");
      setBusy(false);
    }
  };

  const trigger =
    variant === "menu-item" ? (
      <button
        type="button"
        className={className ?? "w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-secondary/80"}
        disabled={busy}
      >
        Reset Aura Data
      </button>
    ) : (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className ?? "gap-1.5 border-dashed border-amber-500/40 text-amber-700 dark:text-amber-300"}
        disabled={busy}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset Aura Data
      </Button>
    );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Aura data?</AlertDialogTitle>
          <AlertDialogDescription>
            Clears Aura localStorage, IndexedDB, exam/chapter caches, planner state,
            and React Query memory. Cache version: {AURA_CACHE_VERSION}. Firebase sign-in
            is kept. The app will reload.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={() => void runReset()}>
            {busy ? "Resetting…" : "Reset & reload"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
