import { describe, expect, it } from "vitest";

import {
  aggregate,
  consistencyBps,
  evidenceQualityIndexBps,
  evaluateCountry,
  evaluateDimension,
  evaluateMetric,
  independenceBps,
  normalize,
} from "./index.js";
import type { ClaimEvidence, MetricConfig } from "./index.js";

const AS_OF = Date.parse("2026-09-01T00:00:00.000Z");

function metric(overrides: Partial<MetricConfig> = {}): MetricConfig {
  return {
    id: "md_test",
    metricCode: "test_metric",
    dimensionCode: "growth",
    valueType: "percent",
    direction: "higher_better",
    indicatorWeightBps: 5_000,
    aggregationMethod: "latest_value",
    aggregationConfig: { predicate: "test_actual" },
    normalizationMethod: "piecewise_linear",
    normalizationConfig: {
      anchors: [
        { raw: "0", score_bps: 0 },
        { raw: "10", score_bps: 10_000 },
      ],
    },
    freshnessWindowDays: 730,
    minimumVerifiedClaims: 1,
    minimumIndependentSources: 1,
    critical: false,
    ...overrides,
  };
}

function claim(overrides: Partial<ClaimEvidence> = {}): ClaimEvidence {
  return {
    claimId: "clm_1",
    predicateCode: "test_actual",
    countryId: "cty_vn",
    subjectEntityType: "country",
    subjectEntityId: "cty_vn",
    subjectText: "VN",
    numericValue: 5,
    textValue: null,
    unit: "percent",
    observedAt: "2026-06-01T00:00:00.000Z",
    effectiveFrom: null,
    effectiveTo: null,
    sourceQualityBps: 9_000,
    originClusterId: "cluster_a",
    sourceSnapshotId: "snap_1",
    disputed: false,
    ...overrides,
  };
}

describe("normalize", () => {
  const anchors = {
    anchors: [
      { raw: "-5", score_bps: 0 },
      { raw: "0", score_bps: 2_000 },
      { raw: "5", score_bps: 5_000 },
      { raw: "10", score_bps: 7_500 },
      { raw: "20", score_bps: 10_000 },
    ],
  };

  it.each([
    ["-10", 0],
    ["-5", 0],
    ["0", 2_000],
    ["2.5", 3_500],
    ["5", 5_000],
    ["7.5", 6_250],
    ["15", 8_750],
    ["20", 10_000],
    ["99", 10_000],
  ])("piecewise_linear raw=%s → %d bps", (raw, expected) => {
    const result = normalize(metric({ normalizationConfig: anchors }), {
      kind: "numeric",
      value: Number(raw),
    });
    expect(result).toBe(expected);
  });

  it("supports non-monotonic scores over increasing raw anchors", () => {
    const result = normalize(
      metric({
        normalizationConfig: {
          anchors: [
            { raw: "0", score_bps: 8_000 },
            { raw: "5", score_bps: 3_000 },
            { raw: "10", score_bps: 9_000 },
          ],
        },
      }),
      { kind: "numeric", value: 2.5 },
    );
    expect(result).toBe(5_500);
  });

  it("rejects anchors with non-increasing raw values", () => {
    expect(() =>
      normalize(
        metric({
          normalizationConfig: {
            anchors: [
              { raw: "5", score_bps: 1_000 },
              { raw: "5", score_bps: 2_000 },
            ],
          },
        }),
        { kind: "numeric", value: 5 },
      ),
    ).toThrow(/strictly increasing/);
  });

  it("maps ordinal rubric levels", () => {
    const ordinalMetric = metric({
      valueType: "ordinal",
      aggregationMethod: "ordinal_from_evidence",
      normalizationMethod: "ordinal_rubric",
      normalizationConfig: { levels: ["low", "medium", "high"], scores_bps: [2_000, 6_000, 10_000] },
    });
    expect(normalize(ordinalMetric, { kind: "ordinal", level: "high" })).toBe(10_000);
    expect(() => normalize(ordinalMetric, { kind: "ordinal", level: "extreme" })).toThrow(/Unknown ordinal level/);
  });
});

