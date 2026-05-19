import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AdminGate } from "@/components/admin-gate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle2, AlertTriangle, Loader2, FileJson } from "lucide-react";
import { importSyllabus, parseSyllabusJson } from "@/integrations/firebase/services/syllabus-import";
import { KARNATAKA_SSLC } from "@/integrations/firebase/syllabus/sslc-karnataka";
import { KARNATAKA_SSLC_MATH } from "@/integrations/firebase/syllabus/sslc-math";
import {
  bulkUpsertLibraryCategories,
  bulkUpsertLibraryResources,
} from "@/integrations/firebase/services/library-resources";
import {
  DEFAULT_LIBRARY_CATEGORIES,
  STARTER_LIBRARY_RESOURCES,
} from "@/lib/resource-seed";
import {
  KTBS_TEXTBOOK_SEED,
  KTBS_TEXTBOOK_SUBJECTS,
} from "@/lib/ktbs-textbook-seed";
import type { LibraryResourceDoc } from "@/integrations/firebase/types";

export const Route = createFileRoute("/admin/import")({
  head: () => ({ meta: [{ title: "Syllabus Import — Admin" }] }),
  component: GuardedAdminImportPage,
});

function GuardedAdminImportPage() {
  return (
    <AdminGate title="Syllabus Import">
      <AdminImportPage />
    </AdminGate>
  );
}

