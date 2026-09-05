import { and, asc, eq, inArray } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import {
  countries,
  countryScores,
  evidenceClaims,
  metricDefinitions,
  metricEvidenceLinks,
  metricValues,
  scanRuns,
  scenarioRevisions,
  scenarios,
  scoreComponents,
  scoreRuns,
  sourceSnapshots,
} from "../db/schema.js";

export interface RankingItem {
  readonly country: { readonly id: string; readonly iso2: string; readonly name: string };
  readonly rank: number | null;
  readonly opportunity_score: number | null;
  readonly market_attractiveness: number | null;
  readonly entry_difficulty: number | null;
  readonly addressable_store_base: number | null;
  readonly coverage: number;
  readonly evidence_quality_index: number;
  readonly quality_tier: "high" | "medium" | "low" | "unknown";
  readonly priority: string;
  readonly rank_stability: string;
  readonly result_status: string;
  readonly data_as_of: string | null;
}

export interface RankingResult {
  readonly scan_run_id: string;
  readonly scenario_revision_id: string;
  readonly data_as_of: string | null;
  readonly scoring_model_version: string | null;
  readonly items: readonly RankingItem[];
}

function ratio(bps: number | null): number | null {
  return bps === null ? null : Math.round(bps) / 100;
}

function qualityTier(eqiBps: number): "high" | "medium" | "low" | "unknown" {
  if (eqiBps >= 8_000) return "high";
  if (eqiBps >= 6_000) return "medium";
  if (eqiBps > 0) return "low";
  return "unknown";
}

export async function getRanking(db: MarketDatabase, scanRunId: string): Promise<RankingResult> {
  const scanRows = await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId));
  const scan = scanRows[0];
  if (!scan) throw new Error(`Scan run not found: ${scanRunId}`);

  const scoreRunRows = await db.select().from(scoreRuns).where(eq(scoreRuns.scanRunId, scanRunId));
  const scoreRun = scoreRunRows[0];
  if (!scoreRun) {
    // Scan still running (research phase): no persisted results yet.
    return {
      scan_run_id: scan.id,
      scenario_revision_id: scan.scenarioRevisionId,
      data_as_of: scan.dataAsOf,
      scoring_model_version: null,
      items: [],
    };
  }

  const rows = await db
    .select({
      score: countryScores,
      country: countries,
    })
    .from(countryScores)
    .innerJoin(countries, eq(countries.id, countryScores.countryId))
    .where(eq(countryScores.scoreRunId, scoreRun.id))
    .orderBy(asc(countryScores.rank));

  const ordered = rows
    .slice()
    .sort(
      (a, b) =>
        (a.score.rank ?? Number.MAX_SAFE_INTEGER) -
        (b.score.rank ?? Number.MAX_SAFE_INTEGER),
    );

  const addressableRows = await db
    .select({
      countryId: metricValues.countryId,
      rawValueJson: metricValues.rawValueJson,
    })
    .from(metricValues)
    .innerJoin(metricDefinitions, eq(metricDefinitions.id, metricValues.metricDefinitionId))
    .where(
      and(
        eq(metricValues.scanRunId, scanRunId),
        inArray(metricDefinitions.metricCode, ["addressable_store_base", "qualified_store_base"]),
      ),
    );
  const addressableByCountry = new Map<string, number | null>();
  for (const row of addressableRows) {
    if (!addressableByCountry.has(row.countryId)) {
      try {
        const parsed = JSON.parse(row.rawValueJson) as { value?: number } | null;
        addressableByCountry.set(row.countryId, parsed?.value ?? null);
      } catch {
        addressableByCountry.set(row.countryId, null);
      }
    }
  }

  const items: RankingItem[] = ordered.map(({ score, country }) => ({
    country: { id: country.id, iso2: country.iso2, name: country.nameEn },
    rank: score.rank,
    opportunity_score: ratio(score.opportunityScoreBps),
    market_attractiveness: ratio(score.marketAttractivenessBps),
    entry_difficulty: ratio(score.entryDifficultyBps),
    addressable_store_base: addressableByCountry.get(score.countryId) ?? null,
    coverage: ratio(score.coverageBps) ?? 0,
    evidence_quality_index: ratio(score.evidenceQualityIndexBps) ?? 0,
    quality_tier: qualityTier(score.evidenceQualityIndexBps),
    priority: score.priority ?? "watch",
    rank_stability: score.rankStability,
    result_status: score.resultStatus,
    data_as_of: score.dataAsOf,
  }));

  return {
    scan_run_id: scan.id,
    scenario_revision_id: scan.scenarioRevisionId,
    data_as_of: scan.dataAsOf,
    scoring_model_version: "1.0.0",
    items,
  };
}

