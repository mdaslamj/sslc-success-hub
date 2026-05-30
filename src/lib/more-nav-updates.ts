import { EVAL_REPORT_STORAGE_KEY } from "@/routes/evaluate";

/** True when a fresh evaluation report is waiting to be viewed. */
export function hasUnreadMoreNavUpdates(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  if (pathname.startsWith("/evaluate/results")) return false;
  return !!sessionStorage.getItem(EVAL_REPORT_STORAGE_KEY);
}