describe("quality", () => {
  it("computes EQI with the published integer formula", () => {
    expect(
      evidenceQualityIndexBps({
        sourceQuality: 9_500,
        freshness: 10_000,
        coverage: 10_000,
        consistency: 10_000,
        independence: 6_000,
      }),
    ).toBe((9_500 * 3_000 + 10_000 * 2_000 + 10_000 * 3_000 + 10_000 * 1_500 + 6_000 * 500) / 10_000);
  });

  it("does not inflate independence for duplicate origin clusters", () => {
    const sameCluster = [
      claim({ claimId: "clm_1", sourceSnapshotId: "snap_1" }),
      claim({ claimId: "clm_2", sourceSnapshotId: "snap_2" }),
    ];
    expect(independenceBps(sameCluster)).toBe(3_000);
    const distinct = [
      claim({ claimId: "clm_1", originClusterId: "a" }),
      claim({ claimId: "clm_2", originClusterId: "b" }),
      claim({ claimId: "clm_3", originClusterId: "c" }),
      claim({ claimId: "clm_4", originClusterId: "d" }),
      claim({ claimId: "clm_5", originClusterId: "e" }),
    ];
    expect(independenceBps(distinct)).toBe(10_000);
  });

  it("drops consistency to zero for disputed claims", () => {
    expect(consistencyBps([claim({ disputed: true })])).toBe(0);
  });
});

