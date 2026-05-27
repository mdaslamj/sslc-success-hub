import { useQuery } from "@tanstack/react-query";
import { loadChapter } from "@/lib/contentLoader";
import {
  canonicalSubjectRouteId,
  resolveChapterContentSlug,
} from "@/lib/chapter-routes";
import { contentFolderFor } from "@/lib/subject-content-folder";
import {
  normalizeChapterData,
  type NormalizedChapter,
} from "@/lib/normalizeChapterData";

export function useChapterContent(
  rawSubjectId: string,
  rawChapterId: string,
  retryToken = 0,
) {
  const subjectId = canonicalSubjectRouteId(rawSubjectId);
  const folder = contentFolderFor(subjectId);

  return useQuery({
    queryKey: [
      "content",
      "chapter",
      folder ?? "none",
      rawChapterId,
      subjectId,
      retryToken,
    ],
    queryFn: async () => {
      if (!folder) throw new Error("Unsupported subject");
      const chapterId = await resolveChapterContentSlug(folder, rawChapterId);
      const raw = await loadChapter(folder, chapterId);
      return normalizeChapterData(raw) as NormalizedChapter;
    },
    enabled: !!folder,
    staleTime: 60 * 60 * 1000,
  });
}
