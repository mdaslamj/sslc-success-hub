import { useCallback } from "react";
import {
  processBatchSubmissions,
  runMarkSubmissionPipeline,
  type MarkProcessingResult,
  type MarkSubmission,
} from "@/lib/unitTestMasteryBridge";

export type SubmitMarkProgress = {
  current: number;
  total: number;
  studentUid: string;
};

export function useMarkSubmission() {
  const submitMark = useCallback(
    async (submission: MarkSubmission): Promise<MarkProcessingResult> => {
      const { result } = await runMarkSubmissionPipeline(submission);
      return result;
    },
    [],
  );

  const submitMarks = useCallback(
    async (
      submissions: MarkSubmission[],
      onProgress?: (progress: SubmitMarkProgress) => void,
    ): Promise<MarkProcessingResult[]> => {
      return processBatchSubmissions(submissions, (progress) => {
        onProgress?.({
          current: progress.current,
          total: progress.total,
          studentUid: progress.studentUid,
        });
      });
    },
    [],
  );

  return { submitMark, submitMarks };
}
