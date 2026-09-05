import { eq } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { scanRuns, scenarioRevisions } from "../db/schema.js";
import { withTrace } from "../observability/trace.js";
import { createJsonLogger } from "../logger.js";
import type { ClaimedJob } from "./jobs.js";
import { commitJob, heartbeatJob, isScanCancelledViaScanRuns } from "./job-support.js";
import { executeTopicResearch } from "./pipeline.js";
import { loadResearchCorpus, type CorpusDocument, type ResearchCorpus } from "./plan.js";
import { topicByCode } from "./topics.js";
import { finalizeScanRun } from "../usecases/scan.js";

export interface ResearchProviderRequest {
  readonly requestId: string;
  readonly scanRunId: string;
  readonly countryId: string;
  readonly countryIso2: string;
  readonly topicCode: string;
  readonly predicates: readonly string[];
  readonly window: { readonly from: string; readonly to: string };
  readonly signal?: AbortSignal;
}

export interface ResearchDocumentProvider {
  readonly name: string;
  research(request: ResearchProviderRequest): Promise<readonly CorpusDocument[]>;
}

let cachedCorpus: ResearchCorpus | null = null;

async function corpus(): Promise<ResearchCorpus> {
  if (cachedCorpus === null) {
    cachedCorpus = await loadResearchCorpus();
  }
  return cachedCorpus;
}

/**
 * Runs one claimed research job to completion with heartbeats, then
 * finalizes the scan when it was the last active job.
 */
export async function runResearchJob(
  db: MarketDatabase,
  job: ClaimedJob,
  leaseMs: number,
  provider?: ResearchDocumentProvider,
): Promise<void> {
  const scanRows = await db
    .select({ traceId: scanRuns.traceId })
    .from(scanRuns)
    .where(eq(scanRuns.id, job.scanRunId));
  const traceId = scanRows[0]?.traceId ?? job.scanRunId;
  await withTrace(
    { traceId, requestId: job.id, component: "worker" },
    () => runResearchJobInner(db, job, leaseMs, provider),
  );
}

async function runResearchJobInner(
  db: MarketDatabase,
  job: ClaimedJob,
  leaseMs: number,
  provider?: ResearchDocumentProvider,
): Promise<void> {
  const logger = createJsonLogger("info", { component: "worker", job_id: job.id });
  const cancellationController = new AbortController();
  const heartbeat = setInterval(() => {
    void heartbeatJob(db, job.id, job.leaseToken, leaseMs);
  }, Math.max(1_000, Math.floor(leaseMs / 3)));
  const cancellationPoll = setInterval(() => {
    void isScanCancelledViaScanRuns(db, job.scanRunId).then((cancelled) => {
      if (cancelled) cancellationController.abort();
    });
  }, 500);

  try {
    if (await isScanCancelledViaScanRuns(db, job.scanRunId)) {
      logger.info("job cancelled by scan cancel flag");
      await commitJob(db, {
        jobId: job.id,
        leaseToken: job.leaseToken,
        status: "cancelled",
        stopReason: "scan_cancelled",
      });
      return;
    }

    const revisionRows = await db
      .select()
      .from(scenarioRevisions)
      .where(eq(scenarioRevisions.id, job.scenarioRevisionId));
    const revision = revisionRows[0];
    if (!revision) throw new Error(`Scenario revision not found: ${job.scenarioRevisionId}`);

    const window = JSON.parse(revision.researchWindowJson) as { from: string; to: string };
    const countryIso2 = job.countryId.replace("cty_", "").toUpperCase();
    const topic = topicByCode(job.topicCode);
    if (topic === undefined) throw new Error(`Unknown research topic: ${job.topicCode}`);

    const documents = provider !== undefined
      ? await provider.research({
          requestId: job.id,
          scanRunId: job.scanRunId,
          countryId: job.countryId,
          countryIso2,
          topicCode: job.topicCode,
          predicates: topic.predicates,
          window,
          signal: cancellationController.signal,
        })
      : (await corpus()).documents.filter(
          (document) => document.country === countryIso2 && document.topic === job.topicCode,
        );

    if (await isScanCancelledViaScanRuns(db, job.scanRunId)) {
      throw new Error("Scan cancelled during research");
    }

    const result = await executeTopicResearch(db, {
      scanRunId: job.scanRunId,
      planItemId: job.researchPlanItemId,
      countryId: job.countryId,
      topicCode: job.topicCode,
      documents,
      window,
    });

    const committed = await commitJob(db, {
      jobId: job.id,
      leaseToken: job.leaseToken,
      status: "succeeded",
      ...(result.candidates === 0 ? { stopReason: "insufficient_evidence" } : {}),
      resultSummary: {
        documents: result.documents,
        candidates: result.candidates,
        verified: result.verified,
        review_required: result.reviewRequired,
      },
    });
    if (!committed) {
      // Lease lost: this worker must not submit results.
      logger.warn("job commit rejected: lease lost");
      return;
    }
    logger.info("job succeeded", {
      topic: job.topicCode,
      country: job.countryId,
      research_provider: provider?.name ?? "fixture",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const cancelled = await isScanCancelledViaScanRuns(db, job.scanRunId);
    if (cancelled) {
      logger.info("job cancelled during research", {
        topic: job.topicCode,
        country: job.countryId,
      });
      await commitJob(db, {
        jobId: job.id,
        leaseToken: job.leaseToken,
        status: "cancelled",
        stopReason: "scan_cancelled",
      });
    } else {
      logger.error("job failed", {
        topic: job.topicCode,
        country: job.countryId,
        research_provider: provider?.name ?? "fixture",
        error: errorMessage,
      });
      await commitJob(db, {
        jobId: job.id,
        leaseToken: job.leaseToken,
        status: "failed",
        errorCode: "JOB_EXECUTION_FAILED",
        errorMessage,
      });
    }
  } finally {
    clearInterval(heartbeat);
    clearInterval(cancellationPoll);
  }

  await maybeFinalize(db, job.scanRunId);
}

async function maybeFinalize(db: MarketDatabase, scanRunId: string): Promise<void> {
  const { scanHasActiveJobs } = await import("./jobs.js");
  if (!(await scanHasActiveJobs(db, scanRunId))) {
    await finalizeScanRun(db, scanRunId);
  }
}
