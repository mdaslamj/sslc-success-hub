import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadChapter } from "@/lib/contentLoader";

interface MCQ {
  id: string;
  question: string;
  options: string[];
}

interface Chapter {
  title: string;
  summary: string;
  learningPoints?: string[];
  mcqs: MCQ[];
}

export default function ChapterTest() {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChapter("mathematics", "real-numbers")
      .then(setChapter)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="p-6 text-destructive">Error: {error}</div>;
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{chapter.title}</h1>
        <p className="text-muted-foreground">{chapter.summary}</p>
      </header>

      {chapter.learningPoints && chapter.learningPoints.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Learning Points</h2>
          <ul className="list-disc pl-6 space-y-1">
            {chapter.learningPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">MCQs ({chapter.mcqs.length})</h2>
        <ol className="space-y-4 list-decimal pl-6">
          {chapter.mcqs.map((mcq) => (
            <li key={mcq.id} className="space-y-2">
              <p className="font-medium">{mcq.question}</p>
              <ul className="space-y-1 pl-4">
                {mcq.options.map((opt, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {String.fromCharCode(65 + i)}. {opt}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}