describe("derived metric aggregation", () => {
  it("falls back from direct addressable stores to qualified stores", () => {
    const derived = metric({
      metricCode: "addressable_store_base",
      valueType: "integer",
      aggregationMethod: "addressable_store_fallback",
      aggregationConfig: {
        input_predicates: ["addressable_store_base_actual", "qualified_store_base_actual"],
      },
    });
    expect(aggregate(derived, [claim({ predicateCode: "qualified_store_base_actual", numericValue: 12_000 })]))
      .toEqual({ kind: "numeric", value: 12_000 });
  });

  it("estimates ACV from retailer count using a versioned midpoint assumption", () => {
    const derived = metric({
      metricCode: "estimated_acv_potential",
      valueType: "money_usd_millions",
      aggregationMethod: "estimated_acv_from_customer_base",
      aggregationConfig: {
        input_predicates: ["qualified_retailer_count_actual", "addressable_store_base_actual"],
        acv_midpoint_usd_millions: 0.15,
        ideal_customer_store_count: 500,
      },
    });
    expect(aggregate(derived, [claim({ predicateCode: "qualified_retailer_count_actual", numericValue: 20 })]))
      .toEqual({ kind: "numeric", value: 3 });
  });

  it("derives competition from retailer count and concentration", () => {
    const derived = metric({
      metricCode: "competition_intensity",
      valueType: "decimal",
      aggregationMethod: "competition_from_market_structure",
      aggregationConfig: {
        input_predicates: ["qualified_retailer_count_actual", "top_customer_concentration_percent"],
      },
    });
    const result = aggregate(derived, [
      claim({ claimId: "count", predicateCode: "qualified_retailer_count_actual", numericValue: 30 }),
      claim({ claimId: "concentration", predicateCode: "top_customer_concentration_percent", numericValue: 70 }),
    ]);
    expect(result).toEqual({ kind: "numeric", value: 4 });
  });

  it("maps partner availability to a deterministic sales-friction proxy", () => {
    const derived = metric({
      metricCode: "localization_sales_friction",
      valueType: "decimal",
      aggregationMethod: "localization_friction_from_partner",
      aggregationConfig: { input_predicates: ["partner_channel_availability_level"] },
    });
    expect(aggregate(derived, [claim({
      predicateCode: "partner_channel_availability_level",
      numericValue: null,
      textValue: "strong",
    })])).toEqual({ kind: "numeric", value: 1 });
  });

  it("derives qualified retailer count and store base from named retailer facts", () => {
    const claims = [
      claim({ claimId: "a", predicateCode: "retailer_store_count_actual", numericValue: 2_600, subjectEntityType: "retailer", subjectEntityId: "ret_a", subjectText: "A" }),
      claim({ claimId: "b", predicateCode: "retailer_store_count_actual", numericValue: 1_500, subjectEntityType: "retailer", subjectEntityId: "ret_b", subjectText: "B" }),
      claim({ claimId: "c", predicateCode: "retailer_store_count_actual", numericValue: 900, subjectEntityType: "retailer", subjectEntityId: "ret_c", subjectText: "C" }),
      claim({ claimId: "small", predicateCode: "retailer_store_count_actual", numericValue: 40, subjectEntityType: "retailer", subjectEntityId: "ret_small", subjectText: "Small" }),
    ];
    expect(aggregate(metric({
      aggregationMethod: "qualified_retailer_count_from_observed_retailers",
      aggregationConfig: { minimum_store_count: 500, minimum_retailers: 3 },
    }), claims)).toEqual({ kind: "numeric", value: 3 });
    expect(aggregate(metric({
      aggregationMethod: "qualified_store_base_from_retailers",
      aggregationConfig: { minimum_store_count: 500, minimum_retailers: 3 },
    }), claims)).toEqual({ kind: "numeric", value: 5_000 });
  });

  it("derives a weighted three-year CAGR from matched retailer series", () => {
    const observations = [
      ["a", 1_000, 1_331],
      ["b", 800, 1_064.8],
      ["c", 600, 798.6],
    ].flatMap(([retailer, start, end]) => [
      claim({ claimId: `${retailer}-start`, predicateCode: "retailer_store_count_actual", numericValue: Number(start), observedAt: "2023-01-01", subjectEntityType: "retailer", subjectEntityId: `ret_${retailer}`, subjectText: String(retailer) }),
      claim({ claimId: `${retailer}-end`, predicateCode: "retailer_store_count_actual", numericValue: Number(end), observedAt: "2026-01-01", subjectEntityType: "retailer", subjectEntityId: `ret_${retailer}`, subjectText: String(retailer) }),
    ]);
    const result = aggregate(metric({
      aggregationMethod: "portfolio_cagr_from_retailer_observations",
      aggregationConfig: { minimum_store_count: 500, minimum_retailers: 3, minimum_years: 2.5, maximum_years: 3.5 },
    }), observations);
    expect(result?.kind).toBe("numeric");
    if (result?.kind === "numeric") expect(result.value).toBeCloseTo(10, 1);
  });

  it("uses the latest valid annual pair when a retailer has three observations", () => {
    const observations = [
      ["a", 1_000, 1_100, 1_210],
      ["b", 800, 880, 968],
      ["c", 600, 660, 726],
    ].flatMap(([retailer, first, second, third]) => [
      claim({ claimId: `${retailer}-2023`, predicateCode: "retailer_store_count_actual", numericValue: Number(first), observedAt: "2023-01-01", subjectEntityType: "retailer", subjectEntityId: `ret_${retailer}`, subjectText: String(retailer) }),
      claim({ claimId: `${retailer}-2024`, predicateCode: "retailer_store_count_actual", numericValue: Number(second), observedAt: "2024-01-01", subjectEntityType: "retailer", subjectEntityId: `ret_${retailer}`, subjectText: String(retailer) }),
      claim({ claimId: `${retailer}-2025`, predicateCode: "retailer_store_count_actual", numericValue: Number(third), observedAt: "2025-01-01", subjectEntityType: "retailer", subjectEntityId: `ret_${retailer}`, subjectText: String(retailer) }),
    ]);
    const result = aggregate(metric({
      aggregationMethod: "retailer_growth_from_store_counts",
      aggregationConfig: { minimum_store_count: 500, minimum_retailers: 3, minimum_years: 0.75, maximum_years: 1.5 },
    }), observations);
    expect(result?.kind).toBe("numeric");
    if (result?.kind === "numeric") expect(result.value).toBeCloseTo(10, 1);
  });

  it("uses the latest denominator observation instead of summing incompatible market totals", () => {
    const ratioMetric = metric({
      aggregationMethod: "ratio_from_observations",
      aggregationConfig: {
        numerator_predicate: "announced_store_openings_actual",
        denominator_predicate: "format_store_count_actual",
      },
    });
    const result = aggregate(ratioMetric, [
      claim({ claimId: "open-a", predicateCode: "announced_store_openings_actual", numericValue: 30 }),
      claim({ claimId: "open-b", predicateCode: "announced_store_openings_actual", numericValue: 20 }),
      claim({ claimId: "market-old", predicateCode: "format_store_count_actual", numericValue: 1_000, observedAt: "2022-12-31" }),
      claim({ claimId: "market-latest", predicateCode: "format_store_count_actual", numericValue: 2_000, observedAt: "2024-12-31" }),
    ]);
    expect(result).toEqual({ kind: "numeric", value: 2.5 });
  });

  it("uses distinct opening-source origins as a lower-bound expanding retailer share", () => {
    const derived = metric({
      metricCode: "expanding_retailer_share",
      aggregationMethod: "expanding_share_from_origins",
      aggregationConfig: {
        input_predicates: ["announced_store_openings_actual", "qualified_retailer_count_actual"],
      },
    });
    const result = aggregate(derived, [
      claim({ claimId: "total", predicateCode: "qualified_retailer_count_actual", numericValue: 10 }),
      claim({ claimId: "a1", predicateCode: "announced_store_openings_actual", numericValue: 5, originClusterId: "a" }),
      claim({ claimId: "a2", predicateCode: "announced_store_openings_actual", numericValue: 3, originClusterId: "a" }),
      claim({ claimId: "b", predicateCode: "announced_store_openings_actual", numericValue: 2, originClusterId: "b" }),
    ]);
    expect(result).toEqual({ kind: "numeric", value: 20 });
  });
});

