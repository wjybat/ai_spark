import type { DimensionCode } from "@market-radar/contracts";
import { canonicalHash, newId } from "@market-radar/domain";
import type {
  ClaimEvidence,
  CountryEvaluation,
  CoverageGates,
  MetricConfig,
  PriorityRules,
} from "@market-radar/application";
import {
  CALCULATION_VERSION,
  computeRankStability,
  evaluateCountry,
  evaluateDimension,
  evaluateMetric,
  rankCountries,
} from "@market-radar/application";
import { and, eq, inArray } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import {
  countryScores,
  evidenceClaims,
  metricDefinitions,
  metricEvidenceLinks,
  metricValues,
  scanEvents,
  scanRuns,
  scenarioRevisions,
  scoreComponents,
  scoreRuns,
  scoringModels,
  sourceSnapshots,
  weightProfiles,
} from "../db/schema.js";

const DIMENSIONS: readonly DimensionCode[] = [
  "market_size",
  "growth",
  "expansion",
  "digital",
  "customer_value",
  "entry_ease",
];

export interface EvaluationSetup {
  readonly metricSetId: string;
  readonly scoringModelId: string;
  readonly weightProfileId: string;
  readonly countryIds: readonly string[];
  readonly window: { readonly from: string; readonly to: string };
  readonly asOf: string;
  readonly evidenceProvider: string | null;
  readonly benchmarkStatus: "regional" | "shared_baseline" | "provisional_shared_baseline";
}

export interface EvaluationSummary {
  readonly countries: number;
  readonly byStatus: Record<string, number>;
  readonly claimCount: number;
}

export function applyBenchmarkStatus(
  evaluation: CountryEvaluation,
  benchmarkStatus: EvaluationSetup["benchmarkStatus"],
): CountryEvaluation {
  return benchmarkStatus === "provisional_shared_baseline" &&
    evaluation.resultStatus === "published"
    ? { ...evaluation, resultStatus: "provisional" }
    : evaluation;
}

async function clearInterruptedEvaluation(db: MarketDatabase, scanRunId: string): Promise<void> {
  const existingMetricValues = await db
    .select({ id: metricValues.id })
    .from(metricValues)
    .where(eq(metricValues.scanRunId, scanRunId));
  const metricValueIds = existingMetricValues.map((row) => row.id);
  if (metricValueIds.length > 0) {
    await db
      .delete(metricEvidenceLinks)
      .where(inArray(metricEvidenceLinks.metricValueId, metricValueIds));
  }
  await db.delete(metricValues).where(eq(metricValues.scanRunId, scanRunId));

  const existingScoreRuns = await db
    .select({ id: scoreRuns.id })
    .from(scoreRuns)
    .where(eq(scoreRuns.scanRunId, scanRunId));
  const scoreRunIds = existingScoreRuns.map((row) => row.id);
  if (scoreRunIds.length > 0) {
    await db.delete(scoreComponents).where(inArray(scoreComponents.scoreRunId, scoreRunIds));
    await db.delete(countryScores).where(inArray(countryScores.scoreRunId, scoreRunIds));
    await db.delete(scoreRuns).where(inArray(scoreRuns.id, scoreRunIds));
  }
}

function toMetricConfig(row: typeof metricDefinitions.$inferSelect): MetricConfig {
  return {
    id: row.id,
    metricCode: row.metricCode,
    dimensionCode: row.dimensionCode as DimensionCode,
    valueType: row.valueType as MetricConfig["valueType"],
    direction: row.direction as MetricConfig["direction"],
    indicatorWeightBps: row.indicatorWeightBps,
    aggregationMethod: row.aggregationMethod as MetricConfig["aggregationMethod"],
    aggregationConfig: JSON.parse(row.aggregationConfigJson) as Record<string, unknown>,
    normalizationMethod: row.normalizationMethod as MetricConfig["normalizationMethod"],
    normalizationConfig: JSON.parse(row.normalizationConfigJson) as Record<string, unknown>,
    freshnessWindowDays: row.freshnessWindowDays,
    minimumVerifiedClaims: row.minimumVerifiedClaims,
    minimumIndependentSources: row.minimumIndependentSources,
    critical: row.critical,
  };
}

export function snapshotEvidenceProvider(metadataJson: string): string | null {
  try {
    const metadata = JSON.parse(metadataJson) as { provider?: unknown; fixture?: unknown };
    if (typeof metadata.provider === "string") return metadata.provider;
    return metadata.fixture === true ? "fixture" : null;
  } catch {
    return null;
  }
}

