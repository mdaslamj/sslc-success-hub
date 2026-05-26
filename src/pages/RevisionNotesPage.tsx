/**
 * RevisionNotesPage — Task 12
 * Route: /revision
 *
 * Chapter-wise quick revision summaries for all subjects.
 * Students can browse by subject or search by chapter name.
 */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { REVISION_NOTES } from "@/lib/revision-notes";
import type { RevisionNote } from "@/lib/revision-notes";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, Search, Lightbulb, Star, Target } from "lucide-react";

// ---------------------------------------------------------------------------
// Subject filter tabs
// ---------------------------------------------------------------------------

const SUBJECTS = ["All", "Mathematics", "Science", "Social Science"];

// ---------------------------------------------------------------------------
// NoteCard component
// ---------------------------------------------------------------------------

function NoteCard({
  note,
  onClick,
}: {
  note: RevisionNote;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-muted/40 shadow-soft"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{note.subjectIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{note.subject}</p>
          <p className="font-semibold text-foreground truncate">{note.chapterName}</p>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {note.keyPoints[0]}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// NoteDetail component
// ---------------------------------------------------------------------------

function NoteDetail({
  note,
  onBack,
}: {
  note: RevisionNote;
  onBack: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="mb-4 text-sm text-primary font-medium"
        >
          ← Back to notes
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{note.subjectIcon}</span>
          <div>
            <p className="text-xs text-muted-foreground">{note.subject}</p>
            <h1 className="text-xl font-bold text-foreground">{note.chapterName}</h1>
          </div>
        </div>
      </div>

      {/* Key Points */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Key Points</h2>
        </div>
        <ul className="space-y-2">
          {note.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Formulas */}
      {note.formulas && note.formulas.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📐</span>
            <h2 className="font-semibold text-foreground">Formulas</h2>
          </div>
          <ul className="space-y-2">
            {note.formulas.map((f, i) => (
              <li
                key={i}
                className="rounded-lg bg-white dark:bg-blue-900/40 px-3 py-2 font-mono text-sm text-foreground border border-blue-200 dark:border-blue-700"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Must Remember */}
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-yellow-600" />
          <h2 className="font-semibold text-foreground">Must Remember</h2>
        </div>
        <ul className="space-y-2">
          {note.mustRemember.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm font-medium text-foreground">
              <span className="mt-0.5 text-yellow-600">★</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Exam Tip */}
      <div className="rounded-2xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-green-600" />
          <h2 className="font-semibold text-foreground">Exam Tip</h2>
        </div>
        <p className="text-sm text-foreground">{note.examTip}</p>
      </div>

      {/* Practice button */}
      <button
        onClick={() => navigate({
          to: "/practice",
          search: { chapter: note.chapterId },
        })}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
      >
        Practice This Chapter →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function RevisionNotesPage() {
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<RevisionNote | null>(null);

  const filtered = REVISION_NOTES.filter((note) => {
    const matchSubject = selectedSubject === "All" || note.subject === selectedSubject;
    const matchSearch = searchQuery === "" ||
      note.chapterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchSearch;
  });

  if (selectedNote) {
    return (
      <DashboardLayout title={selectedNote.chapterName}>
        <NoteDetail note={selectedNote} onBack={() => setSelectedNote(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Revision Notes">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revision Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quick summaries for every chapter — read before you practice
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Subject filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
                selectedSubject === subject
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {subject}
            </button>
          ))}
        </div>

        {/* Notes count */}
        <p className="text-xs text-muted-foreground">
          {filtered.length} chapter{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Notes grid */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
              No notes found for "{searchQuery}"
            </div>
          ) : (
            filtered.map((note) => (
              <NoteCard
                key={note.chapterId}
                note={note}
                onClick={() => setSelectedNote(note)}
              />
            ))
          )}
        </div>

        {/* Quick practice link */}
        <Link to="/practice">
          <button className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition">
            Go to Practice Mode →
          </button>
        </Link>
      </div>
    </DashboardLayout>
  );
}
