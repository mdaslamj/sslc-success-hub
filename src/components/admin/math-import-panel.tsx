import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  CSV_HEADER_HINTS,
  countPayload,
  deleteMathImportDraft,
  importMath,
  importMathFromSeed,
  listMathImportDrafts,
  parseMathImportCsv,
  parseMathImportJson,
  publishMathImportDraft,
  rejectMathImportDraft,
  saveMathImportDraft,
  validateMathImport,
  type MathImportKind,
} from "@/integrations/firebase/services/math-import";
import type {
  MathImportCounts,
  MathImportDraftDoc,
  MathImportIssue,
  MathImportPayload,
  MathImportSource,
  MathQuestionDoc,
  MathQuestionType,
} from "@/integrations/firebase/types";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; message: string; counts?: MathImportCounts }
  | { kind: "err"; message: string };

const KIND_OPTIONS: MathImportKind[] = [
  "questions",
  "formulas",
  "modelAnswers",
  "keywords",
  "commonMistakes",
];

const Q_TYPES: MathQuestionType[] = [
  "mcq",
  "1mark",
  "2mark",
  "3mark",
  "5mark",
  "hots",
  "competency",
];

function fmtCounts(c: MathImportCounts): string {
  return Object.entries(c)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k}`)
    .join(" · ") || "no records";
}

function IssueList({ issues }: { issues: MathImportIssue[] }) {
  if (issues.length === 0) return null;
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  return (
    <div className="mt-3 space-y-1 text-xs">
      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-semibold text-destructive">{errors.length} error(s)</p>
          <ul className="mt-1 list-inside list-disc text-destructive/90">
            {errors.slice(0, 12).map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="font-semibold text-amber-700">{warnings.length} warning(s)</p>
          <ul className="mt-1 list-inside list-disc text-amber-700/90">
            {warnings.slice(0, 12).map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "ok")
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-xs">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        <p className="text-success">{status.message}</p>
      </div>
    );
  if (status.kind === "err")
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <p className="break-all text-destructive">{status.message}</p>
      </div>
    );
  return null;
}

export function MathImportPanel() {
  const { user } = useAuth();
  const uid = user?.uid;

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Mathematics Data Import</h2>
          <p className="text-sm text-muted-foreground">
            Load PYQs, model answers, formulas, rubrics and keyword banks. Validate
            before publishing; auto-tagging runs at publish.
          </p>
        </div>
      </div>

      <Tabs defaultValue="seed" className="mt-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="seed">Seed</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="csv">CSV</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="seed" className="mt-4">
          <SeedTab uid={uid} />
        </TabsContent>
        <TabsContent value="json" className="mt-4">
          <JsonTab uid={uid} />
        </TabsContent>
        <TabsContent value="csv" className="mt-4">
          <CsvTab uid={uid} />
        </TabsContent>
        <TabsContent value="manual" className="mt-4">
          <ManualTab uid={uid} />
        </TabsContent>
        <TabsContent value="review" className="mt-4">
          <ReviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seed tab
// ---------------------------------------------------------------------------

function SeedTab({ uid }: { uid?: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  async function publish() {
    setStatus({ kind: "loading" });
    try {
      const counts = await importMathFromSeed();
      setStatus({ kind: "ok", message: `Seed published: ${fmtCounts(counts)}.`, counts });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
      <p className="text-sm">
        Publish the built-in Karnataka SSLC Mathematics intelligence preset
        (chapters, formulas, keywords, common mistakes, questions, model
        answers, rubrics) directly into Firestore. Idempotent.
      </p>
      <Button
        onClick={publish}
        disabled={status.kind === "loading" || !uid}
        className="mt-3 rounded-full"
      >
        {status.kind === "loading" ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…</>
        ) : (
          <>Publish Mathematics seed</>
        )}
      </Button>
      <StatusLine status={status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON tab
// ---------------------------------------------------------------------------

function JsonTab({ uid }: { uid?: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [issues, setIssues] = useState<MathImportIssue[]>([]);
  const [payload, setPayload] = useState<MathImportPayload | null>(null);

  function validate() {
    setStatus({ kind: "idle" });
    try {
      const parsed = parseMathImportJson(text);
      const all = [...parsed.issues, ...validateMathImport(parsed.payload)];
      setPayload(parsed.payload);
      setIssues(all);
      const c = countPayload(parsed.payload);
      setStatus({ kind: "ok", message: `Parsed: ${fmtCounts(c)}.`, counts: c });
    } catch (e) {
      setPayload(null);
      setIssues([]);
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  async function publishNow() {
    if (!payload) return;
    setStatus({ kind: "loading" });
    try {
      const c = await importMath(payload);
      setStatus({ kind: "ok", message: `Published: ${fmtCounts(c)}.`, counts: c });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  async function saveDraft() {
    if (!payload) return;
    setStatus({ kind: "loading" });
    try {
      await saveMathImportDraft({
        source: "json",
        createdBy: uid,
        payload,
        counts: countPayload(payload),
        validationIssues: issues,
      });
      setStatus({ kind: "ok", message: "Saved as draft. Approve from the Review tab." });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        MathImportPayload JSON
      </Label>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`{ "questions": [...], "formulas": [...], "modelAnswers": [...] }`}
        className="min-h-[220px] font-mono text-xs"
      />
      <Input
        type="file"
        accept=".json,application/json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
        className="text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={validate} disabled={!text.trim()} className="rounded-full">
          Validate
        </Button>
        <Button
          variant="secondary"
          onClick={saveDraft}
          disabled={!payload || status.kind === "loading"}
          className="rounded-full"
        >
          Save as draft
        </Button>
        <Button
          onClick={publishNow}
          disabled={!payload || status.kind === "loading" || issues.some((i) => i.level === "error")}
          className="rounded-full gap-2"
        >
          <Upload className="h-4 w-4" /> Publish
        </Button>
      </div>
      <IssueList issues={issues} />
      <StatusLine status={status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV tab
// ---------------------------------------------------------------------------

function CsvTab({ uid }: { uid?: string }) {
  const [kind, setKind] = useState<MathImportKind>("questions");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [issues, setIssues] = useState<MathImportIssue[]>([]);
  const [payload, setPayload] = useState<MathImportPayload | null>(null);

  const preview = useMemo(() => {
    if (!payload) return [];
    const arr = (payload[kind] ?? []) as unknown[];
    return arr.slice(0, 5);
  }, [payload, kind]);

  function validate() {
    try {
      const parsed = parseMathImportCsv(text, kind);
      const all = [...parsed.issues, ...validateMathImport(parsed.payload)];
      setPayload(parsed.payload);
      setIssues(all);
      const c = countPayload(parsed.payload);
      setStatus({ kind: "ok", message: `Parsed: ${fmtCounts(c)}.`, counts: c });
    } catch (e) {
      setPayload(null);
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  async function publishNow() {
    if (!payload) return;
    setStatus({ kind: "loading" });
    try {
      const c = await importMath(payload);
      setStatus({ kind: "ok", message: `Published: ${fmtCounts(c)}.`, counts: c });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  async function saveDraft() {
    if (!payload) return;
    setStatus({ kind: "loading" });
    try {
      await saveMathImportDraft({
        source: "csv",
        createdBy: uid,
        payload,
        counts: countPayload(payload),
        validationIssues: issues,
      });
      setStatus({ kind: "ok", message: "Saved as draft." });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as MathImportKind)}>
            <SelectTrigger className="mt-1 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground break-all">
          {CSV_HEADER_HINTS[kind]}
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste CSV with header row…"
        className="min-h-[200px] font-mono text-xs"
      />
      <Input
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
        className="text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={validate} disabled={!text.trim()} className="rounded-full">
          Parse &amp; validate
        </Button>
        <Button
          variant="secondary"
          onClick={saveDraft}
          disabled={!payload || status.kind === "loading"}
          className="rounded-full"
        >
          Save as draft
        </Button>
        <Button
          onClick={publishNow}
          disabled={!payload || status.kind === "loading" || issues.some((i) => i.level === "error")}
          className="rounded-full gap-2"
        >
          <Upload className="h-4 w-4" /> Publish
        </Button>
      </div>
      {preview.length > 0 && (
        <pre className="overflow-auto rounded-xl bg-muted/40 p-3 text-[11px] leading-relaxed">
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
      <IssueList issues={issues} />
      <StatusLine status={status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual tab — one question at a time
// ---------------------------------------------------------------------------

function ManualTab({ uid }: { uid?: string }) {
  const [chapterId, setChapterId] = useState("");
  const [qType, setQType] = useState<MathQuestionType>("1mark");
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [statement, setStatement] = useState("");
  const [options, setOptions] = useState("");
  const [correctOption, setCorrectOption] = useState(0);
  const [boardFrequency, setBoardFrequency] = useState(0);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function buildPayload(): MathImportPayload {
    const opts = options
      ? options.split("|").map((o) => o.trim()).filter(Boolean)
      : undefined;
    const q: MathQuestionDoc = {
      id: `q_${chapterId}_${Date.now()}`,
      subjectId: "math",
      chapterId,
      questionType: qType,
      marks,
      difficulty,
      statement,
      options: qType === "mcq" ? opts : undefined,
      correctOption: qType === "mcq" ? correctOption : undefined,
      requiredFormulaIds: [],
      keywordIds: [],
      metadata: {
        boardFrequency,
        isRepeatedBoardQ: boardFrequency >= 2,
        lastAppearedYears: [],
        isImportant: false,
        commonMistakeIds: [],
        estimatedSolvingTime: marks * 60,
      },
      source: source || undefined,
      tags: [],
      updatedAt: Date.now(),
    };
    return { questions: [q] };
  }

  async function action(kind: "publish" | "draft") {
    setStatus({ kind: "loading" });
    try {
      const payload = buildPayload();
      const issues = validateMathImport(payload);
      if (issues.some((i) => i.level === "error"))
        throw new Error(issues.find((i) => i.level === "error")!.message);
      if (kind === "publish") {
        const c = await importMath(payload);
        setStatus({ kind: "ok", message: `Published 1 question (${fmtCounts(c)}).` });
      } else {
        await saveMathImportDraft({
          source: "manual",
          createdBy: uid,
          payload,
          counts: countPayload(payload),
          validationIssues: issues,
        });
        setStatus({ kind: "ok", message: "Saved as draft." });
      }
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Chapter id</Label>
          <Input
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            placeholder="math_ap"
          />
        </div>
        <div>
          <Label>Source</Label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="KSEEB 2024 Q12"
          />
        </div>
        <div>
          <Label>Question type</Label>
          <Select value={qType} onValueChange={(v) => setQType(v as MathQuestionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Q_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">easy</SelectItem>
              <SelectItem value="medium">medium</SelectItem>
              <SelectItem value="hard">hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Marks</Label>
          <Input
            type="number"
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Board frequency</Label>
          <Input
            type="number"
            value={boardFrequency}
            onChange={(e) => setBoardFrequency(Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Label>Statement</Label>
        <Textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      {qType === "mcq" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Options (pipe-separated)</Label>
            <Input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="A | B | C | D"
            />
          </div>
          <div>
            <Label>Correct option index</Label>
            <Input
              type="number"
              value={correctOption}
              onChange={(e) => setCorrectOption(Number(e.target.value))}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => action("draft")} className="rounded-full">
          Save as draft
        </Button>
        <Button onClick={() => action("publish")} className="rounded-full gap-2">
          <Upload className="h-4 w-4" /> Publish
        </Button>
      </div>
      <StatusLine status={status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review tab
// ---------------------------------------------------------------------------

function ReviewTab() {
  const [drafts, setDrafts] = useState<MathImportDraftDoc[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    try {
      setDrafts(await listMathImportDrafts());
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function onPublish(d: MathImportDraftDoc) {
    setBusyId(d.id);
    try {
      const c = await publishMathImportDraft(d);
      setStatus({ kind: "ok", message: `Published draft ${d.id} (${fmtCounts(c)}).` });
      await refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }
  async function onReject(d: MathImportDraftDoc) {
    setBusyId(d.id);
    try {
      await rejectMathImportDraft(d.id);
      await refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }
  async function onDelete(id: string) {
    setBusyId(id);
    try {
      await deleteMathImportDraft(id);
      await refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  if (drafts === null)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {drafts.length} draft{drafts.length === 1 ? "" : "s"} in queue.
        </p>
        <Button variant="outline" size="sm" onClick={refresh} className="rounded-full">
          Refresh
        </Button>
      </div>
      {drafts.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          No drafts yet. Save imports from JSON / CSV / Manual to review here.
        </p>
      )}
      <ul className="space-y-2">
        {drafts.map((d) => (
          <li
            key={d.id}
            className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{labelForSource(d.source)} · {fmtCounts(d.counts)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.createdAt).toLocaleString()} · status: {d.status}
                  {d.validationIssues.filter((i) => i.level === "error").length > 0 &&
                    ` · ${d.validationIssues.filter((i) => i.level === "error").length} error(s)`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busyId === d.id || d.status !== "pending" ||
                    d.validationIssues.some((i) => i.level === "error")}
                  onClick={() => onPublish(d)}
                  className="rounded-full"
                >
                  {busyId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & publish"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === d.id || d.status !== "pending"}
                  onClick={() => onReject(d)}
                  className="rounded-full"
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === d.id}
                  onClick={() => onDelete(d.id)}
                  className="rounded-full text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <StatusLine status={status} />
    </div>
  );
}

function labelForSource(s: MathImportSource): string {
  switch (s) {
    case "json": return "JSON import";
    case "csv": return "CSV import";
    case "manual": return "Manual entry";
    case "seed": return "Seed";
  }
}