/**
 * Browser-side image preprocessing for handwritten answer uploads.
 * No external deps — uses canvas + ctx.filter to keep bundle small.
 */

export type PreprocessOptions = {
  rotation: 0 | 90 | 180 | 270;
  brightness: number; // 1 = neutral
  contrast: number; // 1 = neutral
  /** Max long-edge size in px. Larger uploads are downscaled to save bandwidth. */
  maxEdge?: number;
  /** JPEG quality, 0..1. */
  quality?: number;
};

export type ProcessedImage = {
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

/**
 * Apply rotation + brightness/contrast filters and re-encode as JPEG.
 * Returns the processed blob, final dimensions, and a preview data URL.
 */
export async function preprocessImage(
  srcDataUrl: string,
  opts: PreprocessOptions,
): Promise<ProcessedImage> {
  const img = await loadImage(srcDataUrl);
  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.85;

  // Downscale while keeping aspect ratio.
  let { naturalWidth: srcW, naturalHeight: srcH } = img;
  const long = Math.max(srcW, srcH);
  if (long > maxEdge) {
    const k = maxEdge / long;
    srcW = Math.round(srcW * k);
    srcH = Math.round(srcH * k);
  }

  // After rotation, swap dimensions for 90/270.
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

export const DEFAULT_PREPROCESSING: PreprocessOptions = {
  rotation: 0,
  brightness: 1,
  contrast: 1,
};

export const AUTO_ENHANCE: Partial<PreprocessOptions> = {
  brightness: 1.1,
  contrast: 1.2,
};