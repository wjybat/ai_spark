import { canonicalHash, newId } from "@market-radar/domain";
import { METRIC_NAMES, metrics } from "../observability/metrics.js";
import { newTraceId, withTrace } from "../observability/trace.js";
import { createJsonLogger } from "../logger.js";
import { and, eq, inArray } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { researchJobs, researchPlans, scanRuns, scenarioRevisions } from "../db/schema.js";
import { importFixtureEvidence, loadFixtureDataset } from "../fixture/importer.js";
import { cancelQueuedJobs, scanHasActiveJobs } from "../research/jobs.js";
import { buildResearchPlan, loadResearchCorpus } from "../research/plan.js";
import { RESEARCH_POLICY_VERSION } from "../research/topics.js";
import { appendEvent, evaluateAndPersist, loadEvaluationSetup } from "./evaluation.js";
import { createDefaultScenario } from "./scenario.js";

export interface RunFixtureScanInput {
  readonly scenarioRevisionId?: string;
  readonly asOf?: string;
  readonly idempotencyKey?: string;
  readonly requestedBy?: string;
  /** Search provider recorded in research plans and scan provenance. */
  readonly researchProvider?: string;
}

export interface RunScanResult {
  readonly scanRunId: string;
  readonly status: string;
  readonly resultStatus: string;
  readonly inputHash: string;
  readonly replayed: boolean;
  readonly jobsCreated?: number;
}

async function resolveRevisionId(
  db: MarketDatabase,
  scenarioRevisionId: string | undefined,
): Promise<string> {
  if (scenarioRevisionId !== undefined) return scenarioRevisionId;
  const scenario = await createDefaultScenario(db);
  return scenario.revisionId;
}

async function createScanRun(
  db: MarketDatabase,
  input: {
    scenarioRevisionId: string;
    idempotencyKey: string;
    requestedBy: string;
    asOf: string;
    mode: string;
    inputHash: string;
    modelProvider?: string;
    modelName?: string;
  },
): Promise<{ id: string; replayed: boolean }> {
  const existing = await db
    .select()
    .from(scanRuns)
    .where(
      and(
        eq(scanRuns.requestedBy, input.requestedBy),
        eq(scanRuns.idempotencyKey, input.idempotencyKey),
      ),
    );
  if (existing.length > 0) {
    return { id: existing[0]!.id, replayed: true };
  }
  const revisionRows = await db
    .select()
    .from(scenarioRevisions)
    .where(eq(scenarioRevisions.id, input.scenarioRevisionId));
  const revision = revisionRows[0];
  if (revision === undefined) {
    throw new Error(`Scenario revision not found: ${input.scenarioRevisionId}`);
  }
  const now = Date.now();
  const id = `scan_${newId("fx").split("_")[1]}`;
  await db.insert(scanRuns).values({
    id,
    scenarioRevisionId: input.scenarioRevisionId,
    status: "created",
    stage: "validating",
    inputHash: input.inputHash,
    traceId: newTraceId(),
    resultStatus: "running",
    productProfileRevisionId: "ppr_ai_video_loss_prevention_1_0_0",
    metricDefinitionSetId: revision.metricDefinitionSetId ?? "mds_southeast_asia_retail_1_0_0",
    scoringModelId: revision.scoringModelId ?? "sm_market_opportunity",
    researchPolicyVersion: input.mode === "research" ? RESEARCH_POLICY_VERSION : null,
    modelProvider: input.modelProvider ?? "fixture",
    modelName: input.modelName ?? (input.mode === "fixture" ? "fixture" : "fixture-research"),
    dataAsOf: input.asOf,
    requestedBy: input.requestedBy,
    idempotencyKey: input.idempotencyKey,
    startedAt: now,
    createdAt: now,
  });
  return { id, replayed: false };
}

/** Synchronous fixture scan: import baseline evidence, evaluate, complete. */
export async function runFixtureScan(
  db: MarketDatabase,
  input: RunFixtureScanInput,
): Promise<RunScanResult> {
  return runTraced(db, "fixture", input, runFixtureScanInner);
}

