/**
 * Basis points: database stores 0..10000; API exposes 0..100 with at most two decimals.
 */
declare const basisPointBrand: unique symbol;
export type BasisPoint = number & { readonly [basisPointBrand]: "BasisPoint" };

export const MAX_BPS = 10_000;

export function isBasisPoint(value: number): value is BasisPoint {
  return Number.isInteger(value) && value >= 0 && value <= MAX_BPS;
}

export function assertBasisPoint(value: number, label = "value"): BasisPoint {
  if (!isBasisPoint(value)) {
    throw new RangeError(`Invalid basis point ${label}: expected an integer in [0, 10000], received ${value}.`);
  }
  return value;
}

export function clampBps(value: number): BasisPoint {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Cannot clamp a non-finite value: ${value}`);
  }
  return Math.min(MAX_BPS, Math.max(0, Math.round(value))) as BasisPoint;
}

/** Converts an API ratio in [0, 100] to basis points. */
export function bpsFromRatio(ratio: number, label = "ratio"): BasisPoint {
  if (!Number.isFinite(ratio)) {
    throw new RangeError(`Cannot convert ${label} to basis points: ${ratio} is not finite.`);
  }
  return assertBasisPoint(Math.round(ratio * 100), label);
}

/** Converts basis points to an API ratio with at most two decimals. */
export function bpsToRatio(value: BasisPoint): number {
  return Math.round(value) / 100;
}

/** Integer contribution: round(score_bps * weight_bps / 10000). */
export function contributionBps(scoreBps: BasisPoint, weightBps: BasisPoint): BasisPoint {
  return Math.round((scoreBps * weightBps) / MAX_BPS) as BasisPoint;
}
