export { aggregate } from "./engine/aggregate.js";
export { normalize } from "./engine/normalize.js";
export {
  consistencyBps,
  evidenceQualityIndexBps,
  freshnessBps,
  independenceBps,
  sourceQualityBps,
  INDEPENDENCE_TIERS,
} from "./engine/quality.js";
export { CALCULATION_VERSION, evaluateMetric } from "./engine/metric.js";
export { DIMENSION_COVERAGE_THRESHOLD_BPS, evaluateCountry, evaluateDimension } from "./engine/scoring.js";
export { computeRankStability, rankCountries } from "./engine/rank.js";
export type {
  AggregatedValue,
  ClaimEvidence,
  CountryEvaluation,
  CoverageGates,
  DimensionEvaluation,
  DimensionStatus,
  MetricConfig,
  MetricEvaluation,
  MetricStatus,
  Priority,
  PriorityRules,
  RankStability,
  ResultStatus,
} from "./engine/types.js";