describe("evaluateMetric", () => {
  it("returns insufficient_evidence without zeroing when minimums are unmet", () => {
    const result = evaluateMetric(metric({ minimumVerifiedClaims: 2 }), [claim()], AS_OF);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.normalizedBps).toBeNull();
    expect(result.coverageBps).toBe(0);
    expect(result.sourceQualityBps).toBe(9_000);
  });

  it("evaluates available metrics with coverage 10000", () => {
    const result = evaluateMetric(metric(), [claim({ numericValue: 5 })], AS_OF);
    expect(result.status).toBe("available");
    expect(result.normalizedBps).toBe(5_000);
    expect(result.coverageBps).toBe(10_000);
    expect(result.claimIds).toEqual(["clm_1"]);
  });

  it("treats an unknown legacy ordinal as insufficient instead of aborting a score run", () => {
    const ordinalMetric = metric({
      valueType: "ordinal",
      aggregationMethod: "ordinal_from_evidence",
      normalizationMethod: "ordinal_rubric",
      normalizationConfig: {
        levels: ["low", "medium", "high"],
        scores_bps: [2_000, 6_000, 10_000],
      },
    });

    const result = evaluateMetric(
      ordinalMetric,
      [claim({ numericValue: null, textValue: "strong infrastructure" })],
      AS_OF,
    );

    expect(result.status).toBe("insufficient_evidence");
    expect(result.raw).toBeNull();
    expect(result.normalizedBps).toBeNull();
    expect(result.coverageBps).toBe(0);
  });

  it("computes CAGR from observations", () => {
    const cagrMetric = metric({
      aggregationMethod: "cagr_from_observations",
      aggregationConfig: { predicate: "format_store_count_actual", minimum_years: 2.5, maximum_years: 3.5 },
      valueType: "integer",
      indicatorWeightBps: 4_500,
    });
    const claims = [
      claim({
        claimId: "clm_early",
        predicateCode: "format_store_count_actual",
        numericValue: 10_000,
        effectiveFrom: "2023-06-01",
        observedAt: null,
      }),
      claim({
        claimId: "clm_late",
        predicateCode: "format_store_count_actual",
        numericValue: 11_500,
        effectiveFrom: "2026-06-01",
        observedAt: null,
      }),
    ];
    const result = evaluateMetric(cagrMetric, claims, AS_OF);
    expect(result.status).toBe("available");
    const years = (Date.parse("2026-06-01") - Date.parse("2023-06-01")) / (365.25 * 86_400_000);
    expect(result.raw).toEqual({
      kind: "numeric",
      value: (Math.pow(11_500 / 10_000, 1 / years) - 1) * 100,
    });
  });
});