function metricInputPredicates(metric: MetricConfig): string[] {
  const configured = metric.aggregationConfig.input_predicates;
  if (Array.isArray(configured) && configured.every((value) => typeof value === "string")) {
    return configured;
  }
  if (metric.aggregationMethod === "ratio_from_observations") {
    return [
      metric.aggregationConfig.numerator_predicate,
      metric.aggregationConfig.denominator_predicate,
    ].filter((value): value is string => typeof value === "string");
  }
  const predicate = metric.aggregationConfig.predicate;
  return typeof predicate === "string" ? [predicate] : [];
}

function toClaimEvidence(row: typeof evidenceClaims.$inferSelect): ClaimEvidence {
  return {
    claimId: row.id,
    predicateCode: row.predicateCode,
    countryId: row.countryId,
    subjectEntityType: row.subjectEntityType,
    subjectEntityId: row.subjectEntityId,
    subjectText: row.subjectText,
    numericValue: row.numericValueDecimal === null ? null : Number(row.numericValueDecimal),
    textValue: row.textValue,
    unit: row.unit,
    observedAt: row.observedAt,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    sourceQualityBps: row.sourceQualityBps,
    originClusterId: row.originClusterId,
    sourceSnapshotId: row.sourceSnapshotId,
    disputed: row.verificationStatus === "disputed",
  };
}

async function appendEvent(
  db: MarketDatabase,
  scanRunId: string,
  eventType: string,
  stage: string,
  messageCode: string,
  payload: Record<string, unknown> = {},
  countryId?: string,
): Promise<void> {
  await db.insert(scanEvents).values({
    scanRunId,
    eventType,
    stage,
    countryId: countryId ?? null,
    messageCode,
    payloadJson: JSON.stringify(payload),
    createdAt: Date.now(),
  });
}

/**
 * Deterministic evaluation + persistence over all verified active claims in
 * scope: metric values with lineage links, score run, components, country
 * scores with ranks and stability.
 */
