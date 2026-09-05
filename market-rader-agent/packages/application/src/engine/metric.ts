import { aggregate } from "./aggregate.js";
import { normalize } from "./normalize.js";
import {
  consistencyBps,
  evidenceQualityIndexBps,
  freshnessBps,
  independenceBps,
  sourceQualityBps,
} from "./quality.js";
import type { ClaimEvidence, MetricConfig, MetricEvaluation, MetricStatus } from "./types.js";

export const CALCULATION_VERSION = "engine-1.4.0";

/** Evaluates one metric from its verified claims. Missing data never becomes zero. */
export function evaluateMetric(
  metric: MetricConfig,
  claims: readonly ClaimEvidence[],
  asOfMs: number,
): MetricEvaluation {
  // claims passed in are already predicate-filtered upstream for this metric.
  const eligible = claims;
  const clusters = new Set(eligible.map((c) => c.originClusterId ?? c.sourceSnapshotId)).size;
  const disputed = eligible.some((c) => c.disputed);

  const enoughClaims = eligible.length >= metric.minimumVerifiedClaims;
  const enoughSources = clusters >= metric.minimumIndependentSources;

  const quality = {
    sourceQualityBps: sourceQualityBps(eligible),
    freshnessBps: freshnessBps(eligible, metric.freshnessWindowDays, asOfMs),
    consistencyBps: consistencyBps(eligible),
    independenceBps: independenceBps(eligible),
  };

  if (disputed) {
    return {
      metricId: metric.id,
      metricCode: metric.metricCode,
      dimensionCode: metric.dimensionCode,
      status: "disputed",
      raw: null,
      normalizedBps: null,
      coverageBps: 0,
      ...quality,
      evidenceQualityIndexBps: evidenceQualityIndexBps({
        sourceQuality: quality.sourceQualityBps,
        freshness: quality.freshnessBps,
        coverage: 0,
        consistency: quality.consistencyBps,
        independence: quality.independenceBps,
      }),
      claimIds: eligible.map((c) => c.claimId),
    } satisfies MetricEvaluation;
  }

  if (!enoughClaims || !enoughSources) {
    return {
      metricId: metric.id,
      metricCode: metric.metricCode,
      dimensionCode: metric.dimensionCode,
      status: "insufficient_evidence",
      raw: null,
      normalizedBps: null,
      coverageBps: 0,
      ...quality,
      evidenceQualityIndexBps: evidenceQualityIndexBps({
        sourceQuality: quality.sourceQualityBps,
        freshness: quality.freshnessBps,
        coverage: 0,
        consistency: quality.consistencyBps,
        independence: quality.independenceBps,
      }),
      claimIds: eligible.map((c) => c.claimId),
    } satisfies MetricEvaluation;
  }

  const raw = aggregate(metric, eligible);
  if (raw === null) {
    const status: MetricStatus = "insufficient_evidence";
    return {
      metricId: metric.id,
      metricCode: metric.metricCode,
      dimensionCode: metric.dimensionCode,
      status,
      raw: null,
      normalizedBps: null,
      coverageBps: 0,
      ...quality,
      evidenceQualityIndexBps: evidenceQualityIndexBps({
        sourceQuality: quality.sourceQualityBps,
        freshness: quality.freshnessBps,
        coverage: 0,
        consistency: quality.consistencyBps,
        independence: quality.independenceBps,
      }),
      claimIds: eligible.map((c) => c.claimId),
    } satisfies MetricEvaluation;
  }

  let normalizedBps: number | null;
  try {
    normalizedBps = normalize(metric, raw);
  } catch (error) {
    // A verified claim may predate stricter ingress validation. Treat an
    // unknown submitted ordinal as unusable evidence rather than aborting the
    // whole multi-country score run. Configuration errors must still surface.
    if (!(error instanceof Error) || !error.message.startsWith("Unknown ordinal level")) {
      throw error;
    }
    return {
      metricId: metric.id,
      metricCode: metric.metricCode,
      dimensionCode: metric.dimensionCode,
      status: "insufficient_evidence",
      raw: null,
      normalizedBps: null,
      coverageBps: 0,
      ...quality,
      evidenceQualityIndexBps: evidenceQualityIndexBps({
        sourceQuality: quality.sourceQualityBps,
        freshness: quality.freshnessBps,
        coverage: 0,
        consistency: quality.consistencyBps,
        independence: quality.independenceBps,
      }),
      claimIds: eligible.map((claim) => claim.claimId),
    } satisfies MetricEvaluation;
  }

  return {
    metricId: metric.id,
    metricCode: metric.metricCode,
    dimensionCode: metric.dimensionCode,
    status: "available",
    raw,
    normalizedBps,
    coverageBps: normalizedBps === null ? 0 : 10_000,
    ...quality,
    evidenceQualityIndexBps: evidenceQualityIndexBps({
      sourceQuality: quality.sourceQualityBps,
      freshness: quality.freshnessBps,
      coverage: normalizedBps === null ? 0 : 10_000,
      consistency: quality.consistencyBps,
      independence: quality.independenceBps,
    }),
    claimIds: eligible.map((c) => c.claimId),
  } satisfies MetricEvaluation;
}
