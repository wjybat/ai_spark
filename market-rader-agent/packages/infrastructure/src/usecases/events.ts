import { and, asc, desc, eq, gt } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { countries, researchJobs, scanEvents, scanRuns } from "../db/schema.js";

export interface ScanEventItem {
  readonly id: number;
  readonly event_type: string;
  readonly stage: string;
  readonly country_id: string | null;
  readonly topic_code: string | null;
  readonly message_code: string;
  readonly payload: unknown;
  readonly created_at: number;
}

export async function appendScanEvent(
  db: MarketDatabase,
  scanRunId: string,
  eventType: string,
  stage: string,
  messageCode: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(scanEvents).values({
    scanRunId,
    eventType,
    stage,
    messageCode,
    payloadJson: JSON.stringify(payload),
    createdAt: Date.now(),
  });
}

/** Events after the given cursor (used by SSE with Last-Event-ID). */
export async function getScanEvents(
  db: MarketDatabase,
  scanRunId: string,
  afterId: number,
  limit = 100,
): Promise<ScanEventItem[]> {
  const rows = await db
    .select()
    .from(scanEvents)
    .where(and(eq(scanEvents.scanRunId, scanRunId), gt(scanEvents.id, afterId)))
    .orderBy(asc(scanEvents.id))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    event_type: row.eventType,
    stage: row.stage,
    country_id: row.countryId,
    topic_code: row.topicCode,
    message_code: row.messageCode,
    payload: JSON.parse(row.payloadJson) as unknown,
    created_at: row.createdAt,
  }));
}

export function displayJobStatus(status: string, stopReason: string | null): string {
  return status === "succeeded" && stopReason === "insufficient_evidence"
    ? "insufficient_evidence"
    : status;
}

export interface ScanJobItem {
  readonly job_id: string;
  readonly country_id: string;
  readonly country_iso2: string;
  readonly topic_code: string;
  readonly status: string;
  readonly attempt_count: number;
  readonly max_attempts: number;
  readonly last_error_message: string | null;
  readonly stop_reason: string | null;
  readonly created_at: number;
}

export async function getScanJobs(db: MarketDatabase, scanRunId: string): Promise<ScanJobItem[]> {
  const rows = await db
    .select({ job: researchJobs, country: countries })
    .from(researchJobs)
    .leftJoin(countries, eq(countries.id, researchJobs.countryId))
    .where(eq(researchJobs.scanRunId, scanRunId))
    .orderBy(desc(researchJobs.createdAt))
    .limit(200);
  return rows.map(({ job, country }) => ({
    job_id: job.id,
    country_id: job.countryId,
    country_iso2: country?.iso2 ?? job.countryId,
    topic_code: job.topicCode,
    status: displayJobStatus(job.status, job.stopReason),
    attempt_count: job.attemptCount,
    max_attempts: job.maxAttempts,
    last_error_message: job.lastErrorMessage,
    stop_reason: job.stopReason,
    created_at: job.createdAt,
  }));
}

export async function isScanTerminal(db: MarketDatabase, scanRunId: string): Promise<boolean> {
  const rows = await db
    .select({ status: scanRuns.status })
    .from(scanRuns)
    .where(eq(scanRuns.id, scanRunId));
  const status = rows[0]?.status;
  return status !== undefined && ["completed", "partial", "failed", "cancelled", "stale"].includes(status);
}
