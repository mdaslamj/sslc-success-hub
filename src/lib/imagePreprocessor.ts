import imageCompression from "browser-image-compression";

export interface PreprocessResult {
  processedFile: File;
  originalSize: number;
  processedSize: number;
  quality: "good" | "acceptable" | "poor";
  warnings: string[];
}

export interface ImageQualityCheck {
  passed: boolean;
  warnings: string[];
  score: number;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
  initialQuality: 0.85,
};

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = objectUrl;
  });
}

function qualityTier(score: number): PreprocessResult["quality"] {
  if (score >= 80) return "good";
  if (score >= 50) return "acceptable";
  return "poor";
}

export async function checkImageQuality(file: File): Promise<ImageQualityCheck> {
  const warnings: string[] = [];
  let score = 100;

  if (file.size < 100 * 1024) {
    warnings.push("Image may be too low resolution");
    score -= 30;
  }

  const dimensions = await getImageDimensions(file);
  if (dimensions.width < 800 || dimensions.height < 600) {
    warnings.push("Hold phone steady and closer to page");
    score -= 25;
  }

  const ratio = dimensions.height / dimensions.width;
  if (ratio < 1.2) {
    warnings.push("Rotate phone to portrait orientation");
    score -= 20;
  }

  return { passed: score >= 50, warnings, score };
}

export async function preprocessAnswerImage(file: File): Promise<PreprocessResult> {
  const originalSize = file.size;
  const qualityCheck = await checkImageQuality(file);
  const warnings = [...qualityCheck.warnings];

  const processedFile = await imageCompression(file, COMPRESSION_OPTIONS);
  const processedSize = processedFile.size;

  if (processedSize > originalSize * 1.05) {
    warnings.push("Could not reduce file size — using best available quality");
  }

  return {
    processedFile,
    originalSize,
    processedSize,
    quality: qualityTier(qualityCheck.score),
    warnings,
  };
}

export async function preprocessPages(
  files: File[],
  onProgress?: (current: number, total: number) => void,
): Promise<PreprocessResult[]> {
  const results: PreprocessResult[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    results.push(await preprocessAnswerImage(files[i]!));
  }
  return results;
}

/** Alias used by the paper-evaluation pipeline. */
export const preprocessImage = preprocessAnswerImage;

export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
