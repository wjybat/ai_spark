import { readFile } from "node:fs/promises";

import { canonicalHash, canonicalJson } from "@market-radar/domain";
import { z } from "zod";

export const dimensionCodes = [
  "market_size",
  "growth",
  "expansion",
  "digital",
  "customer_value",
  "entry_ease",
] as const;
export type DimensionCode = (typeof dimensionCodes)[number];

const code = z.string().regex(/^[a-z][a-z0-9_]*$/, "must be lower_snake_case");
const semanticVersion = z.string().regex(/^\d+\.\d+\.\d+$/, "must be semver x.y.z");
const status = z.enum(["draft", "published", "retired"]);
const bps = z.number().int().min(0).max(10_000);

/* ------------------------------- countries ------------------------------- */

export const countryFileSchema = z.object({
  version: semanticVersion,
  countries: z
    .array(
      z.object({
        id: code,
        iso2: z.string().length(2),
        iso3: z.string().length(3),
        name_en: z.string().min(1),
        name_local: z.string().nullish(),
        region_code: z.string().min(1),
        currency_code: z.string().length(3),
        timezone: z.string().min(1),
        research_languages: z.array(z.string().min(2).max(8)).min(1),
      }),
    )
    .min(1),
});

/* -------------------------------- regions -------------------------------- */

const regionCode = z.string().regex(/^[a-z][a-z0-9-]*$/, "must be lower-kebab-case");

export const marketRegionFileSchema = z
  .object({
    version: semanticVersion,
    default_region_code: regionCode,
    regions: z.array(z.object({
      code: regionCode,
      name_en: z.string().min(1),
      name_zh: z.string().min(1),
      country_scope: z.array(z.string().length(2)).min(1),
      metric_definition_set_code: code,
      metric_definition_set_version: semanticVersion,
      reference_set_code: code,
      reference_set_version: semanticVersion,
      scoring_model_code: code,
      scoring_model_version: semanticVersion,
      benchmark_status: z.enum(["regional", "shared_baseline", "provisional_shared_baseline"]),
    })).min(1),
  })
  .superRefine((file, ctx) => {
    const codes = file.regions.map((region) => region.code);
    if (new Set(codes).size !== codes.length) {
      ctx.addIssue({ code: "custom", message: "duplicate region code" });
    }
    if (!codes.includes(file.default_region_code)) {
      ctx.addIssue({ code: "custom", message: "default_region_code must identify a configured region" });
    }
    for (const region of file.regions) {
      if (new Set(region.country_scope).size !== region.country_scope.length) {
        ctx.addIssue({ code: "custom", message: `duplicate country in region ${region.code}` });
      }
    }
  });
export type MarketRegionFile = z.infer<typeof marketRegionFileSchema>;
export type MarketRegion = MarketRegionFile["regions"][number];

/* ----------------------------- retail formats ---------------------------- */

export const retailFormatFileSchema = z.object({
  version: semanticVersion,
  formats: z
    .array(
      z.object({
        code,
        name_en: z.string().min(1),
        taxonomy_version: semanticVersion,
      }),
    )
    .min(1),
});

/* ----------------------------- product profile --------------------------- */

export const productProfileSchema = z.object({
  code,
  version: semanticVersion,
  status,
  name: z.string().min(1),
  use_case: code,
  ideal_customer_store_count: z.number().int().min(1),
  supported_deployment_modes: z.array(z.enum(["edge", "hybrid", "cloud"])).min(1),
  camera_compatibility: z.array(z.string().min(1)).min(1),
  edge_hardware_requirement: z.enum(["supported", "required", "unsupported"]),
  cloud_requirement: z.enum(["optional", "required", "none"]),
  data_residency_capability: z.enum(["country_local_or_edge", "regional", "global"]),
  supported_languages: z.array(z.string().min(2)).min(1),
  integration_requirements: z.array(z.string().min(1)).min(1),
  sales_model: z.string().min(1),
  target_acv_band: z.object({
    currency: z.string().length(3),
    min_minor_units: z.number().int().min(0),
    max_minor_units: z.number().int().min(0),
  }),
  required_digital_readiness: z.enum(["low", "medium", "high"]),
  weight_profile_default: code,
  hard_blocker_rules: z.array(code).min(1),
});
export type ProductProfile = z.infer<typeof productProfileSchema>;

/* ----------------------------- weight profiles --------------------------- */

export const weightProfileSchema = z
  .object({
    code,
    version: semanticVersion,
    name: z.string().min(1),
    dimension_weights: z.record(z.enum(dimensionCodes), bps),
    status,
  })
  .superRefine((profile, ctx) => {
    const total = Object.values(profile.dimension_weights).reduce((sum, value) => sum + value, 0);
    if (total !== 10_000) {
      ctx.addIssue({
        code: "custom",
        message: `dimension weights must sum to 10000, received ${total}`,
      });
    }
    for (const dimension of dimensionCodes) {
      if (profile.dimension_weights[dimension] === undefined) {
        ctx.addIssue({ code: "custom", message: `missing dimension weight: ${dimension}` });
      }
    }
  });
export type WeightProfile = z.infer<typeof weightProfileSchema>;

/* --------------------------- metric definition set ------------------------ */

export const aggregationMethods = [
  "latest_value",
  "sum_from_observations",
  "ratio_from_observations",
  "cagr_from_observations",
  "count_distinct",
  "ordinal_from_evidence",
  "binary_from_evidence",
  "addressable_store_fallback",
  "estimated_acv_from_customer_base",
  "competition_from_market_structure",
  "localization_friction_from_partner",
  "expanding_share_from_origins",
  "qualified_store_base_from_retailers",
  "qualified_retailer_count_from_observed_retailers",
  "portfolio_cagr_from_retailer_observations",
  "retailer_growth_from_store_counts",
] as const;

