import type { ClaimEvidence } from "./types.js";

const MS_PER_DAY = 86_400_000;

export const INDEPENDENCE_TIERS = [3_000, 6_000, 8_000, 10_000] as const;

/** Best (highest) source quality among contributing claims. */
export function sourceQualityBps(claims: readonly ClaimEvidence[]): number {
  if (claims.length === 0) return 0;
  return Math.max(...claims.map((claim) => claim.sourceQualityBps));
}

/**
 * Freshness: 10000 within the window, linear decay to 0 across the second window.
 * Claims without any date score 0.
 */
export function freshnessBps(
  claims: readonly ClaimEvidence[],
  freshnessWindowDays: number,
  asOfMs: number,
): number {
  const dates = claims
    .map((claim) => {
      if (claim.observedAt !== null) return Date.parse(claim.observedAt);
      if (claim.effectiveFrom !== null) return Date.parse(claim.effectiveFrom);
      return Number.NaN;
    })
    .filter((ms) => !Number.isNaN(ms));
  if (dates.length === 0) return 0;
  const ageMs = asOfMs - Math.max(...dates);
  const windowMs = freshnessWindowDays * MS_PER_DAY;
  if (ageMs <= windowMs) return 10_000;
  if (ageMs >= 2 * windowMs) return 0;
  return Math.round(10_000 - ((ageMs - windowMs) / windowMs) * 10_000);
}

/** Distinct origin clusters (snapshot fallback) mapped onto independence tiers. */
export function independenceBps(claims: readonly ClaimEvidence[]): number {
  const clusters = new Set(
    claims.map((claim) => claim.originClusterId ?? claim.sourceSnapshotId),
  );
  const size = clusters.size;
  if (size <= 0) return 0;
  if (size >= 4) return 10_000;
  return INDEPENDENCE_TIERS[size - 1] ?? 0;
}

/** Relative spread of numeric values drives consistency; disputes zero it out. */
export function consistencyBps(claims: readonly ClaimEvidence[]): number {
  if (claims.some((claim) => claim.disputed)) return 0;
  const values = claims
    .map((claim) => claim.numericValue)
    .filter((value): value is number => value !== null);
  if (values.length <= 1) return 10_000;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return max === min ? 10_000 : 2_500;
  const spread = (max - min) / Math.abs(mean);
  if (spread <= 0.1) return 10_000;
  if (spread <= 0.25) return 7_500;
  if (spread <= 0.5) return 5_000;
  return 2_500;
}

/** EQI: integer weighted blend, single rounding at the end. */
export function evidenceQualityIndexBps(input: {
  sourceQuality: number;
  freshness: number;
  coverage: number;
  consistency: number;
  independence: number;
}): number {
  const total =
    input.sourceQuality * 3_000 +
    input.freshness * 2_000 +
    input.coverage * 3_000 +
    input.consistency * 1_500 +
    input.independence * 500;
  return Math.round(total / 10_000);
}
