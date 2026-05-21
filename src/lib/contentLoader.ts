export const loadManifest = async () => {

  const res = await fetch("/content/manifest.json");

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
