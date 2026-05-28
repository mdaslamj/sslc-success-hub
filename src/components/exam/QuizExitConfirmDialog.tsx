import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuizExitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function QuizExitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: QuizExitConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End current quiz session?</DialogTitle>
          <DialogDescription>
            Your current progress will be saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Continue Quiz
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Exit Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
