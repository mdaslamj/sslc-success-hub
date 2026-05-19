import { format } from "date-fns";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileImage,
  Loader2,
  ScanLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAnswerHistory } from "@/hooks/use-answer-history";
import type {
  AnswerAttemptDoc,
  AnswerProcessingState,
} from "@/integrations/firebase/types";

export function AnswerHistoryList() {
  const { attempts, loading, error, remove } = useAnswerHistory();

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
                  <StateBadge state={a.processingState ?? "uploaded"} />
                  <span className="text-xs text-muted-foreground">
                    {a.imageCount} page{a.imageCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {format(new Date(a.createdAt), "PP p")}
                  {a.context.label ? ` · ${a.context.label}` : ""}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link
                  to="/answer-uploads/$attemptId"
                  params={{ attemptId: a.id }}
                >
                  Review
                </Link>
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
  );
}

function StateBadge({ state }: { state: AnswerProcessingState }) {
  switch (state) {
    case "processing":
      return (
        <Badge className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Scanning
        </Badge>
      );
    case "review_required":
      return (
        <Badge variant="outline" className="gap-1">
          <ScanLine className="h-3 w-3" /> Review required
        </Badge>
      );
    case "ready_for_evaluation":
      return (
        <Badge className="gap-1">
          <Sparkles className="h-3 w-3" /> Ready
        </Badge>
      );
    case "evaluated":
      return (
        <Badge className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Evaluated
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="capitalize">
          uploaded
        </Badge>
      );
  }
}