export interface CountryDetailResult {
  readonly country: { readonly id: string; readonly iso2: string; readonly name: string };
  readonly result_status: string;
  readonly priority: string;
  readonly rank: number | null;
  readonly rank_stability: string;
  readonly opportunity_score: number | null;
  readonly market_attractiveness: number | null;
  readonly entry_ease: number | null;
  readonly entry_difficulty: number | null;
  readonly coverage: number;
  readonly evidence_quality_index: number;
  readonly data_as_of: string | null;
  readonly blockers: readonly string[];
  readonly dimensions: readonly {
    readonly dimension_code: string;
    readonly score: number | null;
    readonly weight: number;
    readonly contribution: number | null;
    readonly coverage: number;
    readonly evidence_quality_index: number;
    readonly status: string;
  }[];
  readonly metrics: readonly {
    readonly metric_value_id: string;
    readonly metric_code: string;
    readonly metric_name: string;
    readonly dimension_code: string;
    readonly raw_value: unknown;
    readonly normalized_value: number | null;
    readonly status: string;
    readonly coverage: number;
    readonly evidence_quality_index: number;
    readonly source_quality: number;
    readonly freshness: number;
    readonly consistency: number;
    readonly independence: number;
    readonly claim_ids: readonly string[];
  }[];
}

export async function getCountryDetail(
  db: MarketDatabase,
  scanRunId: string,
  countryId: string,
): Promise<CountryDetailResult> {
  const scanRows = await db.select().from(scanRuns).where(eq(scanRuns.id, scanRunId));
  const scan = scanRows[0];
  if (!scan) throw new Error(`Scan run not found: ${scanRunId}`);
  const scoreRunRows = await db.select().from(scoreRuns).where(eq(scoreRuns.scanRunId, scanRunId));
  const scoreRun = scoreRunRows[0];
  if (!scoreRun) throw new Error(`Score run not found for scan: ${scanRunId}`);

  const countryRows = await db.select().from(countries).where(eq(countries.id, countryId));
  const country = countryRows[0];
  if (!country) throw new Error(`Country not found: ${countryId}`);

  const scoreRows = await db
    .select()
    .from(countryScores)
    .where(eq(countryScores.scoreRunId, scoreRun.id));
  const score = scoreRows.find((row) => row.countryId === countryId);
  if (!score) throw new Error(`Country score not found: ${countryId}`);

  const componentRows = await db
    .select()
    .from(scoreComponents)
    .where(eq(scoreComponents.scoreRunId, scoreRun.id));

  const metricRows = await db
    .select({ value: metricValues, definition: metricDefinitions })
    .from(metricValues)
    .innerJoin(metricDefinitions, eq(metricDefinitions.id, metricValues.metricDefinitionId))
    .where(eq(metricValues.scanRunId, scanRunId));
  const countryMetrics = metricRows.filter((row) => row.value.countryId === countryId);

  const metricValueIds = countryMetrics.map((row) => row.value.id);
  const linkRows =
    metricValueIds.length === 0
      ? []
      : await db
          .select()
          .from(metricEvidenceLinks)
          .where(inArray(metricEvidenceLinks.metricValueId, metricValueIds));
  const linksByMetric = new Map<string, string[]>();
  for (const link of linkRows) {
    const list = linksByMetric.get(link.metricValueId) ?? [];
    list.push(link.evidenceClaimId);
    linksByMetric.set(link.metricValueId, list);
  }

  const restrictionRows = await db
    .select()
    .from(evidenceClaims)
    .where(eq(evidenceClaims.countryId, countryId));
  const blockers = restrictionRows
    .filter(
      (claim) =>
        claim.predicateCode === "video_processing_restriction_status" &&
        claim.textValue === "prohibited" &&
        claim.active,
    )
    .map(() => "video_processing_prohibited_for_use_case");

  return {
    country: { id: country.id, iso2: country.iso2, name: country.nameEn },
    result_status: score.resultStatus,
    priority: score.priority ?? "watch",
    rank: score.rank,
    rank_stability: score.rankStability,
    opportunity_score: ratio(score.opportunityScoreBps),
    market_attractiveness: ratio(score.marketAttractivenessBps),
    entry_ease: ratio(score.entryEaseBps),
    entry_difficulty: ratio(score.entryDifficultyBps),
    coverage: ratio(score.coverageBps) ?? 0,
    evidence_quality_index: ratio(score.evidenceQualityIndexBps) ?? 0,
    data_as_of: score.dataAsOf,
    blockers,
    dimensions: componentRows
      .filter((component) => component.countryId === countryId)
      .map((component) => ({
        dimension_code: component.dimensionCode,
        score: ratio(component.scoreBps),
        weight: ratio(component.weightBps) ?? 0,
        contribution: ratio(component.contributionBps),
        coverage: ratio(component.coverageBps) ?? 0,
        evidence_quality_index: ratio(component.evidenceQualityIndexBps) ?? 0,
        status: component.status,
      })),
    metrics: countryMetrics.map(({ value, definition }) => ({
      metric_value_id: value.id,
      metric_code: definition.metricCode,
      metric_name: definition.name,
      dimension_code: definition.dimensionCode,
      raw_value: JSON.parse(value.rawValueJson) as unknown,
      normalized_value: ratio(value.normalizedValueBps),
      status: value.status,
      coverage: ratio(value.coverageBps) ?? 0,
      evidence_quality_index: ratio(value.evidenceQualityIndexBps) ?? 0,
      source_quality: ratio(value.sourceQualityBps) ?? 0,
      freshness: ratio(value.freshnessBps) ?? 0,
      consistency: ratio(value.consistencyBps) ?? 0,
      independence: ratio(value.independenceBps) ?? 0,
      claim_ids: linksByMetric.get(value.id) ?? [],
    })),
  };
}

