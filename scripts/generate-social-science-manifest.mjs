#!/usr/bin/env node
/**
 * Auto-discovers every chapter JSON inside
 * `public/content/chapters/social-science/` and writes a manifest.json the
 * runtime loader can consume. Re-run any time chapters are added/removed:
 *
 *   bun scripts/generate-social-science-manifest.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "public/content/chapters/social-science";

const SECTION_KN = {
  History: "ಇತಿಹಾಸ",
  Geography: "ಭೂಗೋಳಶಾಸ್ತ್ರ",
  Economics: "ಅರ್ಥಶಾಸ್ತ್ರ",
  Sociology: "ಸಮಾಜಶಾಸ್ತ್ರ",
  "Business Studies": "ವ್ಯಾಪಾರ ಅಧ್ಯಯನ",
  "Political Science": "ರಾಜ್ಯಶಾಸ್ತ್ರ",
  Civics: "ಪೌರನೀತಿ",
};

const SECTION_DIFFICULTY = {
  History: "medium",
  Geography: "medium",
  Economics: "hard",
  Sociology: "easy",
  "Business Studies": "medium",
};

const SECTION_BLUEPRINT = {
  History: 4,
  Geography: 4,
  Economics: 5,
  Sociology: 3,
  "Business Studies": 3,
};

const files = (await readdir(DIR)).filter((f) => f.endsWith(".json") && f !== "manifest.json");
const chapters = [];

for (const f of files) {
  const id = f.replace(/\.json$/, "");
  const raw = await readFile(join(DIR, f), "utf8");
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    console.warn(`[manifest] skip non-JSON file ${f}:`, err.message);
    continue;
  }
  const section = doc.section ?? "General";
  chapters.push({
    id,
    chapterRef: doc.chapter_id ?? id,
    chapterNumber: typeof doc.chapter_number === "number" ? doc.chapter_number : 0,
    title: doc.chapter_name ?? id,
    titleKn: doc.chapter_name_kn ?? null,
    section,
    sectionKn: SECTION_KN[section] ?? null,
    difficulty: SECTION_DIFFICULTY[section] ?? "medium",
    blueprintMarks: SECTION_BLUEPRINT[section] ?? 3,
    status: "ready",
    filePath: `chapters/social-science/${f}`,
  });
}

// Stable order: section → chapter_number → title
const SECTION_ORDER = ["History", "Geography", "Economics", "Sociology", "Business Studies"];
chapters.sort((a, b) => {
  const sa = SECTION_ORDER.indexOf(a.section);
  const sb = SECTION_ORDER.indexOf(b.section);
  if (sa !== sb) return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb);
  if (a.chapterNumber !== b.chapterNumber) return a.chapterNumber - b.chapterNumber;
  return a.title.localeCompare(b.title);
});

const manifest = {
  subjectId: "social-science",
  subjectTitle: "Social Science",
  subjectTitleKn: "ಸಮಾಜ ವಿಜ್ಞಾನ",
  subjectCode: "85-E",
  board: "Karnataka SSLC",
  totalChapters: chapters.length,
  version: "1.0",
  lastUpdated: new Date().toISOString().slice(0, 7),
  schemaVersion: "1.0",
  features: ["mcqs", "one-mark", "two-mark", "three-mark", "key-terms", "kannada-labels"],
  sections: SECTION_ORDER.filter((s) => chapters.some((c) => c.section === s)).map((s) => ({
    id: s,
    title: s,
    titleKn: SECTION_KN[s] ?? null,
    chapterCount: chapters.filter((c) => c.section === s).length,
  })),
  chapters,
};

await writeFile(join(DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`[manifest] wrote ${chapters.length} chapters across ${manifest.sections.length} sections.`);
