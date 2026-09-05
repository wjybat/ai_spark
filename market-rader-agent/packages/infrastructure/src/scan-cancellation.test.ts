import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { openTestDatabase } from "./db/connection.js";
import { researchJobs, scanRuns, scenarioRevisions } from "./db/schema.js";
import { repoRoot } from "./paths.js";
import { runResearchJob, type ResearchDocumentProvider } from "./research/runner.js";
import { cancelScanRun } from "./usecases/scan.js";

function migrateTestDatabase(db: ReturnType<typeof openTestDatabase>): void {
  for (const file of [
    "0000_initial.sql",
    "0001_research_agent.sql",
    "0002_trace_observability.sql",
    "0006_regional_evaluation_config.sql",
    "0007_regional_benchmark_status.sql",
  ]) {
    const sql = readFileSync(path.join(repoRoot, "drizzle", file), "utf8")
      .replaceAll("--> statement-breakpoint", "");
    db.$client.exec(sql);
  }
}

describe("scan cancellation", () => {
  it("immediately exposes cancelling and cancels queued work", async () => {
    const db = openTestDatabase();
    migrateTestDatabase(db);
    db.$client.pragma("foreign_keys = OFF");
    const now = Date.now();
    const scanRunId = "scan_cancel_test";

    await db.insert(scanRuns).values({
      id: scanRunId,
      scenarioRevisionId: "revision",
      status: "researching",
      stage: "researching",
      inputHash: "input-hash",
      resultStatus: "running",
      productProfileRevisionId: "product-revision",
      metricDefinitionSetId: "metric-set",
      scoringModelId: "scoring-model",
      requestedBy: "user",
      idempotencyKey: "cancel-test",
      startedAt: now,
      createdAt: now,
    });
    await db.insert(researchJobs).values(
      [
        { id: "job_running", status: "running", leaseToken: "lease" },
        { id: "job_queued", status: "queued", leaseToken: null },
      ].map((job) => ({
        ...job,
        scanRunId,
        scenarioRevisionId: "revision",
        researchPlanItemId: `plan_${job.id}`,
        countryId: "cty_id",
        topicCode: "market_size",
        payloadJson: "{}",
        idempotencyKey: `${scanRunId}:${job.id}`,
        priority: 100,
        attemptCount: job.status === "running" ? 1 : 0,
        maxAttempts: 3,
        createdAt: now,
      })),
    );

    expect(await cancelScanRun(db, scanRunId)).toEqual({ cancelled: true });

    const scan = (await db.select().from(scanRuns))[0]!;
    expect(scan.status).toBe("cancelling");
    expect(scan.resultStatus).toBe("running");
    expect(scan.cancelRequestedAt).not.toBeNull();
    const jobs = await db.select().from(researchJobs);
    expect(jobs.find((job) => job.id === "job_queued")?.status).toBe("cancelled");
    expect(jobs.find((job) => job.id === "job_running")?.status).toBe("running");

    // Repeated clicks are harmless while the current job winds down.
    expect(await cancelScanRun(db, scanRunId)).toEqual({ cancelled: true });
    db.$client.close();
  });

  it("aborts the active provider and commits the running job as cancelled", async () => {
    const db = openTestDatabase();
    migrateTestDatabase(db);
    db.$client.pragma("foreign_keys = OFF");
    const now = Date.now();
    const scanRunId = "scan_abort_test";
    const revisionId = "revision_abort";
    const jobId = "job_abort";
    const leaseToken = "lease_abort";

    await db.insert(scenarioRevisions).values({
      id: revisionId,
      scenarioId: "scenario",
      revisionNo: 1,
      countryScopeJson: '["ID"]',
      retailFormatCodesJson: "[]",
      productProfileRevisionId: "product-revision",
      customerFilterJson: "{}",
      researchWindowJson: JSON.stringify({ from: "2023-01-01", to: "2026-09-01" }),
      strategyCode: "overall",
      weightProfileId: "weight",
      configHash: "revision-hash",
      createdBy: "user",
      createdAt: now,
    });
    await db.insert(scanRuns).values({
      id: scanRunId,
      scenarioRevisionId: revisionId,
      status: "researching",
      stage: "researching",
      inputHash: "abort-input-hash",
      resultStatus: "running",
      productProfileRevisionId: "product-revision",
      metricDefinitionSetId: "metric-set",
      scoringModelId: "scoring-model",
      requestedBy: "user",
      idempotencyKey: "abort-test",
      startedAt: now,
      createdAt: now,
    });
    await db.insert(researchJobs).values({
      id: jobId,
      scanRunId,
      scenarioRevisionId: revisionId,
      researchPlanItemId: "plan-item",
      countryId: "cty_id",
      topicCode: "market_size",
      payloadJson: "{}",
      idempotencyKey: `${scanRunId}:${jobId}`,
      status: "running",
      priority: 100,
      workerId: "worker",
      leaseToken,
      leaseUntil: now + 10_000,
      heartbeatAt: now,
      attemptCount: 1,
      maxAttempts: 3,
      createdAt: now,
      startedAt: now,
    });

    const provider: ResearchDocumentProvider = {
      name: "abort-test",
      research: (request) =>
        new Promise<never>((_resolve, reject) => {
          request.signal?.addEventListener(
            "abort",
            () => reject(new Error("provider aborted")),
            { once: true },
          );
        }),
    };
    const running = runResearchJob(
      db,
      {
        id: jobId,
        scanRunId,
        scenarioRevisionId: revisionId,
        researchPlanItemId: "plan-item",
        countryId: "cty_id",
        topicCode: "market_size",
        attemptCount: 1,
        leaseToken,
      },
      3_000,
      provider,
    );
    setTimeout(() => {
      db.$client
        .prepare("update scan_runs set status = 'cancelling', cancel_requested_at = ? where id = ?")
        .run(Date.now(), scanRunId);
    }, 50);

    await running;

    expect((await db.select().from(researchJobs))[0]?.status).toBe("cancelled");
    expect((await db.select().from(scanRuns))[0]?.status).toBe("cancelled");
    db.$client.close();
  });
});