async function runFixtureScanInner(
  db: MarketDatabase,
  input: RunFixtureScanInput,
): Promise<RunScanResult> {
  const requestedBy = input.requestedBy ?? "usr_market_radar_ops";
  const idempotencyKey = input.idempotencyKey ?? "fixture-default";
  const revisionId = await resolveRevisionId(db, input.scenarioRevisionId);

  const dataset = await loadFixtureDataset();
  const asOf = input.asOf ?? dataset.as_of;
  const inputHash = canonicalHash({
    scenario_revision: revisionId,
    as_of: asOf,
    mode: "fixture",
    dataset: dataset.version,
  });

  const { id: scanRunId, replayed } = await createScanRun(db, {
    scenarioRevisionId: revisionId,
    idempotencyKey,
    requestedBy,
    asOf,
    mode: "fixture",
    inputHash,
  });
  if (replayed) {
    const rows = await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId));
    const row = rows[0]!;
    return {
      scanRunId,
      status: row.status,
      resultStatus: row.resultStatus,
      inputHash: row.inputHash,
      replayed: true,
    };
  }

  await appendEvent(db, scanRunId, "scan.validating", "validating", "SCAN_STARTED", {
    input_hash: inputHash,
  });

  const importResult = await importFixtureEvidence(db, dataset);
  const setup = await loadEvaluationSetup(db, scanRunId, asOf);
  const summary = await evaluateAndPersist(db, scanRunId, setup);

  const finishedAt = Date.now();
  await db
    .update(scanRuns)
    .set({ status: "completed", stage: "quality_gate", resultStatus: "completed", finishedAt })
    .where(eq(scanRuns.id, scanRunId));
  await appendEvent(
    db,
    scanRunId,
    "quality_gate.completed",
    "quality_gate",
    "QUALITY_GATE_COMPLETED",
    { ...summary.byStatus, imported_claims: importResult.imported },
  );
  await appendEvent(db, scanRunId, "scan.completed", "quality_gate", "SCAN_COMPLETED", {});

  return {
    scanRunId,
    status: "completed",
    resultStatus: "completed",
    inputHash,
    replayed: false,
  };
}

/** Recalculates deterministic metrics and scores from existing provider-isolated evidence. */
export async function runRecalculationScan(
  db: MarketDatabase,
  input: RunFixtureScanInput,
): Promise<RunScanResult> {
  return runTraced(db, "recalculate", input, runRecalculationScanInner);
}

async function runRecalculationScanInner(
  db: MarketDatabase,
  input: RunFixtureScanInput,
): Promise<RunScanResult> {
  const requestedBy = input.requestedBy ?? "usr_market_radar_ops";
  const idempotencyKey = input.idempotencyKey ?? `recalculate-${Date.now()}`;
  const revisionId = await resolveRevisionId(db, input.scenarioRevisionId);
  const revisionRows = await db
    .select()
    .from(scenarioRevisions)
    .where(eq(scenarioRevisions.id, revisionId));
  const revision = revisionRows[0];
  if (revision === undefined) throw new Error(`Scenario revision not found: ${revisionId}`);

  const evidenceProvider = input.researchProvider ?? "pi-agent";
  const researchWindow = JSON.parse(revision.researchWindowJson) as { to: string };
  const asOf = input.asOf ?? researchWindow.to;
  const inputHash = canonicalHash({
    scenario_revision: revisionId,
    as_of: asOf,
    mode: "recalculate",
    evidence_provider: evidenceProvider,
  });
  const { id: scanRunId, replayed } = await createScanRun(db, {
    scenarioRevisionId: revisionId,
    idempotencyKey,
    requestedBy,
    asOf,
    mode: "recalculate",
    inputHash,
    modelProvider: evidenceProvider,
    modelName: "deterministic-recalculation",
  });
  if (replayed) {
    const row = (await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId)))[0]!;
    return {
      scanRunId,
      status: row.status,
      resultStatus: row.resultStatus,
      inputHash: row.inputHash,
      replayed: true,
    };
  }

  await appendEvent(db, scanRunId, "scan.validating", "validating", "SCAN_STARTED", {
    input_hash: inputHash,
    mode: "recalculate",
    evidence_provider: evidenceProvider,
  });
  const setup = await loadEvaluationSetup(db, scanRunId, asOf);
  const summary = await evaluateAndPersist(db, scanRunId, setup);
  const finishedAt = Date.now();
  await db
    .update(scanRuns)
    .set({ status: "completed", stage: "quality_gate", resultStatus: "completed", finishedAt })
    .where(eq(scanRuns.id, scanRunId));
  await appendEvent(
    db,
    scanRunId,
    "quality_gate.completed",
    "quality_gate",
    "QUALITY_GATE_COMPLETED",
    summary.byStatus,
  );
  await appendEvent(db, scanRunId, "scan.completed", "quality_gate", "SCAN_COMPLETED", {});
  return {
    scanRunId,
    status: "completed",
    resultStatus: "completed",
    inputHash,
    replayed: false,
    jobsCreated: 0,
  };
}

/** Research scan: import baseline, build plan, enqueue jobs for the worker. */
export async function runResearchScan(
  db: MarketDatabase,
  input: RunFixtureScanInput,
): Promise<RunScanResult> {
  return runTraced(db, "research", input, runResearchScanInner);
}

