import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type CriticalGuardAction = "swap" | "push";

export type CriticalGuardWarningInput = {
  chapterName: string;
  marksAtRisk: number;
  action: CriticalGuardAction;
  pushCount?: number;
};

export type CriticalGuardHardBlockInput = {
  chapterName: string;
  marksAtRisk: number;
  pushCount: number;
};

type GuardState =
  | ({ mode: "warning" } & CriticalGuardWarningInput)
  | ({ mode: "hard-block" } & CriticalGuardHardBlockInput);

type WarningResolver = (confirmed: boolean) => void;
type HardBlockResolver = (outcome: "dismiss" | "study") => void;

export function useCriticalChapterGuard() {
  const [state, setState] = useState<GuardState | null>(null);
  const warningResolverRef = useRef<WarningResolver | null>(null);
  const hardBlockResolverRef = useRef<HardBlockResolver | null>(null);

  const showCriticalGuard = useCallback(
    (input: CriticalGuardWarningInput): Promise<boolean> =>
      new Promise((resolve) => {
        warningResolverRef.current = resolve;
        setState({ mode: "warning", ...input });
      }),
    [],
  );

  const showHardBlock = useCallback(
    (input: CriticalGuardHardBlockInput): Promise<"dismiss" | "study"> =>
      new Promise((resolve) => {
        hardBlockResolverRef.current = resolve;
        setState({ mode: "hard-block", ...input });
      }),
    [],
  );

  const closeWarning = useCallback((confirmed: boolean) => {
    warningResolverRef.current?.(confirmed);
    warningResolverRef.current = null;
    setState(null);
  }, []);

  const closeHardBlock = useCallback((outcome: "dismiss" | "study") => {
    hardBlockResolverRef.current?.(outcome);
    hardBlockResolverRef.current = null;
    setState(null);
  }, []);

  const dialog = (
    <CriticalChapterGuardDialog
      state={state}
      onWarningClose={closeWarning}
      onHardBlockClose={closeHardBlock}
    />
  );

  return { showCriticalGuard, showHardBlock, dialog };
}

function CriticalChapterGuardDialog({
  state,
  onWarningClose,
  onHardBlockClose,
}: {
  state: GuardState | null;
  onWarningClose: (confirmed: boolean) => void;
  onHardBlockClose: (outcome: "dismiss" | "study") => void;
}) {
  if (!state) return null;

  if (state.mode === "hard-block") {
    return (
      <AlertDialog open onOpenChange={() => onHardBlockClose("dismiss")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot push again</AlertDialogTitle>
            <AlertDialogDescription>
              You have pushed <strong>{state.chapterName}</strong> {state.pushCount} times already.
              Avoiding it is costing an estimated {state.marksAtRisk} marks at risk on the board
              paper. Study it today or use swap to replace it with another chapter — pushing again
              is blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onHardBlockClose("dismiss")}>
              Close
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => onHardBlockClose("study")}>
              Study this chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const isSwap = state.action === "swap";
  const pushLabel =
    state.pushCount != null && state.pushCount > 0
      ? ` (pushed ${state.pushCount} time${state.pushCount === 1 ? "" : "s"} before)`
      : "";

  return (
    <AlertDialog open onOpenChange={() => onWarningClose(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSwap ? "Swap critical chapter?" : "Push critical chapter?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{state.chapterName}</strong> is critical{pushLabel}.{" "}
            {isSwap
              ? `Swapping it increases your marks at risk by about ${state.marksAtRisk}.`
              : `Pushing it again delays ~${state.marksAtRisk} marks at risk.`}{" "}
            Are you sure you want to {isSwap ? "swap" : "push"} instead of studying it today?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onWarningClose(false)}>
            {isSwap ? "Keep it" : "Study today"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onWarningClose(true)}>
            {isSwap ? "Swap anyway" : "Push anyway"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
