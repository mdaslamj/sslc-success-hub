import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AnswerHistoryList } from "@/components/answer-upload/answer-history-list";
import { UploadAnswerButton } from "@/components/answer-upload/upload-answer-button";

export const Route = createFileRoute("/answer-uploads")({
  head: () => ({
    meta: [
      { title: "My Answers — VidyaPath" },
      {
        name: "description",
        content:
          "Upload, store and review your handwritten answer sheets — ready for AI evaluation.",
      },
    ],
  }),
  component: AnswerUploadsPage,
});

function AnswerUploadsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Answer Uploads</h1>
            <p className="text-sm text-muted-foreground">
              Scan or photograph your handwritten answers. We store them
              securely and prepare them for AI evaluation.
            </p>
          </div>
          <UploadAnswerButton
            context={{ type: "freeform", label: "Freeform upload" }}
            label="New upload"
            variant="default"
            size="default"
          />
        </div>
        <AnswerHistoryList />
      </div>
    </DashboardLayout>
  );
}