async function runResearchScanInner(
  db: MarketDatabase,
  input: RunFixtureScanInput,
): Promise<RunScanResult> {
  const requestedBy = input.requestedBy ?? "usr_market_radar_ops";
  const idempotencyKey = input.idempotencyKey ?? `research-${Date.now()}`;
  const revisionId = await resolveRevisionId(db, input.scenarioRevisionId);

  const revisionRows = await db
    .select()
    .from(scenarioRevisions)
    .where(eq(scenarioRevisions.id, revisionId));
  const revision = revisionRows[0];
  if (!revision) throw new Error(`Scenario revision not found: ${revisionId}`);

  const dataset = await loadFixtureDataset();
  const corpus = await loadResearchCorpus();
  const researchProvider = input.researchProvider ?? "fixture";
  const researchWindow = JSON.parse(revision.researchWindowJson) as { from: string; to: string };
  const asOf = input.asOf ?? (researchProvider === "fixture" ? dataset.as_of : researchWindow.to);
  const inputHash = canonicalHash({
    scenario_revision: revisionId,
    as_of: asOf,
    mode: "research",
    research_provider: researchProvider,
    research_policy_version: RESEARCH_POLICY_VERSION,
    dataset: researchProvider === "fixture" ? dataset.version : null,
    corpus: researchProvider === "fixture" ? (corpus.version ?? "1.0.0") : null,
  });

  const { id: scanRunId, replayed } = await createScanRun(db, {
    scenarioRevisionId: revisionId,
    idempotencyKey,
    requestedBy,
    asOf,
    mode: "research",
    inputHash,
    modelProvider: researchProvider,
    modelName: researchProvider === "pi-agent" ? "local-pi-default" : "fixture-research",
  });
  if (replayed) {
    const rows = await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId));
    const row = rows[0]!;
    return {
      scanRunId,
      status: row.status,
      resultStatus: row.resultStatus,
      inputHash: row.inputHash,
      replayed: true,
    };
  }

  await appendEvent(db, scanRunId, "scan.validating", "validating", "SCAN_STARTED", {
    input_hash: inputHash,
    mode: "research",
    research_provider: researchProvider,
  });

  // Offline research starts from the deterministic fixture baseline. Live Pi
  // research must never mix synthetic claims into its evidence or scoring.
  if (researchProvider === "fixture") {
    await importFixtureEvidence(db, dataset);
  }

  const priorPolicyPlans = await db
    .select({
      scanRunId: researchPlans.scanRunId,
      researchPolicyVersion: researchPlans.researchPolicyVersion,
    })
    .from(researchPlans)
    .innerJoin(scanRuns, eq(scanRuns.id, researchPlans.scanRunId))
    .innerJoin(scenarioRevisions, eq(scenarioRevisions.id, scanRuns.scenarioRevisionId))
    .where(
      and(
        eq(scenarioRevisions.scenarioId, revision.scenarioId),
        eq(scanRuns.modelProvider, researchProvider),
      ),
    );
  const forcePolicyRefresh = researchProvider === "pi-agent" && !priorPolicyPlans.some(
    (prior) =>
      prior.scanRunId !== scanRunId && prior.researchPolicyVersion === RESEARCH_POLICY_VERSION,
  );

  const plan = await buildResearchPlan(db, {
    scanRunId,
    scenarioRevisionId: revisionId,
    countryIds: (JSON.parse(revision.countryScopeJson) as string[]).map(
      (iso2) => `cty_${iso2.toLowerCase()}`,
    ),
    window: researchWindow,
    providerName: researchProvider,
    forceRefresh: forcePolicyRefresh,
  });

  await db
    .update(scanRuns)
    .set({ status: "researching", stage: "researching" })
    .where(eq(scanRuns.id, scanRunId));
  await appendEvent(db, scanRunId, "scan.researching", "researching", "RESEARCH_STARTED", {
    jobs: plan.createdJobs,
    reused_items: plan.reusedItems,
    research_provider: researchProvider,
    force_policy_refresh: forcePolicyRefresh,
  });

  if (plan.createdJobs === 0) {
    return finalizeScanRun(db, scanRunId).then((summary) => ({
      scanRunId,
      status: "completed",
      resultStatus: "completed",
      inputHash,
      replayed: false,
      jobsCreated: 0,
      ...summary,
    }));
  }

  return {
    scanRunId,
    status: "researching",
    resultStatus: "running",
    inputHash,
    replayed: false,
    jobsCreated: plan.createdJobs,
  };
}

