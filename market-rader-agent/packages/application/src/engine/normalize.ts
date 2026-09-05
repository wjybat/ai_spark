import type { AggregatedValue, MetricConfig } from "./types.js";

interface Anchor {
  readonly raw: number;
  readonly scoreBps: number;
}

function parseAnchors(config: Readonly<Record<string, unknown>>): Anchor[] {
  const raw = config["anchors"];
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("piecewise_linear normalization requires at least two anchors.");
  }
  const anchors = raw.map((entry) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("Invalid anchor entry.");
    }
    const record = entry as Record<string, unknown>;
    const rawValue = record["raw"];
    const score = record["score_bps"];
    if (typeof rawValue !== "string" && typeof rawValue !== "number") {
      throw new Error("Anchor raw must be a decimal string or number.");
    }
    if (typeof score !== "number") {
      throw new Error("Anchor score_bps must be a number.");
    }
    return { raw: Number(rawValue), scoreBps: score };
  });
  for (let index = 1; index < anchors.length; index += 1) {
    if (anchors[index]!.raw <= anchors[index - 1]!.raw) {
      throw new Error("Anchor raw values must be strictly increasing.");
    }
  }
  return anchors;
}

function piecewiseLinear(anchors: readonly Anchor[], value: number): number {
  const first = anchors[0]!;
  const last = anchors[anchors.length - 1]!;
  if (value <= first.raw) return first.scoreBps;
  if (value >= last.raw) return last.scoreBps;
  for (let index = 1; index < anchors.length; index += 1) {
    const upper = anchors[index]!;
    const lower = anchors[index - 1]!;
    if (value <= upper.raw) {
      const ratio = (value - lower.raw) / (upper.raw - lower.raw);
      return Math.round(lower.scoreBps + ratio * (upper.scoreBps - lower.scoreBps));
    }
  }
  return last.scoreBps;
}

function ordinalRubric(
  config: Readonly<Record<string, unknown>>,
  level: string,
): number {
  const levels = config["levels"];
  const scores = config["scores_bps"];
  if (!Array.isArray(levels) || !Array.isArray(scores) || levels.length !== scores.length) {
    throw new Error("ordinal_rubric requires matching levels and scores_bps arrays.");
  }
  const index = levels.indexOf(level);
  if (index === -1) {
    throw new Error(`Unknown ordinal level "${level}".`);
  }
  const score: unknown = scores[index];
  if (typeof score !== "number") {
    throw new Error("ordinal_rubric scores_bps must be numbers.");
  }
  return score;
}

/** Deterministic normalization of a raw value into basis points. */
export function normalize(metric: MetricConfig, value: AggregatedValue): number | null {
  switch (metric.normalizationMethod) {
    case "piecewise_linear": {
      if (value.kind !== "numeric") return null;
      return piecewiseLinear(parseAnchors(metric.normalizationConfig), value.value);
    }
    case "ordinal_rubric": {
      if (value.kind !== "ordinal") return null;
      return ordinalRubric(metric.normalizationConfig, value.level);
    }
    case "binary_gate": {
      if (value.kind === "boolean") return value.value ? 10_000 : 0;
      if (value.kind === "ordinal") {
        return value.level === "yes" || value.level === "true" ? 10_000 : 0;
      }
      return null;
    }
    case "identity_bps": {
      if (value.kind !== "numeric") return null;
      return Math.round(value.value);
    }
    case "reference_percentile":
      throw new Error("reference_percentile normalization is not implemented in MVP.");
    default:
      return null;
  }
}
