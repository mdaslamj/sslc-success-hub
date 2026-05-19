import { z } from "zod";

/**
 * Canonical chapter id format: lowercased, alphanumeric + dash/underscore,
 * 2–80 chars. Used everywhere to keep cross-collection joins stable.
 */
export const ChapterIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/i, "Invalid chapter id");

export function normalizeChapterId(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export const SubjectIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z][a-z0-9_-]*$/);

export const UserIdSchema = z.string().trim().min(6).max(128);

/** Upload validation for handwritten-answer images. */
export const ImageUploadSchema = z.object({
  mimeType: z
    .string()
    .refine(
      (m) =>
        ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(
          m.toLowerCase(),
        ),
      "Unsupported image type",
    ),
  /** Max 8 MB. */
  sizeBytes: z.number().int().positive().max(8 * 1024 * 1024),
  width: z.number().int().positive().max(8000).optional(),
  height: z.number().int().positive().max(8000).optional(),
});

export type ImageUpload = z.infer<typeof ImageUploadSchema>;

export function validateChapterRef(input: {
  chapterId: string;
  subjectId: string;
}) {
  return {
    chapterId: ChapterIdSchema.parse(input.chapterId),
    subjectId: SubjectIdSchema.parse(input.subjectId),
  };
}