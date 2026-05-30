import { CheckCircle2, Loader2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadRosterTemplate } from "@/lib/rosterTemplate";
import { getSchoolStudents } from "@/lib/schoolService";
import type { SchoolStudent } from "@/types/school";

export type ParsedRosterRow = {
  rollNumber: string;
  csvName: string;
  subject?: string;
};

export type RosterMatchRow = {
  rollNumber: string;
  csvName: string;
  auraUid: string | null;
  auraName: string | null;
  confirmed: boolean;
};

const ROLL_COLUMN_KEYS = ["roll_number", "roll", "no", "roll_no", "rollno"];
const NAME_COLUMN_KEYS = ["name", "student_name", "student", "studentname", "full_name"];

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumnKey(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.findIndex(
      (h) => h === candidate || h.replace(/_/g, "") === candidate.replace(/_/g, ""),
    );
    if (idx >= 0) return headers[idx]!;
  }
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate));
    if (idx >= 0) return headers[idx]!;
  }
  return null;
}

function cellValue(row: Record<string, unknown>, key: string | null): string {
  if (!key) return "";
  const raw = row[key];
  if (raw == null) return "";
  return String(raw).trim();
}

function mapRecordsToRows(records: Record<string, unknown>[]): ParsedRosterRow[] {
  if (records.length === 0) return [];
  const headers = Object.keys(records[0] ?? {});
  const rollKey = findColumnKey(headers, ROLL_COLUMN_KEYS);
  const nameKey = findColumnKey(headers, NAME_COLUMN_KEYS);

  if (!rollKey || !nameKey) {
    throw new Error("Could not find Roll Number and Student Name columns in your file.");
  }

  return records
    .map((row) => ({
      rollNumber: cellValue(row, rollKey),
      csvName: cellValue(row, nameKey),
    }))
    .filter((row) => row.rollNumber && row.csvName);
}

function parseCsvText(text: string): ParsedRosterRow[] {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0]?.message ?? "Failed to parse CSV file.");
  }

  return mapRecordsToRows(result.data);
}

export async function parseRosterFile(file: File): Promise<ParsedRosterRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const text = await file.text();
    return parseCsvText(text);
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("The spreadsheet has no sheets.");
    }
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return parseCsvText(csv);
  }

  throw new Error("Please upload a .csv or .xlsx file.");
}

function namesMatch(csvName: string, auraName: string): boolean {
  const a = normalizeName(csvName);
  const b = normalizeName(auraName);
  if (!a || !b) return false;
  if (a === b) return true;
  const firstA = a.split(" ")[0] ?? "";
  const firstB = b.split(" ")[0] ?? "";
  if (firstA.length >= 2 && firstA === firstB) return true;
  return a.includes(b) || b.includes(a);
}

function findAuraMatch(csvName: string, students: SchoolStudent[]): SchoolStudent | null {
  const exact = students.find((s) => normalizeName(s.name) === normalizeName(csvName));
  if (exact) return exact;

  const fuzzy = students.filter((s) => namesMatch(csvName, s.name));
  if (fuzzy.length === 1) return fuzzy[0]!;
  return null;
}

export async function matchRosterToStudents(
  schoolId: string,
  rows: ParsedRosterRow[],
): Promise<RosterMatchRow[]> {
  const students = await getSchoolStudents(schoolId);

  return rows.map((row) => {
    const match = findAuraMatch(row.csvName, students);
    return {
      rollNumber: row.rollNumber,
      csvName: row.csvName,
      auraUid: match?.uid ?? null,
      auraName: match?.name ?? null,
      confirmed: Boolean(match),
    };
  });
}

export { downloadRosterTemplate };

const SAMPLE_ROWS = [
  { roll: "001", name: "Arjun Kumar" },
  { roll: "002", name: "Priya Sharma" },
  { roll: "003", name: "Mohammed Aslam" },
];

type RosterUploadProps = {
  parsing: boolean;
  onFileSelect: (file: File) => void;
};

