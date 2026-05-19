import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubjectDoc, ChapterDoc, LibraryLanguage } from "@/integrations/firebase/types";

export type ResourceFiltersValue = {
  q: string;
  subjectId: string; // "all" | id
  chapterId: string; // "all" | id
  language: "all" | LibraryLanguage;
};

export function ResourceFilters({
  value,
  onChange,
  subjects,
  chapters,
}: {
  value: ResourceFiltersValue;
  onChange: (next: ResourceFiltersValue) => void;
  subjects: SubjectDoc[];
  chapters: ChapterDoc[];
}) {
  const chapterOptions = value.subjectId === "all"
    ? []
    : chapters.filter((c) => c.subjectId === value.subjectId);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="Search resources…"
          className="h-10 rounded-full bg-secondary/60 pl-9"
        />
      </div>

      <Select
        value={value.subjectId}
        onValueChange={(v) =>
          onChange({ ...value, subjectId: v, chapterId: "all" })
        }
      >
        <SelectTrigger className="h-10 rounded-full">
          <SelectValue placeholder="Subject" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All subjects</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.chapterId}
        onValueChange={(v) => onChange({ ...value, chapterId: v })}
        disabled={value.subjectId === "all"}
      >
        <SelectTrigger className="h-10 rounded-full">
          <SelectValue placeholder="Chapter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All chapters</SelectItem>
          {chapterOptions.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.language}
        onValueChange={(v) =>
          onChange({ ...value, language: v as ResourceFiltersValue["language"] })
        }
      >
        <SelectTrigger className="h-10 rounded-full">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All languages</SelectItem>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="kn">Kannada</SelectItem>
          <SelectItem value="bilingual">Bilingual</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
