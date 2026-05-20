export * from "./solve-modes";
export * from "./understanding";
export * from "./local-store";
export * from "./post-solve";

export function genScanId(): string {
  return `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}