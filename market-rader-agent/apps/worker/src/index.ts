import {
  claimNextJob,
  createJsonLogger,
  finalizeReadyScanRuns,
  loadConfig,
  openMarketDatabase,
  reapExpiredLeases,
  resolveFromRoot,
  runResearchJob,
} from "@market-radar/infrastructure";
import type { ResearchDocumentProvider } from "@market-radar/infrastructure";

import { createPiAgentResearchProvider } from "./pi-research-provider.js";

const config = loadConfig();
const logger = createJsonLogger(config.logLevel, {
  service: "worker",
  worker_id: config.worker.id,
});
const db = openMarketDatabase(
  resolveFromRoot(config.database.marketPath),
  config.database.sqliteBusyTimeoutMs,
);

function buildResearchProvider(): ResearchDocumentProvider | undefined {
  if (config.search.provider === "fixture") return undefined;
  if (config.search.provider === "pi-agent") {
    return createPiAgentResearchProvider({
      cwd: resolveFromRoot("."),
      model: config.piAgent.model,
      timeoutMs: config.piAgent.timeoutMs,
      thinkingLevel: config.piAgent.thinkingLevel,
      onActivity: (message, fields) => logger.info(message, fields),
    });
  }
  throw new Error(`Unsupported SEARCH_PROVIDER: ${config.search.provider}`);
}

const researchProvider = buildResearchProvider();
const activeJobs = new Set<Promise<void>>();
let ticking = false;
let shutdown = false;

function startJob(job: NonNullable<Awaited<ReturnType<typeof claimNextJob>>>): void {
  logger.info("job claimed", {
    job_id: job.id,
    topic: job.topicCode,
    country: job.countryId,
    active_jobs: activeJobs.size + 1,
    concurrency: config.worker.concurrency,
  });
  const task: Promise<void> = runResearchJob(db, job, config.worker.jobLeaseMs, researchProvider)
    .catch((error: unknown) => {
      logger.error("unhandled research job error", {
        job_id: job.id,
        message: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      activeJobs.delete(task);
      if (!shutdown) void tick();
    });
  activeJobs.add(task);
}

async function tick(): Promise<void> {
  if (ticking || shutdown) return;
  ticking = true;
  try {
    await reapExpiredLeases(db, 30_000);
    while (!shutdown && activeJobs.size < config.worker.concurrency) {
      const job = await claimNextJob(db, config.worker.id, config.worker.jobLeaseMs);
      if (job === null) break;
      startJob(job);
    }
    const finalized = await finalizeReadyScanRuns(db);
    if (finalized.length > 0) {
      logger.info("ready scans finalized", { scan_run_ids: finalized });
    }
  } catch (error) {
    logger.error("worker tick failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    ticking = false;
  }
}

const interval = setInterval(() => {
  void tick();
}, config.worker.pollMs);

async function shutdownWorker(): Promise<void> {
  shutdown = true;
  clearInterval(interval);
  await new Promise((resolve) => setTimeout(resolve, 500));
  logger.info("worker stopped");
  process.exit(0);
}

process.on("SIGINT", () => void shutdownWorker());
process.on("SIGTERM", () => void shutdownWorker());

await withTraceStartup();

async function withTraceStartup(): Promise<void> {
  await Promise.resolve();
  logger.info("worker started", {
    db: resolveFromRoot(config.database.marketPath),
    research_provider: researchProvider?.name ?? "fixture",
    concurrency: config.worker.concurrency,
  });
}
void tick();