export async function evaluateAndPersist(
  db: MarketDatabase,
  scanRunId: string,
  setup: EvaluationSetup,
): Promise<EvaluationSummary> {
  // Finalization can be retried after a process restart or evaluation error.
  // Remove only this scan's derived rows so reruns cannot duplicate partial output.
  await clearInterruptedEvaluation(db, scanRunId);

  const weightProfileRows = await db
    .select()
    .from(weightProfiles)
    .where(eq(weightProfiles.id, setup.weightProfileId));
  const weightProfile = weightProfileRows[0];
  if (!weightProfile) throw new Error(`Weight profile not found: ${setup.weightProfileId}`);
  const weights = JSON.parse(weightProfile.dimensionWeightsJson) as Record<DimensionCode, number>;

  const scoringModelRows = await db
    .select()
    .from(scoringModels)
    .where(eq(scoringModels.id, setup.scoringModelId));
  const scoringModel = scoringModelRows[0];
  if (!scoringModel) throw new Error(`Scoring model not found: ${setup.scoringModelId}`);
  const priorityRules = JSON.parse(scoringModel.priorityRulesJson) as PriorityRules;
  const minimumCoverage = JSON.parse(scoringModel.minimumCoverageJson) as {
    overall_bps: number;
    dimension_score_bps?: number;
    dimension_bps: Record<string, number>;
  };
  const coverageGates: CoverageGates = {
    overallBps: minimumCoverage.overall_bps,
    dimensionScoreBps: minimumCoverage.dimension_score_bps ?? 6_000,
    dimensionBps: minimumCoverage.dimension_bps,
  };

  const definitionRows = await db
    .select()
    .from(metricDefinitions)
    .where(eq(metricDefinitions.metricDefinitionSetId, setup.metricSetId));
  const metrics = definitionRows.map(toMetricConfig);

  const claimRows = await db
    .select({ claim: evidenceClaims, snapshotMetadataJson: sourceSnapshots.metadataJson })
    .from(evidenceClaims)
    .innerJoin(sourceSnapshots, eq(sourceSnapshots.id, evidenceClaims.sourceSnapshotId))
    .where(
      and(
        eq(evidenceClaims.verificationStatus, "verified"),
        eq(evidenceClaims.active, true),
        inArray(evidenceClaims.countryId, [...setup.countryIds]),
      ),
    );
  const claims = claimRows
    .filter(
      (row) =>
        setup.evidenceProvider === null ||
        snapshotEvidenceProvider(row.snapshotMetadataJson) === setup.evidenceProvider,
    )
    .map((row) => toClaimEvidence(row.claim))
    .filter((claim) => {
      const reference = claim.observedAt ?? claim.effectiveFrom;
      if (reference === null) return true;
      return reference >= setup.window.from && reference <= setup.window.to;
    });

  const asOfMs = Date.parse(`${setup.asOf}T00:00:00.000Z`);
  const now = Date.now();

  const evaluations = [];
  const metricEvaluationsByCountry = new Map<string, ReturnType<typeof evaluateMetric>[]>();

  for (const countryId of setup.countryIds) {
    const countryClaims = claims.filter((claim) => claim.countryId === countryId);

    const blockers: string[] = [];
    if (
      countryClaims.some(
        (claim) =>
          claim.predicateCode === "video_processing_restriction_status" &&
          claim.textValue === "prohibited",
      )
    ) {
      blockers.push("video_processing_prohibited_for_use_case");
    }

    const metricEvaluations = metrics.map((metric) => {
      const inputPredicates = metricInputPredicates(metric);
      const metricClaims = countryClaims.filter((claim) =>
        inputPredicates.includes(claim.predicateCode),
      );
      return evaluateMetric(metric, metricClaims, asOfMs);
    });

    const dimensionEvaluations = DIMENSIONS.map((dimension) =>
      evaluateDimension(dimension, metrics, metricEvaluations, coverageGates.dimensionScoreBps),
    );

    const evaluated = evaluateCountry({
      countryId,
      metrics,
      metricEvaluations,
      dimensionEvaluations,
      weights,
      priorityRules,
      coverageGates,
      blockers,
      dataAsOf: setup.asOf,
    });
    const evaluation = applyBenchmarkStatus(evaluated, setup.benchmarkStatus);

    evaluations.push(evaluation);
    metricEvaluationsByCountry.set(countryId, metricEvaluations);

    await appendEvent(
      db,
      scanRunId,
      "metrics.country_completed",
      "calculating_metrics",
      "COUNTRY_COMPLETED",
      { country_id: countryId, result_status: evaluation.resultStatus },
    );
  }

  const ranks = rankCountries(evaluations);
  const stability = computeRankStability(evaluations, weights);

  const scoreRunId = `srun_${newId("sr").split("_")[1]}`;
  await db.insert(scoreRuns).values({
    id: scoreRunId,
    scanRunId,
    scoringModelId: setup.scoringModelId,
    inputHash: canonicalHash({ scan: scanRunId, weight_profile: weightProfile.configHash }),
    status: "running",
    startedAt: now,
  });

  for (const evaluation of evaluations) {
    const metricEvaluations = metricEvaluationsByCountry.get(evaluation.countryId) ?? [];

    for (const metricEvaluation of metricEvaluations) {
      const metric = metrics.find((m) => m.id === metricEvaluation.metricId)!;
      const metricValueId = `mv_${newId("m").split("_")[1]}`;
      await db.insert(metricValues).values({
        id: metricValueId,
        scanRunId,
        countryId: evaluation.countryId,
        metricDefinitionId: metric.id,
        rawValueJson: JSON.stringify(
          metricEvaluation.raw === null ? null : { ...metricEvaluation.raw },
        ),
        normalizedValueBps: metricEvaluation.normalizedBps,
        coverageBps: metricEvaluation.coverageBps,
        sourceQualityBps: metricEvaluation.sourceQualityBps,
        freshnessBps: metricEvaluation.freshnessBps,
        consistencyBps: metricEvaluation.consistencyBps,
        independenceBps: metricEvaluation.independenceBps,
        evidenceQualityIndexBps: metricEvaluation.evidenceQualityIndexBps,
        status: metricEvaluation.status,
        inputHash: canonicalHash({
          metric: metric.id,
          claims: [...metricEvaluation.claimIds].sort(),
          as_of: setup.asOf,
          calculation_version: CALCULATION_VERSION,
        }),
        calculationVersion: CALCULATION_VERSION,
        calculatedAt: now,
      });

      for (const claimId of metricEvaluation.claimIds) {
        await db.insert(metricEvidenceLinks).values({
          metricValueId,
          evidenceClaimId: claimId,
          role: "input",
          weightBps: 10_000,
        });
      }
    }

    for (const dimension of evaluation.dimensions) {
      await db.insert(scoreComponents).values({
        id: `sc_${newId("c").split("_")[1]}`,
        scoreRunId,
        countryId: evaluation.countryId,
        dimensionCode: dimension.dimensionCode,
        scoreBps: dimension.scoreBps,
        weightBps: weights[dimension.dimensionCode],
        contributionBps:
          dimension.scoreBps === null
            ? null
            : Math.round((dimension.scoreBps * weights[dimension.dimensionCode]) / 10_000),
        coverageBps: dimension.coverageBps,
        evidenceQualityIndexBps: dimension.evidenceQualityIndexBps,
        status: dimension.status,
        inputHash: canonicalHash({
          dimension: dimension.dimensionCode,
          country: evaluation.countryId,
          score: dimension.scoreBps,
        }),
      });
    }

    await db.insert(countryScores).values({
      id: `cs_${newId("s").split("_")[1]}`,
      scoreRunId,
      countryId: evaluation.countryId,
      marketAttractivenessBps: evaluation.marketAttractivenessBps,
      entryEaseBps: evaluation.entryEaseBps,
      entryDifficultyBps: evaluation.entryDifficultyBps,
      opportunityScoreBps: evaluation.opportunityScoreBps,
      priority: evaluation.priority,
      coverageBps: evaluation.coverageBps,
      evidenceQualityIndexBps: evaluation.evidenceQualityIndexBps,
      rank: ranks.get(evaluation.countryId) ?? null,
      rankStability: stability.get(evaluation.countryId) ?? "not_ranked",
      resultStatus: evaluation.resultStatus,
      dataAsOf: evaluation.dataAsOf,
      inputHash: canonicalHash({
        country: evaluation.countryId,
        opportunity: evaluation.opportunityScoreBps,
        priority: evaluation.priority,
      }),
    });
  }

  const finishedAt = Date.now();
  await db
    .update(scoreRuns)
    .set({ status: "succeeded", finishedAt })
    .where(eq(scoreRuns.id, scoreRunId));

  const byStatus: Record<string, number> = {};
  for (const evaluation of evaluations) {
    byStatus[evaluation.resultStatus] = (byStatus[evaluation.resultStatus] ?? 0) + 1;
  }

  await appendEvent(db, scanRunId, "scoring.completed", "scoring", "SCORING_COMPLETED", {
    countries: evaluations.length,
  });

  return { countries: evaluations.length, byStatus, claimCount: claims.length };
}