function AdminImportPage() {
  const [json, setJson] = useState("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "success"; subjects: number; chapters: number; resources: number; board: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [libraryJson, setLibraryJson] = useState("");
  const [libState, setLibState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function runPreset() {
    setState({ kind: "loading" });
    try {
      const r = await importSyllabus(KARNATAKA_SSLC);
      setState({ kind: "success", ...r, board: KARNATAKA_SSLC.board });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  async function runMathPreset() {
    setState({ kind: "loading" });
    try {
      const r = await importSyllabus(KARNATAKA_SSLC_MATH);
      setState({ kind: "success", ...r, board: KARNATAKA_SSLC_MATH.board });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  async function runJson() {
    setState({ kind: "loading" });
    try {
      const payload = parseSyllabusJson(json);
      const r = await importSyllabus(payload);
      setState({ kind: "success", ...r, board: payload.board });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  async function seedLibraryDefaults() {
    setLibState({ kind: "loading" });
    try {
      const cats = await bulkUpsertLibraryCategories(DEFAULT_LIBRARY_CATEGORIES);
      const res = await bulkUpsertLibraryResources(STARTER_LIBRARY_RESOURCES);
      setLibState({
        kind: "success",
        message: `Seeded ${cats} categories and ${res} starter resources.`,
      });
    } catch (e) {
      setLibState({ kind: "error", message: (e as Error).message });
    }
  }

  async function seedKtbsTextbooks() {
    setLibState({ kind: "loading" });
    try {
      const n = await bulkUpsertLibraryResources(KTBS_TEXTBOOK_SEED);
      setLibState({
        kind: "success",
        message: `Seeded ${n} KTBS textbook chapter links.`,
      });
    } catch (e) {
      setLibState({ kind: "error", message: (e as Error).message });
    }
  }

  async function runLibraryJson() {
    setLibState({ kind: "loading" });
    try {
      const parsed = JSON.parse(libraryJson) as LibraryResourceDoc[];
      if (!Array.isArray(parsed))
        throw new Error("Expected an array of library resources.");
      const n = await bulkUpsertLibraryResources(parsed);
      setLibState({ kind: "success", message: `Imported ${n} resources.` });
    } catch (e) {
      setLibState({ kind: "error", message: (e as Error).message });
    }
  }

  function loadPreset() {
    setJson(JSON.stringify(KARNATAKA_SSLC, null, 2));
  }

  return (
    <DashboardLayout title="Syllabus Import">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-brand-foreground">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Syllabus Import</h1>
              <p className="text-sm text-muted-foreground">
                Bulk-load subjects, chapters and resource links into Firestore. Idempotent.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick preset
            </div>
            <p className="mt-1 text-sm">
              <span className="font-semibold">{KARNATAKA_SSLC.board}</span> —{" "}
              {KARNATAKA_SSLC.subjects.length} subjects,{" "}
              {KARNATAKA_SSLC.subjects.reduce((n, s) => n + s.chapters.length, 0)} chapters.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={runPreset} disabled={state.kind === "loading"} className="rounded-full">
                {state.kind === "loading" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <>Import Karnataka SSLC</>
                )}
              </Button>
              <Button onClick={loadPreset} variant="outline" className="rounded-full gap-2">
                <FileJson className="h-4 w-4" /> Load preset as JSON
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Detailed Mathematics preset
            </div>
            <p className="mt-1 text-sm">
              <span className="font-semibold">{KARNATAKA_SSLC_MATH.board}</span> —{" "}
              {KARNATAKA_SSLC_MATH.subjects[0].chapters.length} chapters with topics,
              formulas & learning objectives.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={runMathPreset}
                disabled={state.kind === "loading"}
                variant="secondary"
                className="rounded-full"
              >
                {state.kind === "loading" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <>Import Mathematics (detailed)</>
                )}
              </Button>
              <Button
                onClick={() => setJson(JSON.stringify(KARNATAKA_SSLC_MATH, null, 2))}
                variant="outline"
                className="rounded-full gap-2"
              >
                <FileJson className="h-4 w-4" /> Load Math JSON
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Custom syllabus JSON
            </label>
            <Textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder='{ "board": "...", "subjects": [ { "id": "...", "name": "...", "emoji": "...", "color": "...", "chapters": [ { "chapterNumber": 1, "chapterName": "..." } ] } ] }'
              className="mt-2 min-h-[240px] font-mono text-xs"
            />
            <Button
              onClick={runJson}
              disabled={state.kind === "loading" || !json.trim()}
              variant="secondary"
              className="mt-3 rounded-full"
            >
              Import from JSON
            </Button>
          </div>

          {state.kind === "success" && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-success/30 bg-success/5 p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="font-semibold text-success">Imported {state.board}</p>
                <p className="text-muted-foreground">
                  {state.subjects} subjects · {state.chapters} chapters · {state.resources} resources
                </p>
              </div>
            </div>
          )}

          {state.kind === "error" && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Import failed</p>
                <p className="text-muted-foreground break-all">{state.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-6 text-sm">
          <h2 className="font-display text-lg font-semibold">Expected schema</h2>
          <pre className="mt-3 overflow-auto rounded-xl bg-muted/40 p-4 text-xs leading-relaxed">{`{
  "board": "Karnataka SSLC",
  "subjects": [
    {
      "id": "math",
      "name": "Mathematics",
      "nameKn": "ಗಣಿತ",
      "emoji": "📐",
      "color": "oklch(0.6 0.18 250)",
      "target": 95,
      "chapters": [
        {
          "chapterNumber": 1,
          "chapterName": "Real Numbers",
          "difficulty": "Easy",
          "estimatedStudyTime": 150,
          "mcqCount": 15,
          "textbookUrl": "https://…/textbook.pdf",
          "notesUrl": "https://…/notes.pdf",
          "worksheetUrl": "https://…/worksheet.pdf",
          "videoUrls": ["https://youtu.be/…"]
        }
      ]
    }
  ]
}`}</pre>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-card">
          <h2 className="font-display text-xl font-bold">Library Resources</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seed default categories and starter resources, or bulk-import a
            custom JSON array of library items.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={seedLibraryDefaults}
              disabled={libState.kind === "loading"}
              className="rounded-full"
            >
              {libState.kind === "loading" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding…</>
              ) : (
                <>Seed default library</>
              )}
            </Button>
            <Button
              onClick={seedKtbsTextbooks}
              disabled={libState.kind === "loading"}
              variant="secondary"
              className="rounded-full"
            >
              {libState.kind === "loading" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding…</>
              ) : (
                <>
                  Seed KTBS textbooks (
                  {KTBS_TEXTBOOK_SUBJECTS.reduce((n, s) => n + s.chapters, 0)} chapters
                  )
                </>
              )}
            </Button>
          </div>

          <div className="mt-6">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Custom library JSON (array of LibraryResourceDoc)
            </label>
            <Textarea
              value={libraryJson}
              onChange={(e) => setLibraryJson(e.target.value)}
              placeholder='[{ "id": "...", "title": "...", "category": "textbook", "language": "en", "tags": [], "isFeatured": false, "isOfficial": true, "url": "..." }]'
              className="mt-2 min-h-[200px] font-mono text-xs"
            />
            <Button
              onClick={runLibraryJson}
              disabled={libState.kind === "loading" || !libraryJson.trim()}
              variant="secondary"
              className="mt-3 rounded-full"
            >
              Import library JSON
            </Button>
          </div>

          {libState.kind === "success" && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-success/30 bg-success/5 p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <p className="font-semibold text-success">{libState.message}</p>
            </div>
          )}
          {libState.kind === "error" && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="font-semibold text-destructive break-all">
                {libState.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}