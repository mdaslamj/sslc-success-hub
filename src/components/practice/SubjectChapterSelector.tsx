/**
 * SubjectChapterSelector — Task 4
 *
 * Entry point to practice mode. Flow:
 *   Step 1: Student picks a Subject (Science / Social Science / Maths)
 *   Step 2: Student picks a Chapter within that subject
 *   Step 3: "Start Practice" launches PracticeSession
 *
 * Shows question count per chapter so students know what to expect.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SUBJECTS, getChaptersBySubject, getQuestionsByChapter } from "@/lib/question-bank";
import type { Subject } from "@/lib/question-bank";
import { ChevronRight, BookOpen } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  onStart: (chapterId: string, subjectId: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubjectChapterSelector({ onStart }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const chapters = selectedSubject ? getChaptersBySubject(selectedSubject.id) : [];
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) ?? null;
  const questionCount = selectedChapterId
    ? getQuestionsByChapter(selectedChapterId).length
    : 0;

  const handleStart = () => {
    if (!selectedSubject || !selectedChapterId) return;
    onStart(selectedChapterId, selectedSubject.id);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Practice Mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a subject and chapter to start practising
        </p>
      </div>

      {/* Step 1 — Subject picker */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step 1 — Choose Subject
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SUBJECTS.map((subject) => {
            const isSelected = selectedSubject?.id === subject.id;
            const totalQuestions = subject.chapters.reduce(
              (acc, c) => acc + c.questions.length,
              0,
            );
            return (
              <button
                key={subject.id}
                onClick={() => {
                  setSelectedSubject(subject);
                  setSelectedChapterId(null); // reset chapter on subject change
                }}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                <span className="text-3xl">{subject.icon}</span>
                <div>
                  <p className="font-semibold text-foreground">{subject.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {subject.chapters.length} chapters · {totalQuestions} questions
                  </p>
                </div>
                {isSelected && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 — Chapter picker (shown only after subject selected) */}
      {selectedSubject && (
        <section className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 2 — Choose Chapter
          </h2>
          <div className="flex flex-col gap-2">
            {chapters.map((chapter) => {
              const count = chapter.questions.length;
              const isSelected = selectedChapterId === chapter.id;
              return (
                <button
                  key={chapter.id}
                  onClick={() => setSelectedChapterId(chapter.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  <BookOpen
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {chapter.name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      isSelected
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count} Q
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Step 3 — Start button (shown only after chapter selected) */}
      {selectedChapterId && selectedChapter && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Summary card */}
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{selectedSubject?.icon}</span>
              <div>
                <p className="font-semibold text-foreground">{selectedChapter.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedSubject?.name} · {questionCount} question
                  {questionCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
          >
            Start Practice →
          </button>
        </div>
      )}
    </div>
  );
}
