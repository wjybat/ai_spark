import type { DimensionCode } from "@market-radar/contracts";

/** Verified claim projected for engine consumption. */
export interface ClaimEvidence {
  readonly claimId: string;
  readonly predicateCode: string;
  readonly countryId: string;
  readonly subjectEntityType: string;
  readonly subjectEntityId: string | null;
  readonly subjectText: string;
  readonly numericValue: number | null;
  readonly textValue: string | null;
  readonly unit: string | null;
  readonly observedAt: string | null;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly sourceQualityBps: number;
  readonly originClusterId: string | null;
  readonly sourceSnapshotId: string;
  readonly disputed: boolean;
}

export interface MetricConfig {
  readonly id: string;
  readonly metricCode: string;
  readonly dimensionCode: DimensionCode;
  readonly valueType: "integer" | "decimal" | "percent" | "ordinal" | "money_usd_millions";
  readonly direction: "higher_better" | "lower_better";
  readonly indicatorWeightBps: number;
  readonly aggregationMethod:
    | "latest_value"
    | "sum_from_observations"
    | "ratio_from_observations"
    | "cagr_from_observations"
    | "count_distinct"
    | "ordinal_from_evidence"
    | "binary_from_evidence"
    | "addressable_store_fallback"
    | "estimated_acv_from_customer_base"
    | "competition_from_market_structure"
    | "localization_friction_from_partner"
    | "expanding_share_from_origins"
    | "qualified_store_base_from_retailers"
    | "qualified_retailer_count_from_observed_retailers"
    | "portfolio_cagr_from_retailer_observations"
    | "retailer_growth_from_store_counts";
  readonly aggregationConfig: Readonly<Record<string, unknown>>;
  readonly normalizationMethod:
    | "piecewise_linear"
    | "ordinal_rubric"
    | "binary_gate"
    | "reference_percentile"
    | "identity_bps";
  readonly normalizationConfig: Readonly<Record<string, unknown>>;
  readonly freshnessWindowDays: number;
  readonly minimumVerifiedClaims: number;
  readonly minimumIndependentSources: number;
  readonly critical: boolean;
}

export type AggregatedValue =
  | { readonly kind: "numeric"; readonly value: number }
  | { readonly kind: "ordinal"; readonly level: string }
  | { readonly kind: "boolean"; readonly value: boolean };

export type MetricStatus = "available" | "insufficient_evidence" | "disputed" | "blocked";

export interface MetricEvaluation {
  readonly metricId: string;
  readonly metricCode: string;
  readonly dimensionCode: DimensionCode;
  readonly status: MetricStatus;
  readonly raw: AggregatedValue | null;
  readonly normalizedBps: number | null;
  readonly coverageBps: number;
  readonly sourceQualityBps: number;
  readonly freshnessBps: number;
  readonly consistencyBps: number;
  readonly independenceBps: number;
  readonly evidenceQualityIndexBps: number;
  readonly claimIds: readonly string[];
}

export type DimensionStatus = "available" | "insufficient_evidence" | "blocked";

export interface DimensionEvaluation {
  readonly dimensionCode: DimensionCode;
  readonly status: DimensionStatus;
  readonly scoreBps: number | null;
  readonly coverageBps: number;
  readonly evidenceQualityIndexBps: number;
  readonly metricCodes: readonly string[];
}

export type Priority = "p1" | "p2" | "p3" | "watch" | "hold" | "insufficient_evidence";
export type ResultStatus = "published" | "provisional" | "blocked" | "insufficient_evidence";
export type RankStability =
  | "stable"
  | "moderately_sensitive"
  | "highly_sensitive"
  | "not_ranked";

export interface PriorityRules {
  readonly p1: { readonly opportunity_min_bps: number; readonly entry_difficulty_max_bps: number; readonly coverage_min_bps: number; readonly eqi_min_bps: number };
  readonly p2_opportunity_min_bps: number;
  readonly p2_entry_difficulty_max_bps: number;
  readonly p3_opportunity_min_bps: number;
}

export interface CoverageGates {
  readonly overallBps: number;
  readonly dimensionScoreBps: number;
  readonly dimensionBps: Readonly<Partial<Record<DimensionCode, number>>>;
}

export interface CountryEvaluation {
  readonly countryId: string;
  readonly dimensions: readonly DimensionEvaluation[];
  readonly metrics: readonly MetricEvaluation[];
  readonly marketAttractivenessBps: number | null;
  readonly entryEaseBps: number | null;
  readonly entryDifficultyBps: number | null;
  readonly opportunityScoreBps: number | null;
  readonly coverageBps: number;
  readonly evidenceQualityIndexBps: number;
  readonly priority: Priority;
  readonly resultStatus: ResultStatus;
  readonly blockers: readonly string[];
  readonly dataAsOf: string | null;
}
