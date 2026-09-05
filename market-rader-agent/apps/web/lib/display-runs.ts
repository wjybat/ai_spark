import type { ScanRunSummary } from "@market-radar/infrastructure";

/** Selects the newest completed result for the configured evidence provider. */
export function selectDisplayRun(
  runs: readonly ScanRunSummary[],
  preferredProvider: string,
  scenarioRevisionIds?: readonly string[],
): ScanRunSummary | undefined {
  const allowedRevisions = scenarioRevisionIds === undefined
    ? null
    : new Set(scenarioRevisionIds);
  const completed = runs.filter(
    (run) =>
      (run.status === "completed" || run.status === "partial") &&
      (allowedRevisions === null || allowedRevisions.has(run.scenario_revision_id)),
  );
  const preferred = completed.filter((run) => run.model_provider === preferredProvider);
  const eligible = preferredProvider === "pi-agent"
    ? preferred
    : preferred.length > 0
      ? preferred
      : completed;
  return [...eligible].sort(
    (left, right) =>
      (right.finished_at ?? right.created_at) - (left.finished_at ?? left.created_at),
  )[0];
}
