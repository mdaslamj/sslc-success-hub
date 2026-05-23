import { createFileRoute } from "@tanstack/react-router";
import ChapterTest from "@/pages/ChapterTest";

export const Route = createFileRoute("/chapter-test")({
  head: () => ({
    meta: [
      { title: "Chapter Test — Aura" },
      { name: "description", content: "Test page for chapter content loader." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    subject: typeof search.subject === "string" ? search.subject : undefined,
    chapter: typeof search.chapter === "string" ? search.chapter : undefined,
  }),
  component: ChapterTest,
});
