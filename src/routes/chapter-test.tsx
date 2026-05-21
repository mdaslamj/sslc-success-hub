import { createFileRoute } from "@tanstack/react-router";
import ChapterTest from "@/pages/ChapterTest";

export const Route = createFileRoute("/chapter-test")({
  head: () => ({
    meta: [
      { title: "Chapter Test — Real Numbers" },
      { name: "description", content: "Test page for chapter content loader." },
    ],
  }),
  component: ChapterTest,
});