export const normalizationMethods = [
  "piecewise_linear",
  "ordinal_rubric",
  "binary_gate",
  "reference_percentile",
  "identity_bps",
] as const;

export const metricDefinitionSchema = z.object({
  metric_code: code,
  dimension_code: z.enum(dimensionCodes),
  name: z.string().min(1),
  description: z.string().default(""),
  value_type: z.enum(["integer", "decimal", "percent", "ordinal", "money_usd_millions"]),
  raw_unit: z.string().nullish(),
  direction: z.enum(["higher_better", "lower_better"]),
  indicator_weight_bps: bps,
  aggregation_method: z.enum(aggregationMethods),
  aggregation_config: z.record(z.string(), z.unknown()).default({}),
  normalization_method: z.enum(normalizationMethods),
  normalization_config: z.record(z.string(), z.unknown()).default({}),
  reference_set_code: code.nullish(),
  freshness_window_days: z.number().int().min(1).default(730),
  minimum_verified_claims: z.number().int().min(1).default(1),
  minimum_independent_sources: z.number().int().min(1).default(1),
  critical: z.boolean().default(false),
  missing_data_policy: z.enum(["unknown", "zero"]).default("unknown"),
  outlier_policy: z.enum(["clip_to_anchor_range", "keep"]).default("clip_to_anchor_range"),
  input_predicates: z.array(code).min(1),
  version: semanticVersion.default("1.0.0"),
  status: status.default("draft"),
});
export type MetricDefinition = z.infer<typeof metricDefinitionSchema>;

export const metricDefinitionSetSchema = z
  .object({
    code,
    version: semanticVersion,
    status,
    metrics: z.array(metricDefinitionSchema).min(1),
  })
  .superRefine((set, ctx) => {
    const seen = new Set<string>();
    for (const metric of set.metrics) {
      if (seen.has(metric.metric_code)) {
        ctx.addIssue({ code: "custom", message: `duplicate metric_code: ${metric.metric_code}` });
      }
      seen.add(metric.metric_code);
    }
    const byDimension = new Map<DimensionCode, number>();
    for (const metric of set.metrics) {
      byDimension.set(
        metric.dimension_code,
        (byDimension.get(metric.dimension_code) ?? 0) + metric.indicator_weight_bps,
      );
    }
    for (const [dimension, total] of byDimension) {
      if (total !== 10_000) {
        ctx.addIssue({
          code: "custom",
          message: `dimension ${dimension} indicator weights must sum to 10000, received ${total}`,
        });
      }
    }
    if (!byDimension.has("entry_ease")) {
      ctx.addIssue({ code: "custom", message: "metric set must define entry_ease indicators" });
    }
  });
export type MetricDefinitionSet = z.infer<typeof metricDefinitionSetSchema>;

/* ------------------------------ scoring model ---------------------------- */

export const scoringModelSchema = z.object({
  code,
  version: semanticVersion,
  metric_definition_set_code: code,
  opportunity_formula: z.object({
    dimensions: z.array(z.enum(dimensionCodes)).min(2),
    market_attractiveness_dimensions: z.array(z.enum(dimensionCodes)).min(2),
  }),
  priority_rules: z.record(z.string(), z.unknown()),
  hard_blocker_rules: z.array(code).min(1),
  minimum_coverage: z.object({
    overall_bps: bps,
    dimension_score_bps: bps.default(6_000),
    dimension_bps: z.record(z.string(), bps).default({}),
  }).superRefine((coverage, ctx) => {
    const valid = new Set<string>(dimensionCodes);
    for (const key of Object.keys(coverage.dimension_bps)) {
      if (!valid.has(key)) {
        ctx.addIssue({ code: "custom", message: `unknown dimension in minimum_coverage.dimension_bps: ${key}` });
      }
    }
  }),
  status,
});
export type ScoringModel = z.infer<typeof scoringModelSchema>;

/* ------------------------------ reference set ---------------------------- */

export const referenceSetSchema = z.object({
  code,
  version: semanticVersion,
  scope: z.object({ countries: z.array(z.string().length(2)).min(1) }),
  effective_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  config: z.record(z.string(), z.unknown()).default({}),
  status,
});
export type ReferenceSet = z.infer<typeof referenceSetSchema>;

/* ------------------------------ source quality --------------------------- */

export const sourceQualitySchema = z.object({
  code,
  version: semanticVersion,
  tiers: z.record(z.string().min(1), bps),
  status,
});

/* -------------------------------- predicates ----------------------------- */

export const predicateRegistrySchema = z.object({
  code,
  version: semanticVersion,
  predicates: z
    .array(
      z.object({
        code,
        value_type: z.enum(["integer", "decimal", "percent", "ordinal", "money_usd_millions"]),
        allowed_units: z.array(z.string().min(1)).default(["dimensionless"]),
        entity_scope: z.enum(["country", "retailer", "market"]),
        description: z.string().default(""),
      }),
    )
    .min(1),
});
export type PredicateRegistry = z.infer<typeof predicateRegistrySchema>;

/* --------------------------------- loader -------------------------------- */

export interface LoadedConfig<T> {
  readonly value: T;
  readonly canonicalJson: string;
  readonly hash: string;
}

export async function loadJsonConfig<S extends z.ZodTypeAny>(
  filePath: string,
  schema: S,
): Promise<LoadedConfig<z.infer<S>>> {
  const raw = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  const value = schema.parse(parsed);
  const canonical = canonicalJson(value);
  return { value, canonicalJson: canonical, hash: canonicalHash(value) };
}
