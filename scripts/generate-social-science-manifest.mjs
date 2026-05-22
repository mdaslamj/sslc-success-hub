#!/usr/bin/env node
/**
 * Auto-discovers every chapter JSON inside
 * `public/content/chapters/social-science/` and writes a manifest.json the
 * runtime loader can consume. Re-run any time chapters are added/removed:
 *
 *   bun scripts/generate-social-science-manifest.mjs
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

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

// Recursive scan — accept ANY .json file regardless of name pattern.
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) out.push(p);
  }
  return out;
}

const allJson = (await walk(DIR)).filter((p) => !p.endsWith("manifest.json")).sort();
console.log(`[manifest] discovered ${allJson.length} .json file(s) under ${DIR}:`);
for (const p of allJson) console.log(`  • ${relative(DIR, p)}`);

const chapters = [];
const skipped = [];
let emptyCount = 0;

for (const fullPath of allJson) {
  const rel = relative(DIR, fullPath);
  const id = rel.replace(/\.json$/i, "").replace(/[\\/]/g, "__");
  let raw;
  try {
    raw = await readFile(fullPath, "utf8");
  } catch (err) {
    skipped.push({ file: rel, reason: `read error: ${err.message}` });
    continue;
  }
  if (!raw.trim()) {
    skipped.push({ file: rel, reason: "empty file" });
    emptyCount++;
    continue;
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    skipped.push({ file: rel, reason: `invalid JSON — ${err.message}` });
    continue;
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    skipped.push({ file: rel, reason: "JSON root is not an object" });
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
    filePath: `chapters/social-science/${rel.replace(/\\/g, "/")}`,
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

console.log("\n[manifest] ───── Discovery report ─────");
console.log(`  Total .json files discovered : ${allJson.length}`);
console.log(`  Indexed chapters             : ${chapters.length}`);
console.log(`  Skipped / rejected           : ${skipped.length}`);
if (skipped.length) {
  console.log("  Rejection details:");
  for (const s of skipped) console.log(`    ✗ ${s.file}  →  ${s.reason}`);
}
console.log(`  Sections                     : ${manifest.sections.length}`);
console.log(`[manifest] wrote ${chapters.length} chapters to manifest.json`);