/** Loads the setup for a scan run from its frozen references. */
export async function loadEvaluationSetup(
  db: MarketDatabase,
  scanRunId: string,
  asOfOverride?: string,
): Promise<EvaluationSetup> {
  const scanRows = await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId));
  const scan = scanRows[0];
  if (!scan) throw new Error(`Scan run not found: ${scanRunId}`);
  const revisionRows = await db
    .select()
    .from(scenarioRevisions)
    .where(eq(scenarioRevisions.id, scan.scenarioRevisionId));
  const revision = revisionRows[0];
  if (!revision) throw new Error(`Scenario revision not found: ${scan.scenarioRevisionId}`);

  const countryScope = JSON.parse(revision.countryScopeJson) as string[];
  const southeastAsiaScope = new Set(["VN", "ID", "TH", "MY", "PH"]);
  const isSoutheastAsia = countryScope.length === southeastAsiaScope.size
    && countryScope.every((iso2) => southeastAsiaScope.has(iso2));

  return {
    metricSetId: scan.metricDefinitionSetId,
    scoringModelId: scan.scoringModelId,
    weightProfileId: revision.weightProfileId,
    countryIds: countryScope.map((iso2) => `cty_${iso2.toLowerCase()}`),
    window: JSON.parse(revision.researchWindowJson) as { from: string; to: string },
    asOf: asOfOverride ?? scan.dataAsOf ?? "2026-09-01",
    evidenceProvider: scan.modelProvider,
    benchmarkStatus: revision.benchmarkStatus === "shared_baseline"
      ? "shared_baseline"
      : revision.benchmarkStatus === "provisional_shared_baseline" ||
          (revision.benchmarkStatus === null && !isSoutheastAsia)
        ? "provisional_shared_baseline"
        : "regional",
  };
}

export { appendEvent };