export function RosterUploadStep({ parsing, onFileSelect }: RosterUploadProps) {
  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="space-y-6 fade-in">
      <p className="text-sm text-white/70">
        Download our roster template or use your existing Excel/CSV file.
      </p>

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
        onClick={downloadRosterTemplate}
      >
        Download roster template (.csv)
      </Button>

      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-[#14141F] px-6 py-12 text-center transition-colors hover:border-[#8B5CF6]/50"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          disabled={parsing}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {parsing ? (
          <p className="text-sm text-white/70">Reading file…</p>
        ) : (
          <>
            <p className="text-sm font-medium text-white">Drop your roster file here or tap to browse</p>
            <p className="mt-2 text-xs text-white/55">Accepts .csv and .xlsx</p>
          </>
        )}
      </label>

      <div className="rounded-xl border border-white/10 bg-[#14141F] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Sample format</p>
        <div
          className="mt-3 space-y-1 text-sm text-white/80"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {SAMPLE_ROWS.map((row) => (
            <p key={row.roll}>
              {row.roll} | {row.name}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

type RosterPreviewProps = {
  schoolCode: string;
  matches: RosterMatchRow[];
  schoolStudents: SchoolStudent[];
  saving: boolean;
  onChangeMatch: (rollNumber: string, auraUid: string | null, auraName: string | null) => void;
  onSave: (skipUnmatched: boolean) => void;
};

export function RosterPreviewStep({
  schoolCode,
  matches,
  schoolStudents,
  saving,
  onChangeMatch,
  onSave,
}: RosterPreviewProps) {
  const matchedCount = matches.filter((m) => m.auraUid && m.confirmed).length;
  const unmatchedCount = matches.filter((m) => !m.auraUid).length;

  const usedUids = new Set(
    matches.filter((m) => m.auraUid && m.confirmed).map((m) => m.auraUid!),
  );

  return (
    <div className="space-y-6 fade-in">
      <p className="text-sm text-white/80">
        We found <strong className="text-white">{matches.length}</strong> students in your file.
        Match them to their Aura accounts.
      </p>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[#14141F] text-xs uppercase tracking-wide text-white/55">
            <tr>
              <th className="px-3 py-2.5">Roll No</th>
              <th className="px-3 py-2.5">Name in roster</th>
              <th className="px-3 py-2.5">Aura account found</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((row) => {
              const availableStudents = schoolStudents.filter(
                (s) => !usedUids.has(s.uid) || s.uid === row.auraUid,
              );

              return (
                <tr key={row.rollNumber} className="border-t border-white/10">
                  <td
                    className="px-3 py-3 font-medium text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {row.rollNumber}
                  </td>
                  <td className="px-3 py-3 text-white/85">{row.csvName}</td>
                  <td className="px-3 py-3">
                    {row.auraUid && row.confirmed ? (
                      <span className="inline-flex items-center gap-1.5 text-green-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {row.auraName}
                      </span>
                    ) : (
                      <span className="text-amber-300">
                        Not on Aura yet
                        <span className="mt-0.5 block text-xs text-amber-200/80">
                          Student needs to join with school code {schoolCode}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {row.auraUid && row.confirmed ? (
                      <Select
                        value={row.auraUid}
                        onValueChange={(uid) => {
                          const student = schoolStudents.find((s) => s.uid === uid);
                          onChangeMatch(row.rollNumber, uid, student?.name ?? null);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[130px] rounded-lg border-white/10 bg-[#14141F] text-xs text-white">
                          <SelectValue placeholder="Change" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStudents.map((s) => (
                            <SelectItem key={s.uid} value={s.uid}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-white/45">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.08)] px-4 py-3 text-sm text-white/80">
        <strong className="text-white">{matchedCount}</strong> matched ·{" "}
        <strong className="text-amber-200">{unmatchedCount}</strong> not on Aura yet
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          disabled={saving || matchedCount === 0}
          className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
          onClick={() => onSave(false)}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save confirmed matches"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          className="w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
          onClick={() => onSave(true)}
        >
          Skip unmatched for now
        </Button>
      </div>
    </div>
  );
}
