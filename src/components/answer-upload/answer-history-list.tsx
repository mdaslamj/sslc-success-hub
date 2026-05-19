import { useState } from "react";
import { format } from "date-fns";
import { Eye, FileImage, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAnswerHistory, useAttemptImages } from "@/hooks/use-answer-history";
import type { AnswerAttemptDoc } from "@/integrations/firebase/types";

export function AnswerHistoryList() {
  const { attempts, loading, error, remove } = useAnswerHistory();
  const [viewing, setViewing] = useState<AnswerAttemptDoc | null>(null);

  if (loading && attempts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (attempts.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No uploads yet. Submit handwritten answers from a quiz, exam, or
        chapter practice screen to see them here.
      </Card>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {attempts.map((a) => (
          <li key={a.id}>
            <Card className="flex items-center gap-3 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <FileImage className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {a.context.type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {a.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {a.imageCount} page{a.imageCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {format(new Date(a.createdAt), "PP p")}
                  {a.context.label ? ` · ${a.context.label}` : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setViewing(a)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm("Delete this upload?")) void remove(a);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uploaded answers</DialogTitle>
          </DialogHeader>
          {viewing && <AttemptPreview attemptId={viewing.id} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AttemptPreview({ attemptId }: { attemptId: string }) {
  const { images, loading } = useAttemptImages(attemptId);
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
      </div>
    );
  }
  if (images.length === 0) {
    return <p className="text-sm text-muted-foreground">No images stored.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {images.map((img, i) => (
        <a
          key={img.id}
          href={img.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border bg-muted"
        >
          <img
            src={img.downloadUrl}
            alt={`Page ${i + 1}`}
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}