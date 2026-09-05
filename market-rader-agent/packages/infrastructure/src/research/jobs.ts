import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { jobAttempts, researchJobs, scanRuns } from "../db/schema.js";
import { METRIC_NAMES, metrics } from "../observability/metrics.js";

export interface ClaimedJob {
  readonly id: string;
  readonly scanRunId: string;
  readonly scenarioRevisionId: string;
  readonly researchPlanItemId: string;
  readonly countryId: string;
  readonly topicCode: string;
  readonly attemptCount: number;
  readonly leaseToken: string;
}

/** Atomically claims the next runnable job. Lost races return null. */
export async function claimNextJob(
  db: MarketDatabase,
  workerId: string,
  leaseMs: number,
): Promise<ClaimedJob | null> {
  const now = Date.now();
  const candidates = await db
    .select({ id: researchJobs.id })
    .from(researchJobs)
    .where(
      and(
        eq(researchJobs.status, "queued"),
        or(isNull(researchJobs.nextRetryAt), lte(researchJobs.nextRetryAt, now)),
      ),
    )
    .orderBy(asc(researchJobs.priority), asc(researchJobs.createdAt))
    .limit(5);

  for (const candidate of candidates) {
    const leaseToken = randomUUID();
    const updated = await db
      .update(researchJobs)
      .set({
        status: "running",
        workerId,
        leaseToken,
        leaseUntil: now + leaseMs,
        heartbeatAt: now,
        attemptCount: sql`${researchJobs.attemptCount} + 1`,
        startedAt: now,
      })
      .where(and(eq(researchJobs.id, candidate.id), eq(researchJobs.status, "queued")))
      .returning();
    const job = updated[0];
    if (job === undefined) continue;

    await db.insert(jobAttempts).values({
      id: `jat_${randomUUID()}`,
      researchJobId: job.id,
      attemptNo: job.attemptCount,
      workerId,
      leaseToken,
      startedAt: now,
      status: "running",
    });

    return {
      id: job.id,
      scanRunId: job.scanRunId,
      scenarioRevisionId: job.scenarioRevisionId,
      researchPlanItemId: job.researchPlanItemId,
      countryId: job.countryId,
      topicCode: job.topicCode,
      attemptCount: job.attemptCount,
      leaseToken,
    };
  }
  return null;
}

/** Commits a job result; lease loss aborts the commit. */
export async function commitJob(
  db: MarketDatabase,
  input: {
    jobId: string;
    leaseToken: string;
    status: "succeeded" | "failed" | "cancelled";
    resultSummary?: Record<string, unknown>;
    errorCode?: string;
    errorMessage?: string;
    stopReason?: string;
  },
): Promise<boolean> {
  const now = Date.now();
  const updated = await db
    .update(researchJobs)
    .set({
      status: input.status,
      finishedAt: now,
      resultSummaryJson: input.resultSummary === undefined ? null : JSON.stringify(input.resultSummary),
      lastErrorCode: input.errorCode ?? null,
      lastErrorMessage: input.errorMessage ?? null,
      stopReason: input.stopReason ?? null,
      leaseToken: null,
      leaseUntil: null,
    })
    .where(
      and(
        eq(researchJobs.id, input.jobId),
        eq(researchJobs.leaseToken, input.leaseToken),
        eq(researchJobs.status, "running"),
      ),
    )
    .returning({ id: researchJobs.id });
  if (updated.length === 0) return false;
  metrics.increment(METRIC_NAMES.researchJobsTotal, { status: input.status });

  await db
    .update(jobAttempts)
    .set({
      status: input.status === "succeeded" ? "succeeded" : input.status === "cancelled" ? "cancelled" : "failed",
      finishedAt: now,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
    })
    .where(
      and(
        eq(jobAttempts.researchJobId, input.jobId),
        eq(jobAttempts.leaseToken, input.leaseToken),
        eq(jobAttempts.status, "running"),
      ),
    );
  return true;
}

/** Extends the lease of a running job owned by this worker. */
export async function heartbeatJob(
  db: MarketDatabase,
  jobId: string,
  leaseToken: string,
  leaseMs: number,
): Promise<boolean> {
  const updated = await db
    .update(researchJobs)
    .set({ leaseUntil: Date.now() + leaseMs, heartbeatAt: Date.now() })
    .where(
      and(
        eq(researchJobs.id, jobId),
        eq(researchJobs.leaseToken, leaseToken),
        eq(researchJobs.status, "running"),
      ),
    )
    .returning({ id: researchJobs.id });
  return updated.length > 0;
}

/** Requeues or fails jobs whose leases expired (Lease Reaper). */
export async function reapExpiredLeases(db: MarketDatabase, backoffMs: number): Promise<number> {
  const now = Date.now();
  const expired = await db
    .select()
    .from(researchJobs)
    .where(and(eq(researchJobs.status, "running"), lte(researchJobs.leaseUntil, now)));

  let reaped = 0;
  for (const job of expired) {
    await db
      .update(jobAttempts)
      .set({ status: "lease_lost", finishedAt: now, errorCode: "JOB_LEASE_LOST" })
      .where(
        and(
          eq(jobAttempts.researchJobId, job.id),
          eq(jobAttempts.status, "running"),
        ),
      );
    if (job.attemptCount < job.maxAttempts) {
      await db
        .update(researchJobs)
        .set({
          status: "queued",
          workerId: null,
          leaseToken: null,
          leaseUntil: null,
          nextRetryAt: now + backoffMs,
          lastErrorCode: "JOB_LEASE_LOST",
          lastErrorMessage: "lease expired before commit",
        })
        .where(eq(researchJobs.id, job.id));
    } else {
      await db
        .update(researchJobs)
        .set({
          status: "failed",
          finishedAt: now,
          workerId: null,
          leaseToken: null,
          leaseUntil: null,
          lastErrorCode: "JOB_LEASE_LOST",
          lastErrorMessage: "lease expired and attempts exhausted",
        })
        .where(eq(researchJobs.id, job.id));
    }
    reaped += 1;
  }
  return reaped;
}

/** True when no queued/running job remains for the scan. */
export async function scanHasActiveJobs(db: MarketDatabase, scanRunId: string): Promise<boolean> {
  const rows = await db
    .select({ id: researchJobs.id })
    .from(researchJobs)
    .where(
      and(eq(researchJobs.scanRunId, scanRunId), inArray(researchJobs.status, ["queued", "running"])),
    )
    .limit(1);
  return rows.length > 0;
}

/** Cancels queued jobs of a scan; running jobs stop via the cancel flag. */
export async function cancelQueuedJobs(db: MarketDatabase, scanRunId: string): Promise<number> {
  const now = Date.now();
  const updated = await db
    .update(researchJobs)
    .set({ status: "cancelled", cancelledAt: now, stopReason: "scan_cancelled" })
    .where(and(eq(researchJobs.scanRunId, scanRunId), eq(researchJobs.status, "queued")))
    .returning({ id: researchJobs.id });
  return updated.length;
}

export async function getScanStatus(db: MarketDatabase, scanRunId: string): Promise<string | null> {
  const rows = await db
    .select({ status: scanRuns.status })
    .from(scanRuns)
    .where(eq(scanRuns.id, scanRunId));
  return rows[0]?.status ?? null;
}
