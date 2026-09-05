import type { DimensionCode } from "@market-radar/contracts";

import type {
  CountryEvaluation,
  CoverageGates,
  DimensionEvaluation,
  MetricConfig,
  MetricEvaluation,
  Priority,
  PriorityRules,
  ResultStatus,
} from "./types.js";

export const DIMENSION_COVERAGE_THRESHOLD_BPS = 6_000;

/** Dimension score: coverage-gated, renormalized over available indicators. */
export function evaluateDimension(
  dimension: DimensionCode,
  metrics: readonly MetricConfig[],
  evaluations: readonly MetricEvaluation[],
  minimumCoverageBps = DIMENSION_COVERAGE_THRESHOLD_BPS,
): DimensionEvaluation {
  const dimensionMetrics = metrics.filter((metric) => metric.dimensionCode === dimension);
  const dimensionEvaluations = evaluations.filter((evaluation) =>
    dimensionMetrics.some((metric) => metric.id === evaluation.metricId),
  );
  const totalWeight = dimensionMetrics.reduce((sum, m) => sum + m.indicatorWeightBps, 0);
  const available = dimensionEvaluations.filter((e) => e.status === "available" && e.normalizedBps !== null);
  const availableWeight = dimensionMetrics
    .filter((metric) => available.some((e) => e.metricId === metric.id))
    .reduce((sum, m) => sum + m.indicatorWeightBps, 0);

  const coverageBps = totalWeight === 0 ? 0 : Math.round((availableWeight / totalWeight) * 10_000);
  const eqi =
    availableWeight === 0
      ? 0
      : Math.round(
          dimensionMetrics
            .filter((metric) => available.some((e) => e.metricId === metric.id))
            .reduce(
              (sum, metric) =>
                sum +
                metric.indicatorWeightBps *
                  (available.find((e) => e.metricId === metric.id)?.evidenceQualityIndexBps ?? 0),
              0,
            ) / availableWeight,
        );

  if (availableWeight === 0 || coverageBps < minimumCoverageBps) {
    return {
      dimensionCode: dimension,
      status: "insufficient_evidence",
      scoreBps: null,
      coverageBps,
      evidenceQualityIndexBps: eqi,
      metricCodes: dimensionEvaluations.map((e) => e.metricCode),
    };
  }

  const scoreBps = Math.round(
    dimensionMetrics
      .filter((metric) => available.some((e) => e.metricId === metric.id))
      .reduce(
        (sum, metric) =>
          sum +
          (metric.indicatorWeightBps * (available.find((e) => e.metricId === metric.id)?.normalizedBps ?? 0)) /
            availableWeight,
        0,
      ),
  );

  return {
    dimensionCode: dimension,
    status: "available",
    scoreBps,
    coverageBps,
    evidenceQualityIndexBps: eqi,
    metricCodes: dimensionEvaluations.map((e) => e.metricCode),
  };
}

function weightedDimensionScore(
  dimensions: readonly DimensionEvaluation[],
  weights: Readonly<Record<DimensionCode, number>>,
  include: readonly DimensionCode[],
): number | null {
  const usable = dimensions.filter(
    (dimension) =>
      include.includes(dimension.dimensionCode) &&
      dimension.status === "available" &&
      dimension.scoreBps !== null,
  );
  const totalWeight = usable.reduce((sum, d) => sum + (weights[d.dimensionCode] ?? 0), 0);
  if (totalWeight === 0) return null;
  return Math.round(
    usable.reduce(
      (sum, d) => sum + ((weights[d.dimensionCode] ?? 0) * (d.scoreBps ?? 0)) / totalWeight,
      0,
    ),
  );
}

export interface EvaluateCountryInput {
  readonly countryId: string;
  readonly metrics: readonly MetricConfig[];
  readonly metricEvaluations: readonly MetricEvaluation[];
  readonly dimensionEvaluations: readonly DimensionEvaluation[];
  readonly weights: Readonly<Record<DimensionCode, number>>;
  readonly priorityRules: PriorityRules;
  readonly coverageGates: CoverageGates;
  readonly blockers: readonly string[];
  readonly dataAsOf: string | null;
}

