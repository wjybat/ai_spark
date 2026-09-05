import type { ScanRunSummary } from "@market-radar/infrastructure";

const TERMINAL_SCAN_STATUSES = new Set(["completed", "partial", "failed", "cancelled", "stale"]);

export function isActiveScan(run: ScanRunSummary): boolean {
  return !TERMINAL_SCAN_STATUSES.has(run.status);
}

/** Prefer the live queue; otherwise show the newest asynchronous research run. */
export function selectJobRun(runs: readonly ScanRunSummary[]): ScanRunSummary | undefined {
  return runs.find(isActiveScan) ?? runs.find((run) => run.model_provider !== "fixture");
}