describe("evaluateDimension and evaluateCountry", () => {
  const metrics: MetricConfig[] = [
    metric({ id: "md_a", metricCode: "a", dimensionCode: "market_size", indicatorWeightBps: 6_000 }),
    metric({ id: "md_b", metricCode: "b", dimensionCode: "market_size", indicatorWeightBps: 4_000 }),
    metric({ id: "md_c", metricCode: "c", dimensionCode: "entry_ease", indicatorWeightBps: 10_000 }),
  ];

  it("renormalizes dimension weights over available indicators", () => {
    const evaluations = [
      evaluateMetric(metrics[0]!, [claim({ numericValue: 10 })], AS_OF), // 10000 bps
      evaluateMetric(metrics[1]!, [claim({ numericValue: 5 })], AS_OF), // 5000 bps — insufficient? no, available
    ];
    // make md_b insufficient by requiring 2 claims
    const bResult = evaluateMetric(
      { ...metrics[1]!, minimumVerifiedClaims: 2 },
      [claim({ numericValue: 5 })],
      AS_OF,
    );
    const dimension = evaluateDimension("market_size", metrics, [evaluations[0]!, bResult]);
    expect(dimension.status).toBe("available"); // 6000/10000 weight available ≥ threshold
    expect(dimension.coverageBps).toBe(6_000);
    expect(dimension.scoreBps).toBe(10_000); // only md_a available → renormalized to full weight
  });

  it("uses the versioned dimension threshold and renormalizes a 20% partial dimension", () => {
    const aResult = evaluateMetric(
      { ...metrics[0]!, minimumVerifiedClaims: 2 },
      [claim({ numericValue: 10 })],
      AS_OF,
    );
    const bResult = evaluateMetric(metrics[1]!, [claim({ numericValue: 5 })], AS_OF);

    const strict = evaluateDimension("market_size", metrics, [aResult, bResult]);
    expect(strict).toMatchObject({ status: "insufficient_evidence", coverageBps: 4_000 });

    const highRecall = evaluateDimension("market_size", metrics, [aResult, bResult], 2_000);
    expect(highRecall).toMatchObject({ status: "available", coverageBps: 4_000, scoreBps: 5_000 });
  });

  it("allows a 70% covered country through a 60% overall gate", () => {
    const aResult = evaluateMetric(
      { ...metrics[0]!, minimumVerifiedClaims: 2 },
      [claim({ numericValue: 10 })],
      AS_OF,
    );
    const bResult = evaluateMetric(metrics[1]!, [claim({ numericValue: 10 })], AS_OF);
    const entryResult = evaluateMetric(metrics[2]!, [claim({ numericValue: 7 })], AS_OF);
    const metricEvaluations = [aResult, bResult, entryResult];
    const dimensionEvaluations = [
      evaluateDimension("market_size", metrics, metricEvaluations, 2_000),
      evaluateDimension("entry_ease", metrics, metricEvaluations, 2_000),
    ];
    const base = {
      countryId: "cty_co",
      metrics,
      metricEvaluations,
      dimensionEvaluations,
      weights: {
        market_size: 2_000,
        growth: 2_000,
        expansion: 1_500,
        digital: 1_500,
        customer_value: 2_000,
        entry_ease: 1_000,
      },
      priorityRules: {
        p1: { opportunity_min_bps: 8_000, entry_difficulty_max_bps: 6_500, coverage_min_bps: 8_000, eqi_min_bps: 7_000 },
        p2_opportunity_min_bps: 6_500,
        p2_entry_difficulty_max_bps: 7_500,
        p3_opportunity_min_bps: 5_000,
      },
      blockers: [],
      dataAsOf: "2026-09-01",
    } as const;

    const strict = evaluateCountry({
      ...base,
      coverageGates: { overallBps: 7_500, dimensionScoreBps: 2_000, dimensionBps: {} },
    });
    expect(strict).toMatchObject({ coverageBps: 7_000, priority: "insufficient_evidence" });

    const highRecall = evaluateCountry({
      ...base,
      coverageGates: { overallBps: 6_000, dimensionScoreBps: 2_000, dimensionBps: {} },
    });
    expect(highRecall.coverageBps).toBe(7_000);
    expect(highRecall.priority).not.toBe("insufficient_evidence");
    expect(highRecall.resultStatus).toBe("published");
  });

  it("entry difficulty is exactly 10000 - entry ease", () => {
    const dimensionEvaluations = [
      evaluateDimension(
        "market_size",
        metrics,
        [
          evaluateMetric(metrics[0]!, [claim({ numericValue: 10 })], AS_OF),
          evaluateMetric(metrics[1]!, [claim({ numericValue: 10 })], AS_OF),
        ],
      ),
      evaluateDimension(
        "entry_ease",
        metrics,
        [evaluateMetric(metrics[2]!, [claim({ numericValue: 7 })], AS_OF)],
      ),
    ];
    const country = evaluateCountry({
      countryId: "cty_vn",
      metrics,
      metricEvaluations: [
        evaluateMetric(metrics[0]!, [claim({ numericValue: 10 })], AS_OF),
        evaluateMetric(metrics[1]!, [claim({ numericValue: 10 })], AS_OF),
        evaluateMetric(metrics[2]!, [claim({ numericValue: 7 })], AS_OF),
      ],
      dimensionEvaluations,
      weights: {
        market_size: 2_000,
        growth: 2_000,
        expansion: 1_500,
        digital: 1_500,
        customer_value: 2_000,
        entry_ease: 1_000,
      },
      priorityRules: {
        p1: { opportunity_min_bps: 8_000, entry_difficulty_max_bps: 6_500, coverage_min_bps: 8_000, eqi_min_bps: 7_000 },
        p2_opportunity_min_bps: 6_500,
        p2_entry_difficulty_max_bps: 7_500,
        p3_opportunity_min_bps: 5_000,
      },
      coverageGates: { overallBps: 7_500, dimensionScoreBps: 2_000, dimensionBps: { market_size: 6_000, customer_value: 6_000, entry_ease: 6_000 } },
      blockers: [],
      dataAsOf: "2026-09-01",
    });
    expect(country.entryEaseBps).toBe(7_000);
    expect(country.entryDifficultyBps).toBe(3_000);
    // hard blocker precedence
    const blocked = evaluateCountry({
      countryId: "cty_ph",
      metrics,
      metricEvaluations: [],
      dimensionEvaluations: [],
      weights: {
        market_size: 2_000,
        growth: 2_000,
        expansion: 1_500,
        digital: 1_500,
        customer_value: 2_000,
        entry_ease: 1_000,
      },
      priorityRules: {
        p1: { opportunity_min_bps: 8_000, entry_difficulty_max_bps: 6_500, coverage_min_bps: 8_000, eqi_min_bps: 7_000 },
        p2_opportunity_min_bps: 6_500,
        p2_entry_difficulty_max_bps: 7_500,
        p3_opportunity_min_bps: 5_000,
      },
      coverageGates: { overallBps: 7_500, dimensionScoreBps: 2_000, dimensionBps: {} },
      blockers: ["video_processing_prohibited_for_use_case"],
      dataAsOf: null,
    });
    expect(blocked.priority).toBe("hold");
    expect(blocked.resultStatus).toBe("blocked");
  });
});