export interface MetricExplanationResult {
  readonly metric_value_id: string;
  readonly metric_code: string;
  readonly metric_name: string;
  readonly dimension_code: string;
  readonly country_id: string;
  readonly raw_value: unknown;
  readonly normalized_value: number | null;
  readonly normalization_method: string;
  readonly normalization_config: unknown;
  readonly aggregation_method: string;
  readonly aggregation_config: unknown;
  readonly calculation_version: string;
  readonly coverage: number;
  readonly evidence_quality_index: number;
  readonly claims: readonly {
    readonly claim_id: string;
    readonly predicate_code: string;
    readonly quote_text: string;
    readonly observed_at: string | null;
    readonly source_type: string;
    readonly publisher: string | null;
    readonly snapshot_id: string;
  }[];
}

export async function explainMetric(
  db: MarketDatabase,
  metricValueId: string,
): Promise<MetricExplanationResult> {
  const valueRows = await db.select().from(metricValues).where(eq(metricValues.id, metricValueId));
  const value = valueRows[0];
  if (!value) throw new Error(`Metric value not found: ${metricValueId}`);

  const definitionRows = await db
    .select()
    .from(metricDefinitions)
    .where(eq(metricDefinitions.id, value.metricDefinitionId));
  const definition = definitionRows[0];
  if (!definition) throw new Error(`Metric definition not found: ${value.metricDefinitionId}`);

  const linkRows = await db
    .select()
    .from(metricEvidenceLinks)
    .where(eq(metricEvidenceLinks.metricValueId, metricValueId));
  const claimIds = linkRows.map((link) => link.evidenceClaimId);
  const claimRows =
    claimIds.length === 0
      ? []
      : await db.select().from(evidenceClaims).where(inArray(evidenceClaims.id, claimIds));
  const snapshotRows = await db.select().from(sourceSnapshots);
  const snapshotById = new Map(snapshotRows.map((snapshot) => [snapshot.id, snapshot]));

  return {
    metric_value_id: value.id,
    metric_code: definition.metricCode,
    metric_name: definition.name,
    dimension_code: definition.dimensionCode,
    country_id: value.countryId,
    raw_value: JSON.parse(value.rawValueJson) as unknown,
    normalized_value: ratio(value.normalizedValueBps),
    normalization_method: definition.normalizationMethod,
    normalization_config: JSON.parse(definition.normalizationConfigJson) as unknown,
    aggregation_method: definition.aggregationMethod,
    aggregation_config: JSON.parse(definition.aggregationConfigJson) as unknown,
    calculation_version: value.calculationVersion,
    coverage: ratio(value.coverageBps) ?? 0,
    evidence_quality_index: ratio(value.evidenceQualityIndexBps) ?? 0,
    claims: claimRows.map((claim) => {
      const snapshot = snapshotById.get(claim.sourceSnapshotId);
      return {
        claim_id: claim.id,
        predicate_code: claim.predicateCode,
        quote_text: claim.quoteText,
        observed_at: claim.observedAt,
        source_type: snapshot?.sourceType ?? "unknown",
        publisher: snapshot?.publisher ?? null,
        snapshot_id: claim.sourceSnapshotId,
      };
    }),
  };
}

