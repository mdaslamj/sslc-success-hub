import { getScienceSeedMarkScheme } from "@/data/markSchemes/scienceSeed";
import { getMarkSchemesBySubject } from "@/lib/markSchemeRepository";
import type { MarkSchemeQuestion } from "@/types/markScheme";

export type MarksTemplateOptions = {
  subjectId: string;
  chapterId: string;
  chapterTitle: string;
  totalMarks: number;
  detailed?: boolean;
};

async function getChapterMarkSchemeQuestions(
  subjectId: string,
  chapterId: string,
): Promise<MarkSchemeQuestion[]> {
  if (subjectId === "science") {
    const scheme = getScienceSeedMarkScheme(chapterId);
    if (scheme) {
      return scheme.questions.filter((q) =>
        q.chapterIds.some(
          (id) => id === chapterId || id.replace(/-/g, "") === chapterId.replace(/-/g, ""),
        ),
      );
    }
  }

  try {
    const schemes = await getMarkSchemesBySubject(subjectId);
    const questions: MarkSchemeQuestion[] = [];
    for (const scheme of schemes) {
      for (const question of scheme.questions) {
        if (
          question.chapterIds.some(
            (id) => id === chapterId || id.includes(chapterId) || chapterId.includes(id),
          )
        ) {
          questions.push(question);
        }
      }
    }
    return questions;
  } catch {
    return [];
  }
}

function buildSimpleTemplate(totalMarks: number): string {
  const header = "Roll Number,Student Name,Marks Obtained";
  const rows = ["001,,", "002,,", "003,,"];
  return [header, ...rows].join("\n");
}

function buildDetailedTemplate(
  questions: MarkSchemeQuestion[],
  totalMarks: number,
): string {
  if (questions.length === 0) {
    const header = "Roll Number,Student Name,Q1 (5 marks),Q2 (5 marks),Q3 (10 marks),Total";
    return [header, "001,,,,,", "002,,,,,"].join("\n");
  }

  const questionHeaders = questions.map(
    (q, index) => `Q${index + 1} (${q.totalMarks} marks)`,
  );
  const header = ["Roll Number", "Student Name", ...questionHeaders, "Total"].join(",");
  const emptyRow = ["001", "", ...questions.map(() => ""), ""].join(",");
  const emptyRow2 = ["002", "", ...questions.map(() => ""), ""].join(",");
  return [header, emptyRow, emptyRow2].join("\n");
}

export async function buildMarksTemplateCsv(
  options: MarksTemplateOptions,
): Promise<string> {
  if (!options.detailed) {
    return buildSimpleTemplate(options.totalMarks);
  }

  const questions = await getChapterMarkSchemeQuestions(
    options.subjectId,
    options.chapterId,
  );
  return buildDetailedTemplate(questions, options.totalMarks);
}

export function downloadMarksTemplate(
  csv: string,
  subjectLabel: string,
  chapterTitle: string,
): void {
  const safeSubject = subjectLabel.replace(/\s+/g, "-").toLowerCase();
  const safeChapter = chapterTitle.replace(/\s+/g, "-").toLowerCase();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `aura-marks-${safeSubject}-${safeChapter}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
