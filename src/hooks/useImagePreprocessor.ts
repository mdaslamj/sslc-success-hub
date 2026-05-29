import { useCallback, useState } from "react";
import {
  checkImageQuality,
  preprocessAnswerImage,
  type ImageQualityCheck,
  type PreprocessResult,
} from "@/lib/imagePreprocessor";

export function useImagePreprocessor() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkQuality = useCallback(async (file: File): Promise<ImageQualityCheck | null> => {
    setError(null);
    try {
      return await checkImageQuality(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quality check failed");
      return null;
    }
  }, []);

  const preprocess = useCallback(async (file: File): Promise<PreprocessResult | null> => {
    setBusy(true);
    setError(null);
    try {
      return await preprocessAnswerImage(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preprocessing failed");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    setBusy(false);
    setError(null);
  }, []);

  return { busy, error, checkQuality, preprocess, reset };
}
