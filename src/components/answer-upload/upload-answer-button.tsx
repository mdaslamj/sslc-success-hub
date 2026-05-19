import { useState } from "react";
import { Upload } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { AnswerUploadDialog } from "./answer-upload-dialog";
import type { AnswerAttemptContext } from "@/integrations/firebase/types";

export type UploadAnswerButtonProps = {
  context: AnswerAttemptContext;
  label?: string;
  onSubmitted?: (attemptId: string) => void;
} & Omit<ButtonProps, "onClick">;

/**
 * Drop-in button — opens the answer upload dialog scoped to a given
 * quiz/exam/chapter context. Safe to render anywhere; no layout assumptions.
 */
export function UploadAnswerButton({
  context,
  label = "Upload handwritten answer",
  onSubmitted,
  variant = "outline",
  size = "sm",
  className,
  ...rest
}: UploadAnswerButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        {...rest}
      >
        <Upload className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <AnswerUploadDialog
        open={open}
        onOpenChange={setOpen}
        context={context}
        onSubmitted={onSubmitted}
      />
    </>
  );
}