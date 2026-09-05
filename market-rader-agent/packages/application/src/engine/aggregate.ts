import type { AggregatedValue, ClaimEvidence, MetricConfig } from "./types.js";

const MS_PER_DAY = 86_400_000;

function dateMs(value: string | null): number | null {
  if (value === null) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function numericClaims(claims: readonly ClaimEvidence[]): ClaimEvidence[] {
  return claims.filter((claim) => claim.numericValue !== null);
}

function sortChronologically(claims: ClaimEvidence[]): ClaimEvidence[] {
  return [...claims].sort((a, b) => {
    const aMs = dateMs(a.effectiveFrom ?? a.observedAt) ?? 0;
    const bMs = dateMs(b.effectiveFrom ?? b.observedAt) ?? 0;
    if (aMs !== bMs) return aMs - bMs;
    return a.claimId < b.claimId ? -1 : 1;
  });
}

function latestClaim(claims: readonly ClaimEvidence[]): ClaimEvidence | null {
  if (claims.length === 0) return null;
  const sorted = [...claims].sort((a, b) => {
    const aMs = dateMs(a.observedAt ?? a.effectiveFrom) ?? 0;
    const bMs = dateMs(b.observedAt ?? b.effectiveFrom) ?? 0;
    if (aMs !== bMs) return bMs - aMs; // newest first
    return a.claimId < b.claimId ? -1 : 1;
  });
  return sorted[0] ?? null;
}

function latestNumericFor(
  claims: readonly ClaimEvidence[],
  predicate: string,
): number | null {
  return latestClaim(claims.filter((claim) => claim.predicateCode === predicate))?.numericValue ?? null;
}

function latestOrdinalFor(
  claims: readonly ClaimEvidence[],
  predicate: string,
): string | null {
  return latestClaim(claims.filter((claim) => claim.predicateCode === predicate))?.textValue ?? null;
}

function retailerKey(claim: ClaimEvidence): string | null {
  if (claim.subjectEntityType !== "retailer") return null;
  return claim.subjectEntityId ?? claim.subjectText.trim().toLowerCase();
}

function latestQualifiedRetailerCounts(
  claims: readonly ClaimEvidence[],
  minimumStoreCount: number,
): ClaimEvidence[] {
  const latestByRetailer = new Map<string, ClaimEvidence>();
  for (const claim of claims.filter(
    (item) => item.predicateCode === "retailer_store_count_actual" && item.numericValue !== null,
  )) {
    const key = retailerKey(claim);
    if (key === null) continue;
    const current = latestByRetailer.get(key);
    if (current === undefined || latestClaim([current, claim])?.claimId === claim.claimId) {
      latestByRetailer.set(key, claim);
    }
  }
  return [...latestByRetailer.values()].filter(
    (claim) => (claim.numericValue ?? 0) >= minimumStoreCount,
  );
}

function configuredNumber(
  config: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cagrForSeries(
  claims: readonly ClaimEvidence[],
  minimumYears: number,
  maximumYears: number,
): { cagr: number; weight: number } | null {
  const series = sortChronologically(numericClaims(claims));
  if (series.length < 2) return null;
  const targetYears = (minimumYears + maximumYears) / 2;

  // Prefer the most recent endpoint, then the pair closest to the requested
  // period. Using the absolute first/last observations incorrectly rejects an
  // annual metric once a third year has been collected.
  for (let endIndex = series.length - 1; endIndex > 0; endIndex -= 1) {
    const endClaim = series[endIndex]!;
    const endMs = dateMs(endClaim.effectiveFrom ?? endClaim.observedAt);
    const end = endClaim.numericValue ?? 0;
    if (endMs === null || end <= 0) continue;
    const candidates = series.slice(0, endIndex).flatMap((startClaim) => {
      const startMs = dateMs(startClaim.effectiveFrom ?? startClaim.observedAt);
      const start = startClaim.numericValue ?? 0;
      if (startMs === null || start <= 0 || startMs >= endMs) return [];
      const years = (endMs - startMs) / (MS_PER_DAY * 365.25);
      if (years < minimumYears || years > maximumYears) return [];
      return [{ start, years, distance: Math.abs(years - targetYears) }];
    });
    candidates.sort((a, b) => a.distance - b.distance);
    const selected = candidates[0];
    if (selected !== undefined) {
      return {
        cagr: (Math.pow(end / selected.start, 1 / selected.years) - 1) * 100,
        weight: end,
      };
    }
  }
  return null;
}

function retailerPortfolioGrowth(
  claims: readonly ClaimEvidence[],
  minimumStoreCount: number,
  minimumRetailers: number,
  minimumYears: number,
  maximumYears: number,
): number | null {
  const byRetailer = new Map<string, ClaimEvidence[]>();
  for (const claim of claims.filter(
    (item) => item.predicateCode === "retailer_store_count_actual" && item.numericValue !== null,
  )) {
    const key = retailerKey(claim);
    if (key === null) continue;
    const values = byRetailer.get(key) ?? [];
    values.push(claim);
    byRetailer.set(key, values);
  }
  const growth = [...byRetailer.values()]
    .filter((series) => Math.max(...series.map((claim) => claim.numericValue ?? 0)) >= minimumStoreCount)
    .map((series) => cagrForSeries(series, minimumYears, maximumYears))
    .filter((value): value is { cagr: number; weight: number } => value !== null);
  if (growth.length < minimumRetailers) return null;
  const weight = growth.reduce((sum, value) => sum + value.weight, 0);
  if (weight <= 0) return null;
  return growth.reduce((sum, value) => sum + value.cagr * value.weight, 0) / weight;
}

function interpolate(anchors: readonly (readonly [number, number])[], value: number): number {
  if (value <= anchors[0]![0]) return anchors[0]![1];
  if (value >= anchors[anchors.length - 1]![0]) return anchors[anchors.length - 1]![1];
  for (let index = 1; index < anchors.length; index += 1) {
    const lower = anchors[index - 1]!;
    const upper = anchors[index]!;
    if (value <= upper[0]) {
      const ratio = (value - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + ratio * (upper[1] - lower[1]);
    }
  }
  return anchors[anchors.length - 1]![1];
}

function requireString(config: Readonly<Record<string, unknown>>, key: string): string {
  const value = config[key];
  if (typeof value !== "string") {
    throw new Error(`Aggregation config is missing string key "${key}".`);
  }
  return value;
}

/** Deterministic aggregation of verified claims into a raw metric value. */
export function aggregate(
  metric: MetricConfig,
  claims: readonly ClaimEvidence[],
): AggregatedValue | null {
  if (metric.valueType === "ordinal") {
    const latest = latestClaim(claims);
    if (latest?.textValue != null) return { kind: "ordinal", level: latest.textValue };
    return null;
  }

  switch (metric.aggregationMethod) {
    case "latest_value": {
      const latest = latestClaim(claims);
      if (latest?.numericValue != null) return { kind: "numeric", value: latest.numericValue };
      return null;
    }
    case "sum_from_observations": {
      const values = numericClaims(claims);
      if (values.length === 0) return null;
      return {
        kind: "numeric",
        value: values.reduce((sum, claim) => sum + (claim.numericValue ?? 0), 0),
      };
    }
    case "ratio_from_observations": {
      const numeratorPredicate = requireString(metric.aggregationConfig, "numerator_predicate");
      const denominatorPredicate = requireString(metric.aggregationConfig, "denominator_predicate");
      const numerator = numericClaims(claims.filter((c) => c.predicateCode === numeratorPredicate));
      const denominator = latestClaim(
        numericClaims(claims.filter((c) => c.predicateCode === denominatorPredicate)),
      );
      const denominatorValue = denominator?.numericValue ?? 0;
      if (numerator.length === 0 || denominatorValue === 0) return null;
      const numeratorSum = numerator.reduce((sum, claim) => sum + (claim.numericValue ?? 0), 0);
      return { kind: "numeric", value: (numeratorSum / denominatorValue) * 100 };
    }
    case "cagr_from_observations": {
      const predicate = requireString(metric.aggregationConfig, "predicate");
      const series = sortChronologically(
        numericClaims(claims.filter((c) => c.predicateCode === predicate)),
      );
      if (series.length < 2) return null;
      const first = series[0]!;
      const last = series[series.length - 1]!;
      const firstMs = dateMs(first.effectiveFrom ?? first.observedAt);
      const lastMs = dateMs(last.effectiveFrom ?? last.observedAt);
      if (firstMs === null || lastMs === null || lastMs <= firstMs) return null;
      const years = (lastMs - firstMs) / (MS_PER_DAY * 365.25);
      const minimumYears = typeof metric.aggregationConfig.minimum_years === "number" ? metric.aggregationConfig.minimum_years : 2.5;
      const maximumYears = typeof metric.aggregationConfig.maximum_years === "number" ? metric.aggregationConfig.maximum_years : 3.5;
      if (years < minimumYears || years > maximumYears) return null;
      const start = first.numericValue ?? 0;
      const end = last.numericValue ?? 0;
      if (start <= 0 || end <= 0) return null;
      return { kind: "numeric", value: (Math.pow(end / start, 1 / years) - 1) * 100 };
    }
    case "count_distinct": {
      const subjects = new Set(claims.map((claim) => claim.claimId));
      return { kind: "numeric", value: subjects.size };
    }
    case "ordinal_from_evidence": {
      const latest = latestClaim(claims);
      if (latest?.textValue != null) return { kind: "ordinal", level: latest.textValue };
      return null;
    }
    case "binary_from_evidence": {
      const latest = latestClaim(claims);
      if (latest?.textValue != null) {
        return { kind: "boolean", value: latest.textValue === "yes" };
      }
      return null;
    }
    case "qualified_store_base_from_retailers": {
      const direct = latestNumericFor(claims, "qualified_store_base_actual");
      if (direct !== null) return { kind: "numeric", value: direct };
      const minimumStoreCount = configuredNumber(metric.aggregationConfig, "minimum_store_count", 500);
      const minimumRetailers = configuredNumber(metric.aggregationConfig, "minimum_retailers", 3);
      const retailerCounts = latestQualifiedRetailerCounts(claims, minimumStoreCount);
      if (retailerCounts.length < minimumRetailers) return null;
      return {
        kind: "numeric",
        value: retailerCounts.reduce((sum, claim) => sum + (claim.numericValue ?? 0), 0),
      };
    }
    case "qualified_retailer_count_from_observed_retailers": {
      const direct = latestNumericFor(claims, "qualified_retailer_count_actual");
      if (direct !== null) return { kind: "numeric", value: direct };
      const minimumStoreCount = configuredNumber(metric.aggregationConfig, "minimum_store_count", 500);
      const minimumRetailers = configuredNumber(metric.aggregationConfig, "minimum_retailers", 3);
      const count = latestQualifiedRetailerCounts(claims, minimumStoreCount).length;
      return count < minimumRetailers ? null : { kind: "numeric", value: count };
    }
    case "portfolio_cagr_from_retailer_observations": {
      const direct = cagrForSeries(
        claims.filter((claim) => claim.predicateCode === "format_store_count_actual"),
        configuredNumber(metric.aggregationConfig, "minimum_years", 2.5),
        configuredNumber(metric.aggregationConfig, "maximum_years", 3.5),
      );
      if (direct !== null) return { kind: "numeric", value: direct.cagr };
      const value = retailerPortfolioGrowth(
        claims,
        configuredNumber(metric.aggregationConfig, "minimum_store_count", 500),
        configuredNumber(metric.aggregationConfig, "minimum_retailers", 3),
        configuredNumber(metric.aggregationConfig, "minimum_years", 2.5),
        configuredNumber(metric.aggregationConfig, "maximum_years", 3.5),
      );
      return value === null ? null : { kind: "numeric", value };
    }
    case "retailer_growth_from_store_counts": {
      const direct = latestNumericFor(claims, "retailer_store_growth_percent");
      if (direct !== null) return { kind: "numeric", value: direct };
      const value = retailerPortfolioGrowth(
        claims,
        configuredNumber(metric.aggregationConfig, "minimum_store_count", 500),
        configuredNumber(metric.aggregationConfig, "minimum_retailers", 3),
        configuredNumber(metric.aggregationConfig, "minimum_years", 0.75),
        configuredNumber(metric.aggregationConfig, "maximum_years", 1.5),
      );
      return value === null ? null : { kind: "numeric", value };
    }
    case "addressable_store_fallback": {
      const direct = latestNumericFor(claims, "addressable_store_base_actual");
      const qualified = latestNumericFor(claims, "qualified_store_base_actual");
      const retailerCounts = latestQualifiedRetailerCounts(
        claims,
        configuredNumber(metric.aggregationConfig, "minimum_store_count", 500),
      );
      const minimumRetailers = configuredNumber(metric.aggregationConfig, "minimum_retailers", 3);
      const derived = retailerCounts.length < minimumRetailers
        ? null
        : retailerCounts.reduce((sum, claim) => sum + (claim.numericValue ?? 0), 0);
      const value = direct ?? qualified ?? derived;
      return value === null ? null : { kind: "numeric", value };
    }
    case "estimated_acv_from_customer_base": {
      const direct = latestNumericFor(claims, "estimated_acv_potential_usd_millions");
      if (direct !== null) return { kind: "numeric", value: direct };
      const midpoint = metric.aggregationConfig.acv_midpoint_usd_millions;
      const idealStoreCount = metric.aggregationConfig.ideal_customer_store_count;
      if (typeof midpoint !== "number" || typeof idealStoreCount !== "number") return null;
      const minimumStoreCount = configuredNumber(metric.aggregationConfig, "minimum_store_count", 500);
      const minimumRetailers = configuredNumber(metric.aggregationConfig, "minimum_retailers", 3);
      const observedRetailers = latestQualifiedRetailerCounts(claims, minimumStoreCount);
      const derivedRetailerCount = observedRetailers.length < minimumRetailers
        ? null
        : observedRetailers.length;
      const derivedStores = observedRetailers.length < minimumRetailers
        ? null
        : observedRetailers.reduce((sum, claim) => sum + (claim.numericValue ?? 0), 0);
      const retailerCount = latestNumericFor(claims, "qualified_retailer_count_actual") ?? derivedRetailerCount;
      const addressableStores =
        latestNumericFor(claims, "addressable_store_base_actual") ??
        latestNumericFor(claims, "qualified_store_base_actual") ??
        derivedStores;
      const customerCount = retailerCount ??
        (addressableStores === null ? null : addressableStores / idealStoreCount);
      return customerCount === null
        ? null
        : { kind: "numeric", value: customerCount * midpoint };
    }
    case "competition_from_market_structure": {
      const direct = latestNumericFor(claims, "competition_intensity_index");
      if (direct !== null) return { kind: "numeric", value: direct };
      const retailerCount = latestNumericFor(claims, "qualified_retailer_count_actual");
      const concentration = latestNumericFor(claims, "top_customer_concentration_percent");
      const components: number[] = [];
      if (retailerCount !== null) {
        components.push(interpolate([[5, 1], [15, 3], [30, 5], [50, 7], [100, 10]], retailerCount));
      }
      if (concentration !== null) {
        components.push(interpolate([[10, 10], [30, 8], [50, 6], [70, 3], [90, 1]], concentration));
      }
      if (components.length === 0) return null;
      return {
        kind: "numeric",
        value: components.reduce((sum, component) => sum + component, 0) / components.length,
      };
    }
    case "localization_friction_from_partner": {
      const direct = latestNumericFor(claims, "localization_sales_friction_index");
      if (direct !== null) return { kind: "numeric", value: direct };
      const partner = latestOrdinalFor(claims, "partner_channel_availability_level");
      const proxy = partner === "none" ? 5 : partner === "limited" ? 3 : partner === "strong" ? 1 : null;
      return proxy === null ? null : { kind: "numeric", value: proxy };
    }
    case "expanding_share_from_origins": {
      const direct = latestNumericFor(claims, "expanding_retailer_share_percent");
      if (direct !== null) return { kind: "numeric", value: direct };
      const retailerCount = latestNumericFor(claims, "qualified_retailer_count_actual");
      if (retailerCount === null || retailerCount <= 0) return null;
      const expandingOrigins = new Set(
        claims
          .filter(
            (claim) =>
              claim.predicateCode === "announced_store_openings_actual" &&
              (claim.numericValue ?? 0) > 0,
          )
          .map((claim) => claim.originClusterId ?? claim.sourceSnapshotId),
      ).size;
      if (expandingOrigins === 0) return null;
      return {
        kind: "numeric",
        value: Math.min(100, (expandingOrigins / retailerCount) * 100),
      };
    }
    default:
      return null;
  }
}
