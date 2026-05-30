export const ROSTER_TEMPLATE_CSV =
  "Roll Number,Student Name\n" +
  "001,Student Name Here\n" +
  "002,Student Name Here\n";

export function downloadRosterTemplate(): void {
  const blob = new Blob([ROSTER_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "aura-roster-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
