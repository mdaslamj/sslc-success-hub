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

// --- Canvas-based upload editor (rotation / brightness / contrast) ---

export type CanvasPreprocessOptions = {
  rotation: 0 | 90 | 180 | 270;
  brightness: number;
  contrast: number;
  maxEdge?: number;
  quality?: number;
};

export type CanvasProcessedImage = {
  blob: Blob;
  width: number;
  height: number;
  dataUrl: string;
};

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function preprocessCanvasImage(
  srcDataUrl: string,
  opts: CanvasPreprocessOptions,
): Promise<CanvasProcessedImage> {
  const img = await loadImage(srcDataUrl);
  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.85;

  let { naturalWidth: srcW, naturalHeight: srcH } = img;
  const long = Math.max(srcW, srcH);
  if (long > maxEdge) {
    const k = maxEdge / long;
    srcW = Math.round(srcW * k);
    srcH = Math.round(srcH * k);
  }

  const swap = opts.rotation === 90 || opts.rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? srcH : srcW;
  canvas.height = swap ? srcW : srcH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.filter = `brightness(${opts.brightness}) contrast(${opts.contrast})`;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((opts.rotation * Math.PI) / 180);
  ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality,
    ),
  );
  return { blob, width: canvas.width, height: canvas.height, dataUrl };
}

export const DEFAULT_CANVAS_PREPROCESSING: CanvasPreprocessOptions = {
  rotation: 0,
  brightness: 1,
  contrast: 1,
};

export const AUTO_ENHANCE: Partial<CanvasPreprocessOptions> = {
  brightness: 1.1,
  contrast: 1.2,
};
