import { useState } from "react";
import { ArrowLeftRight, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subjects } from "@/lib/mock-data";

const DURATION_OPTIONS = [15, 30, 45, 60] as const;

export type CustomTaskInput = {
  subjectName: string;
  chapterName: string;
  durationMin: number;
};

type Props = {
  disabled?: boolean;
  showCustomForm: boolean;
  onSwap: () => void;
  onPush: () => void;
  onToggleCustomForm: () => void;
  onSaveCustom: (input: CustomTaskInput) => void;
};

export function TaskOverrideBar({
  disabled,
  showCustomForm,
  onSwap,
  onPush,
  onToggleCustomForm,
  onSaveCustom,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Override
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 rounded-full px-2.5 text-xs"
          disabled={disabled}
          onClick={onSwap}
          title="Swap for next priority chapter"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Swap
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 rounded-full px-2.5 text-xs"
          disabled={disabled}
          onClick={onPush}
          title="Push to tomorrow"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Tomorrow
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 rounded-full px-2.5 text-xs"
          disabled={disabled}
          onClick={onToggleCustomForm}
          title="Add your own task"
        >
          <Plus className="h-3.5 w-3.5" />
          Own task
        </Button>
      </div>

      {showCustomForm && (
        <CustomTaskForm onSave={onSaveCustom} onCancel={onToggleCustomForm} />
      )}
    </div>
  );
}

function CustomTaskForm({
  onSave,
  onCancel,
}: {
  onSave: (input: CustomTaskInput) => void;
  onCancel: () => void;
}) {
  const [subjectName, setSubjectName] = useState(subjects[0]?.name ?? "Mathematics");
  const [chapterName, setChapterName] = useState("");
  const [durationMin, setDurationMin] = useState<number>(30);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-3">
      <p className="text-xs font-medium text-foreground">Add your own session</p>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={subjectName}
        onChange={(e) => setSubjectName(e.target.value)}
      >
        {subjects.map((s) => (
          <option key={s.id} value={s.name}>
            {s.emoji} {s.name}
          </option>
        ))}
      </select>
      <Input
        placeholder="Chapter name"
        value={chapterName}
        onChange={(e) => setChapterName(e.target.value)}
        className="h-9"
      />
      <div className="flex flex-wrap gap-1.5">
        {DURATION_OPTIONS.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => setDurationMin(min)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              durationMin === min
                ? "border-brand bg-brand/10 text-brand"
                : "border-border/60 text-muted-foreground hover:border-brand/40"
            }`}
          >
            {min} min
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1 rounded-full"
          disabled={!chapterName.trim()}
          onClick={() =>
            onSave({
              subjectName,
              chapterName: chapterName.trim(),
              durationMin,
            })
          }
        >
          Save task
        </Button>
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