export interface ScenarioSummary {
  readonly scenario_id: string;
  readonly name: string;
  readonly current_revision_id: string | null;
  readonly revisions: readonly {
    readonly revision_id: string;
    readonly revision_no: number;
    readonly strategy_code: string;
    readonly config_hash: string;
    readonly created_at: number;
  }[];
}

export async function getScenarios(db: MarketDatabase): Promise<ScenarioSummary[]> {
  const scenarioRows = await db.select().from(scenarios);
  const revisionRows = await db.select().from(scenarioRevisions);
  return scenarioRows.map((scenario) => ({
    scenario_id: scenario.id,
    name: scenario.name,
    current_revision_id: scenario.currentRevisionId,
    revisions: revisionRows
      .filter((revision) => revision.scenarioId === scenario.id)
      .sort((a, b) => a.revisionNo - b.revisionNo)
      .map((revision) => ({
        revision_id: revision.id,
        revision_no: revision.revisionNo,
        strategy_code: revision.strategyCode,
        config_hash: revision.configHash,
        created_at: revision.createdAt,
      })),
  }));
}

export interface ScanRunSummary {
  readonly scan_run_id: string;
  readonly scenario_revision_id: string;
  readonly status: string;
  readonly result_status: string;
  readonly data_as_of: string | null;
  readonly input_hash: string;
  readonly model_provider: string;
  readonly model_name: string;
  readonly cancel_requested_at: number | null;
  readonly created_at: number;
  readonly finished_at: number | null;
}

export async function getScanRuns(db: MarketDatabase): Promise<ScanRunSummary[]> {
  const rows = await db.select().from(scanRuns);
  return rows
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((row) => ({
      scan_run_id: row.id,
      scenario_revision_id: row.scenarioRevisionId,
      status: row.status,
      result_status: row.resultStatus,
      data_as_of: row.dataAsOf,
      input_hash: row.inputHash,
      model_provider: row.modelProvider ?? "unknown",
      model_name: row.modelName ?? "unknown",
      cancel_requested_at: row.cancelRequestedAt,
      created_at: row.createdAt,
      finished_at: row.finishedAt,
    }));
}
