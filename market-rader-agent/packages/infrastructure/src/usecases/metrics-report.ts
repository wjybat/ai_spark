import { METRIC_NAMES } from "../observability/metrics.js";
import type { MarketDatabase } from "../db/connection.js";
import {
  aiRuns,
  evidenceCandidates,
  evidenceClaims,
  researchJobs,
  scanRuns,
  toolCallLogs,
} from "../db/schema.js";
import { sql } from "drizzle-orm";

interface GroupCount {
  readonly key: string;
  readonly value: number;
}

function renderCounter(name: string, series: readonly GroupCount[]): string {
  const lines = [`# TYPE ${name} counter`];
  for (const item of series) {
    lines.push(`${name}${item.key} ${item.value}`);
  }
  return lines.join("\n");
}

function keyFrom(labels: Record<string, string>): string {
  const entries = Object.entries(labels).filter(([, value]) => value !== null && value !== "");
  if (entries.length === 0) return "";
  entries.sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([k, v]) => `${k}="${v}"`).join(",")}}`;
}

/**
 * Business metrics aggregated straight from the database so they are correct
 * across the web and worker processes and survive restarts.
 */
export async function renderBusinessMetrics(db: MarketDatabase): Promise<string> {
  const blocks: string[] = [];

  const scanCounts = await db
    .select({
      mode: sql<string>`case when model_name = 'fixture' then 'fixture' else 'research' end`,
      status: scanRuns.status,
      count: sql<number>`count(*)`,
    })
    .from(scanRuns)
    .groupBy(sql`1`, scanRuns.status);

  const jobCounts = await db
    .select({ status: researchJobs.status, count: sql<number>`count(*)` })
    .from(researchJobs)
    .groupBy(researchJobs.status);

  const aiCounts = await db
    .select({
      purpose: aiRuns.purpose,
      status: aiRuns.status,
      count: sql<number>`count(*)`,
    })
    .from(aiRuns)
    .groupBy(aiRuns.purpose, aiRuns.status);

  const toolCounts = await db
    .select({
      tool: toolCallLogs.toolName,
      status: toolCallLogs.status,
      count: sql<number>`count(*)`,
    })
    .from(toolCallLogs)
    .groupBy(toolCallLogs.toolName, toolCallLogs.status);

  const candidateCounts = await db
    .select({ status: evidenceCandidates.validationStatus, count: sql<number>`count(*)` })
    .from(evidenceCandidates)
    .groupBy(evidenceCandidates.validationStatus);

  const claimCounts = await db
    .select({ status: evidenceClaims.verificationStatus, count: sql<number>`count(*)` })
    .from(evidenceClaims)
    .groupBy(evidenceClaims.verificationStatus);

  blocks.push(
    renderCounter(
      METRIC_NAMES.scansTotal,
      scanCounts.map((row) => ({ key: keyFrom({ mode: row.mode, status: row.status }), value: row.count })),
    ),
    renderCounter(
      METRIC_NAMES.researchJobsTotal,
      jobCounts.map((row) => ({ key: keyFrom({ status: row.status }), value: row.count })),
    ),
    renderCounter(
      METRIC_NAMES.aiRunsTotal,
      aiCounts.map((row) => ({ key: keyFrom({ purpose: row.purpose, status: row.status }), value: row.count })),
    ),
    renderCounter(
      METRIC_NAMES.toolCallsTotal,
      toolCounts.map((row) => ({ key: keyFrom({ tool: row.tool, status: row.status }), value: row.count })),
    ),
    renderCounter(
      METRIC_NAMES.evidenceCandidatesTotal,
      candidateCounts.map((row) => ({ key: keyFrom({ status: row.status }), value: row.count })),
    ),
    renderCounter(
      "verified_claims_total",
      claimCounts.map((row) => ({ key: keyFrom({ status: row.status }), value: row.count })),
    ),
  );

  return `${blocks.join("\n")}\n`;
}
