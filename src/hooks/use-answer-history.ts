import { useCallback, useEffect, useState } from "react";
import {
  deleteAnswerAttempt,
  fetchAttemptImages,
  fetchUserAnswerAttempts,
} from "@/integrations/firebase/services/answer-uploads";
import type {
  AnswerAttemptDoc,
  AnswerUploadDoc,
} from "@/integrations/firebase/types";
import { useAuthOptional } from "@/contexts/auth-context";

export function useAnswerHistory() {
  const auth = useAuthOptional();
  const [attempts, setAttempts] = useState<AnswerAttemptDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!auth?.user) {
      setAttempts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchUserAnswerAttempts(auth.user.uid);
      setAttempts(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [auth?.user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (attempt: AnswerAttemptDoc) => {
      await deleteAnswerAttempt(attempt);
      setAttempts((prev) => prev.filter((a) => a.id !== attempt.id));
    },
    [],
  );

  return { attempts, loading, error, refresh, remove };
}

export function useAttemptImages(attemptId: string | null) {
  const [images, setImages] = useState<AnswerUploadDoc[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      setImages([]);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchAttemptImages(attemptId)
      .then((r) => alive && setImages(r))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [attemptId]);

  return { images, loading };
}