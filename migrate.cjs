const fs = require("fs")
const path = require("path")

// ── Chapter mapping: textbook number → blueprint ID + metadata ──────────────
const CHAPTER_MAP = {
  1:  { id: "math-ch1",  name: "Real Numbers",                          marks: 5,  priority: "high"     },
  2:  { id: "math-ch2",  name: "Polynomials",                           marks: 5,  priority: "high"     },
  3:  { id: "math-ch3",  name: "Pair of Linear Equations in Two Variables", marks: 8, priority: "critical" },
  4:  { id: "math-ch4",  name: "Quadratic Equations",                   marks: 6,  priority: "high"     },
  5:  { id: "math-ch5",  name: "Arithmetic Progressions",               marks: 8,  priority: "critical" },
  6:  { id: "math-ch6",  name: "Triangles",                             marks: 9,  priority: "critical" },
  7:  { id: "math-ch7",  name: "Circles",                               marks: 5,  priority: "high"     },
  8:  { id: "math-ch8",  name: "Coordinate Geometry",                   marks: 6,  priority: "high"     },
  9:  { id: "math-ch9",  name: "Introduction to Trigonometry",          marks: 6,  priority: "high"     },
  10: { id: "math-ch10", name: "Some Applications of Trigonometry",     marks: 4,  priority: "high"     },
  11: { id: "math-ch11", name: "Surface Areas and Volumes",             marks: 7,  priority: "critical" },
  12: { id: "math-ch12", name: "Areas Related to Circles",              marks: 3,  priority: "standard" },
  13: { id: "math-ch13", name: "Statistics",                            marks: 4,  priority: "high"     },
  14: { id: "math-ch14", name: "Probability",                           marks: 4,  priority: "high"     },
}

// ── questionType mapping ──────────────────────────────────────────────────────
function getQuestionType(type, marks) {
  if (type === "mcq") return "mcq"
  if (marks === 1) return "1mark"
  if (marks === 2) return "2mark"
  if (marks === 3) return "3mark"
  if (marks === 4) return "4mark"
  if (marks === 5) return "hots"
  return "mcq"
}

// ── estimatedTime ─────────────────────────────────────────────────────────────
function getEstimatedTime(marks) {
  const map = { 1: 60, 2: 120, 3: 180, 4: 240, 5: 300 }
  return map[marks] ?? 120
}

// ── Migrate one question ───────────────────────────────────────────────────────
function migrate(q) {
  const ch = CHAPTER_MAP[q.chapter]
  if (!ch) { console.warn("Unknown chapter:", q.chapter); return null }

  return {
    id:           q.id,
    subject:      "mathematics",
    chapter:      ch.name,
    chapterId:    ch.id,
    concept:      Array.isArray(q.concepts) && q.concepts.length > 0
                    ? q.concepts[0]
                    : ch.name.toLowerCase(),
    difficulty:   q.difficulty || "medium",
    questionType: getQuestionType(q.type, q.marks),
    marks:        q.marks,
    question:     q.question,
    options:      q.options || [],
    correctAnswer: q.answer || "",
    explanation:  q.answer || "",
    estimatedTime: getEstimatedTime(q.marks),
    cognitiveLevel: q.type === "proof" ? "analyze"
                  : q.type === "application" || q.type === "word_problem" ? "apply"
                  : q.type === "calculation" ? "understand"
                  : "remember",
    commonMistakes: [],
    conceptTags:  Array.isArray(q.concepts) ? q.concepts : [],
    examWeightage: ch.marks,
    boardFrequency: q.board_frequency === "very_high" ? 5
                  : q.board_frequency === "high"      ? 4
                  : q.board_frequency === "medium"    ? 3
                  : 2,
    // Keep original fields too so nothing breaks
    _source:       q.source,
    _section:      q.section,
    _type:         q.type,
  }
}

// ── Run migration ─────────────────────────────────────────────────────────────
const inputPath  = process.argv[2]
const outputPath = process.argv[3] || inputPath.replace(".json", "_migrated.json")

if (!inputPath) {
  console.error("Usage: node migrate.js <input.json> [output.json]")
  process.exit(1)
}

const raw  = JSON.parse(fs.readFileSync(inputPath, "utf8"))
const questions = Array.isArray(raw) ? raw : (raw.questions || [])

const migrated = questions.map(migrate).filter(Boolean)

// Wrap in same structure if original had meta
const output = raw.meta
  ? { ...raw, questions: migrated }
  : migrated

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

console.log(`✅ Migrated ${migrated.length} questions`)
console.log(`   Output: ${outputPath}`)

// Quick stats
const byChapter = {}
migrated.forEach(q => {
  byChapter[q.chapter] = (byChapter[q.chapter] || 0) + 1
})
console.log("\nQuestions per chapter:")
Object.entries(byChapter).forEach(([ch, count]) => {
  console.log(`  ${ch}: ${count}`)
})
