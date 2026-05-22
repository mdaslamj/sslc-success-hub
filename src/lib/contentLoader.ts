export const loadManifest = async (subjectId?: string) => {
  // Backwards compatible: no subjectId (or "mathematics"/"math") loads the
  // legacy top-level manifest used by the math pipeline. Other subjects load
  // their per-subject manifest from public/content/chapters/{subjectId}/manifest.json.
  const isMath = !subjectId || subjectId === "mathematics" || subjectId === "math";
  const url = isMath
    ? "/content/manifest.json"
    : `/content/chapters/${subjectId}/manifest.json`;
  const res = await fetch(url);
  return res.json();
};

export const loadChapter = async (subjectId: string, chapterId: string) => {

  const cacheKey = `chapter_${subjectId}_${chapterId}`;

  const cached = localStorage.getItem(cacheKey);

  if (cached) return JSON.parse(cached);

  const res = await fetch(`/content/chapters/${subjectId}/${chapterId}.json`);

  if (!res.ok) throw new Error(`Chapter not found: ${chapterId}`);

  const data = await res.json();

  localStorage.setItem(cacheKey, JSON.stringify(data));

  return data;

};