/** Finalizes a research scan once no active jobs remain. */
export async function finalizeScanRun(
  db: MarketDatabase,
  scanRunId: string,
): Promise<{ countries: number }> {
  const rows = await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId));
  const scan = rows[0];
  if (!scan) throw new Error(`Scan run not found: ${scanRunId}`);
  if (["completed", "partial", "failed", "cancelled", "stale"].includes(scan.status)) {
    return { countries: 0 };
  }

  if (scan.cancelRequestedAt !== null) {
    await db
      .update(scanRuns)
      .set({ status: "cancelled", resultStatus: "cancelled", finishedAt: Date.now() })
      .where(eq(scanRuns.id, scanRunId));
    await appendEvent(db, scanRunId, "scan.cancelled", "quality_gate", "SCAN_CANCELLED", {});
    return { countries: 0 };
  }

  await db
    .update(scanRuns)
    .set({ status: "validating_evidence", stage: "validating_evidence" })
    .where(eq(scanRuns.id, scanRunId));
  await appendEvent(
    db,
    scanRunId,
    "evidence.validation_started",
    "validating_evidence",
    "VALIDATION_STARTED",
    {},
  );

  const setup = await loadEvaluationSetup(db, scanRunId);
  const summary = await evaluateAndPersist(db, scanRunId, setup);

  const failedJobs = await db
    .select({ id: researchJobs.id })
    .from(researchJobs)
    .where(and(eq(researchJobs.scanRunId, scanRunId), eq(researchJobs.status, "failed")))
    .limit(1);

  const status = failedJobs.length > 0 ? "partial" : "completed";
  await db
    .update(scanRuns)
    .set({
      status,
      stage: "quality_gate",
      resultStatus: status,
      finishedAt: Date.now(),
    })
    .where(eq(scanRuns.id, scanRunId));
  metrics.increment(METRIC_NAMES.scansTotal, { mode: "research", status });
  metrics.increment("scan_countries_total", { status: "all" }, summary.countries);
  await appendEvent(
    db,
    scanRunId,
    status === "completed" ? "scan.completed" : "scan.partial",
    "quality_gate",
    status === "completed" ? "SCAN_COMPLETED" : "SCAN_PARTIAL",
    summary.byStatus,
  );

  return { countries: summary.countries };
}

/**
 * Finalizes scans that have no remaining queued/running jobs. Calling this on
 * every Worker tick also resumes a finalization interrupted by process exit.
 */
export async function finalizeReadyScanRuns(db: MarketDatabase): Promise<string[]> {
  const candidates = await db
    .select({ id: scanRuns.id })
    .from(scanRuns)
    .where(inArray(scanRuns.status, ["researching", "validating_evidence", "cancelling"]));
  const finalized: string[] = [];

  for (const candidate of candidates) {
    if (await scanHasActiveJobs(db, candidate.id)) continue;
    try {
      await finalizeScanRun(db, candidate.id);
      finalized.push(candidate.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db
        .update(scanRuns)
        .set({
          status: "failed",
          stage: "quality_gate",
          resultStatus: "failed",
          errorCode: "SCAN_FINALIZATION_FAILED",
          errorMessage,
          finishedAt: Date.now(),
        })
        .where(eq(scanRuns.id, candidate.id));
      await appendEvent(
        db,
        candidate.id,
        "scan.failed",
        "quality_gate",
        "SCAN_FINALIZATION_FAILED",
        { error: errorMessage },
      );
    }
  }

  return finalized;
}

/** Cancels a scan: flag + cancel queued jobs; running jobs stop cooperatively. */
export async function cancelScanRun(db: MarketDatabase, scanRunId: string): Promise<{ cancelled: boolean }> {
  const rows = await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId));
  const scan = rows[0];
  if (!scan) throw new Error(`Scan run not found: ${scanRunId}`);
  if (["completed", "partial", "failed", "cancelled", "stale"].includes(scan.status)) {
    return { cancelled: false };
  }
  if (scan.cancelRequestedAt !== null) {
    return { cancelled: true };
  }
  await db
    .update(scanRuns)
    .set({
      status: "cancelling",
      resultStatus: "running",
      cancelRequestedAt: Date.now(),
    })
    .where(eq(scanRuns.id, scanRunId));
  await cancelQueuedJobs(db, scanRunId);
  await appendEvent(db, scanRunId, "scan.cancelled", "researching", "CANCEL_REQUESTED", {});
  if (!(await scanHasActiveJobs(db, scanRunId))) {
    await finalizeScanRun(db, scanRunId);
  }
  return { cancelled: true };
}


type ScanMode = "fixture" | "research" | "recalculate";

async function runTraced(
  db: MarketDatabase,
  mode: ScanMode,
  input: RunFixtureScanInput,
  fn: (db: MarketDatabase, input: RunFixtureScanInput) => Promise<RunScanResult>,
): Promise<RunScanResult> {
  const logger = createJsonLogger("info", { component: "scan", mode });
  const result = await withTrace(
    {
      traceId: newTraceId(),
      requestId: input.idempotencyKey ?? `${mode}-default`,
      component: "scan",
    },
    () => fn(db, input),
  );
  metrics.increment(METRIC_NAMES.scansTotal, { mode, status: result.status });
  logger.info("scan run finished", {
    scan_run_id: result.scanRunId,
    status: result.status,
    result_status: result.resultStatus,
    replayed: result.replayed,
  });
  return result;
}