export function evaluateCountry(input: EvaluateCountryInput): CountryEvaluation {
  const { metrics, metricEvaluations, dimensionEvaluations, weights } = input;

  const totalWeight = metrics.reduce((sum, m) => sum + m.indicatorWeightBps, 0);
  const availableWeight = metricEvaluations
    .filter((e) => e.status === "available" && e.normalizedBps !== null)
    .reduce(
      (sum, e) => sum + (metrics.find((m) => m.id === e.metricId)?.indicatorWeightBps ?? 0),
      0,
    );
  const coverageBps = totalWeight === 0 ? 0 : Math.round((availableWeight / totalWeight) * 10_000);

  const overallEqi =
    availableWeight === 0
      ? 0
      : Math.round(
          metricEvaluations
            .filter((e) => e.status === "available" && e.normalizedBps !== null)
            .reduce(
              (sum, e) =>
                sum +
                (metrics.find((m) => m.id === e.metricId)?.indicatorWeightBps ?? 0) *
                  e.evidenceQualityIndexBps,
              0,
            ) / availableWeight,
        );

  const attractivenessDimensions: DimensionCode[] = [
    "market_size",
    "growth",
    "expansion",
    "digital",
    "customer_value",
  ];
  const marketAttractivenessBps = weightedDimensionScore(
    dimensionEvaluations,
    weights,
    attractivenessDimensions,
  );
  const entryEaseBps =
    dimensionEvaluations.find((d) => d.dimensionCode === "entry_ease")?.scoreBps ?? null;
  const entryDifficultyBps = entryEaseBps === null ? null : 10_000 - entryEaseBps;
  const opportunityScoreBps = weightedDimensionScore(
    dimensionEvaluations,
    weights,
    ["market_size", "growth", "expansion", "digital", "customer_value", "entry_ease"],
  );

  const { priority, resultStatus } = classifyCountry({
    blockers: input.blockers,
    coverageBps,
    dimensionEvaluations,
    opportunityScoreBps,
    entryDifficultyBps,
    overallEqi,
    priorityRules: input.priorityRules,
    coverageGates: input.coverageGates,
  });

  return {
    countryId: input.countryId,
    dimensions: dimensionEvaluations,
    metrics: metricEvaluations,
    marketAttractivenessBps,
    entryEaseBps,
    entryDifficultyBps,
    opportunityScoreBps,
    coverageBps,
    evidenceQualityIndexBps: overallEqi,
    priority,
    resultStatus,
    blockers: input.blockers,
    dataAsOf: input.dataAsOf,
  };
}

function classifyCountry(input: {
  blockers: readonly string[];
  coverageBps: number;
  dimensionEvaluations: readonly DimensionEvaluation[];
  opportunityScoreBps: number | null;
  entryDifficultyBps: number | null;
  overallEqi: number;
  priorityRules: PriorityRules;
  coverageGates: CoverageGates;
}): { priority: Priority; resultStatus: ResultStatus } {
  // 1. Hard blockers take precedence over every average.
  if (input.blockers.length > 0) {
    return { priority: "hold", resultStatus: "blocked" };
  }

  // 2. Publishing gates.
  const dimensionGates = input.coverageGates.dimensionBps;
  const failedGates: string[] = [];
  if (input.coverageBps < input.coverageGates.overallBps) {
    failedGates.push("overall");
  }
  for (const [dimension, threshold] of Object.entries(dimensionGates)) {
    const evaluation = input.dimensionEvaluations.find((d) => d.dimensionCode === dimension);
    if ((evaluation?.coverageBps ?? 0) < (threshold ?? 0)) {
      failedGates.push(dimension);
    }
  }

  if (failedGates.length > 0) {
    const insufficient = input.coverageBps < 5_000;
    return {
      priority: "insufficient_evidence",
      resultStatus: insufficient ? "insufficient_evidence" : "provisional",
    };
  }

  const opportunity = input.opportunityScoreBps;
  const difficulty = input.entryDifficultyBps;
  if (opportunity === null || difficulty === null) {
    return { priority: "insufficient_evidence", resultStatus: "provisional" };
  }

  // 3-6. Priority ladder.
  const p1 = input.priorityRules.p1;
  if (
    opportunity >= p1.opportunity_min_bps &&
    difficulty <= p1.entry_difficulty_max_bps &&
    input.coverageBps >= p1.coverage_min_bps &&
    input.overallEqi >= p1.eqi_min_bps
  ) {
    return { priority: "p1", resultStatus: "published" };
  }
  if (
    (opportunity >= input.priorityRules.p2_opportunity_min_bps &&
      opportunity < p1.opportunity_min_bps) ||
    (difficulty > p1.entry_difficulty_max_bps && difficulty <= input.priorityRules.p2_entry_difficulty_max_bps)
  ) {
    return { priority: "p2", resultStatus: "published" };
  }
  if (opportunity >= input.priorityRules.p3_opportunity_min_bps) {
    return { priority: "p3", resultStatus: "published" };
  }
  return { priority: "watch", resultStatus: "published" };
}
