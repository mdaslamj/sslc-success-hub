import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  buildRosterLookupMap,
  getSchoolRosterEntries,
  normalizeRollNumber,
} from "@/lib/schoolService";
import {
  computeMasteryFromMarks,
  getChapterMasteryFromProfile,
  scorePercentFromMarks,
} from "@/lib/unitTestMasteryBridge";
import { readCloudProfile } from "@/hooks/useStudentProfile";
import type { SchoolRosterEntry } from "@/types/school";

export type ParsedMarksRow = {
  rollNumber: string;
  name: string;
  scoredMarks: number;
  questionMarks?: Record<string, number>;
};

export type MarksRosterMatch = {
  auraUid: string;
  auraName: string;
  rosterName: string;
};

export type MarksPreviewRow = ParsedMarksRow & {
  rosterMatch: MarksRosterMatch | null;
  previousMastery: number;
  newMastery: number;
  scorePercent: number;
};

const ROLL_COLUMN_KEYS = [
  "roll_number",
  "roll_no",
  "roll",
  "no",
  "number",
  "rollno",
  "रोल",
];
const NAME_COLUMN_KEYS = ["name", "student_name", "student", "studentname", "full_name", "नाम"];
const MARKS_COLUMN_KEYS = [
  "marks_obtained",
  "marks",
  "total_marks",
  "total",
  "obtained",
  "score",
  "marks_obtained",
];

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
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

function isQuestionColumn(header: string): boolean {
  const h = normalizeHeader(header);
  return /^q\d+$/.test(h) || /^question\d+$/.test(h) || /^q_\d+$/.test(h);
}

function questionIdFromHeader(header: string): string {
  const h = normalizeHeader(header);
  const match = h.match(/(\d+)/);
  return match ? `Q${match[1]}` : header.trim();
}

function parseNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function cellValue(row: Record<string, unknown>, key: string | null): string {
  if (!key) return "";
  const raw = row[key];
  if (raw == null) return "";
  return String(raw).trim();
}

function mapRecordsToRows(records: Record<string, unknown>[]): ParsedMarksRow[] {
  if (records.length === 0) return [];

  const headers = Object.keys(records[0] ?? {});
  const rollKey = findColumnKey(headers, ROLL_COLUMN_KEYS);
  const nameKey = findColumnKey(headers, NAME_COLUMN_KEYS);
  const marksKey = findColumnKey(headers, MARKS_COLUMN_KEYS);
  const questionKeys = headers.filter(isQuestionColumn);

  if (!rollKey || !nameKey) {
    throw new Error("Could not find Roll Number and Student Name columns in your file.");
  }

  const rows: ParsedMarksRow[] = [];

  for (const row of records) {
    const rollNumber = cellValue(row, rollKey);
    const name = cellValue(row, nameKey);
    if (!rollNumber || !name) continue;

    let scoredMarks = parseNumeric(marksKey ? row[marksKey] : null);
    const questionMarks: Record<string, number> = {};

    for (const qKey of questionKeys) {
      const val = parseNumeric(row[qKey]);
      if (val != null) {
        questionMarks[questionIdFromHeader(qKey)] = val;
      }
    }

    if (scoredMarks == null && Object.keys(questionMarks).length > 0) {
      scoredMarks = Object.values(questionMarks).reduce((sum, v) => sum + v, 0);
    }

    if (scoredMarks == null) continue;

    rows.push({
      rollNumber,
      name,
      scoredMarks,
      ...(Object.keys(questionMarks).length > 0 ? { questionMarks } : {}),
    });
  }

  return rows;
}

function parseCsvText(text: string): ParsedMarksRow[] {
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

export async function parseMarksFile(file: File): Promise<ParsedMarksRow[]> {
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

export async function loadRosterLookup(schoolId: string): Promise<Map<string, SchoolRosterEntry>> {
  const entries = await getSchoolRosterEntries(schoolId);
  return buildRosterLookupMap(entries);
}

export function matchRowToRoster(
  row: ParsedMarksRow,
  rosterMap: Map<string, SchoolRosterEntry>,
): MarksRosterMatch | null {
  const key = normalizeRollNumber(row.rollNumber);
  const entry = rosterMap.get(key);
  if (!entry?.auraUid) return null;

  return {
    auraUid: entry.auraUid,
    auraName: entry.studentName,
    rosterName: entry.studentName,
  };
}

async function loadPreviousMastery(
  studentUid: string,
  subjectId: string,
  chapterId: string,
): Promise<number> {
  try {
    const cloud = await readCloudProfile(studentUid);
    if (!cloud?.profile) return 50;
    return getChapterMasteryFromProfile(cloud.profile, subjectId, chapterId);
  } catch {
    return 50;
  }
}

export async function buildMarksPreviewRows(
  rows: ParsedMarksRow[],
  rosterMap: Map<string, SchoolRosterEntry>,
  subjectId: string,
  chapterId: string,
  totalMarks: number,
): Promise<MarksPreviewRow[]> {
  const previews: MarksPreviewRow[] = [];

  for (const row of rows) {
    const rosterMatch = matchRowToRoster(row, rosterMap);
    let previousMastery = 50;

    if (rosterMatch) {
      previousMastery = await loadPreviousMastery(
        rosterMatch.auraUid,
        subjectId,
        chapterId,
      );
    }

    const newMastery = computeMasteryFromMarks(
      previousMastery,
      row.scoredMarks,
      totalMarks,
    );

    previews.push({
      ...row,
      rosterMatch,
      previousMastery,
      newMastery,
      scorePercent: scorePercentFromMarks(row.scoredMarks, totalMarks),
    });
  }

  return previews;
}

export type MarksPreviewSummary = {
  matchedCount: number;
  skippedCount: number;
  averageScore: number;
};

export function summarizeMarksPreview(rows: MarksPreviewRow[]): MarksPreviewSummary {
  const matched = rows.filter((r) => r.rosterMatch);
  const skipped = rows.length - matched.length;
  const averageScore =
    matched.length > 0
      ? Math.round(
          matched.reduce((sum, r) => sum + r.scorePercent, 0) / matched.length,
        )
      : 0;

  return {
    matchedCount: matched.length,
    skippedCount: skipped,
    averageScore,
  };
}
