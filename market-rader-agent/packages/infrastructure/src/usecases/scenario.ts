import { loadJsonConfig, marketRegionFileSchema, type MarketRegion } from "@market-radar/contracts";
import { canonicalHash } from "@market-radar/domain";
import { eq } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { scenarios, scenarioRevisions } from "../db/schema.js";
import { configDirectory } from "../paths.js";

export const DEFAULT_REGION_CODE = "sea";
export const DEFAULT_SCENARIO_NAME = "Southeast Asia Convenience AI Loss Prevention";

export interface CreatedScenario {
  readonly scenarioId: string;
  readonly revisionId: string;
  readonly revisionNo: number;
  readonly configHash: string;
  readonly regionCode: string;
  readonly countryScope: readonly string[];
  readonly metricDefinitionSetId: string;
  readonly referenceSetId: string;
  readonly scoringModelId: string;
  readonly benchmarkStatus: "regional" | "shared_baseline" | "provisional_shared_baseline";
}

let regionConfigPromise: ReturnType<typeof loadRegionConfig> | null = null;

async function loadRegionConfig() {
  return loadJsonConfig(`${configDirectory}/regions.v2.json`, marketRegionFileSchema);
}

async function configuredRegions(): Promise<readonly MarketRegion[]> {
  regionConfigPromise ??= loadRegionConfig();
  return (await regionConfigPromise).value.regions;
}

export async function getMarketRegions(): Promise<readonly MarketRegion[]> {
  return configuredRegions();
}

export async function resolveMarketRegion(regionCode = DEFAULT_REGION_CODE): Promise<MarketRegion> {
  const region = (await configuredRegions()).find((candidate) => candidate.code === regionCode);
  if (region === undefined) throw new Error(`Unsupported region code: ${regionCode}`);
  return region;
}

function scenarioIdForRegion(regionCode: string): string {
  if (regionCode === DEFAULT_REGION_CODE) return "scn_default_sea";
  return `scn_region_${regionCode.replaceAll("-", "_")}`;
}

function configId(prefix: string, code: string, version?: string): string {
  const slug = code.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return version === undefined
    ? `${prefix}_${slug}`
    : `${prefix}_${slug}_${version.replaceAll(".", "_")}`;
}

function revisionIdForHash(configHash: string): string {
  const hex = configHash.replace("sha256:", "").slice(0, 32);
  return `scr_${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Creates or resolves the immutable Scenario Revision for a configured market region. */
export async function createRegionalScenario(
  db: MarketDatabase,
  input: {
    regionCode?: string;
    name?: string;
    strategyCode?: string;
    requestedBy?: string;
  } = {},
): Promise<CreatedScenario> {
  const region = await resolveMarketRegion(input.regionCode);
  const now = Date.now();
  const strategyCode = input.strategyCode ?? "overall_v1";
  const weightProfileId = `wp_${strategyCode}`;
  const productRevisionId = "ppr_ai_video_loss_prevention_1_0_0";
  const requestedBy = input.requestedBy ?? "usr_market_radar_ops";
  const scenarioId = scenarioIdForRegion(region.code);
  const metricDefinitionSetId = configId(
    "mds",
    region.metric_definition_set_code,
    region.metric_definition_set_version,
  );
  const referenceSetId = configId(
    "rs",
    region.reference_set_code,
    region.reference_set_version,
  );
  const scoringModelId = configId(
    "sm",
    region.scoring_model_code,
    region.scoring_model_version,
  );

  const config = {
    scenario_schema_version: "2.0.0",
    country_scope: [...region.country_scope],
    retail_format_codes: ["convenience_store", "mini_mart"],
    product_profile_revision_id: productRevisionId,
    customer_filter: { minimum_store_count: 500 },
    research_window: { from: "2022-01-01", to: "2026-09-01" },
    strategy_code: strategyCode,
    weight_profile_id: weightProfileId,
    region_code: region.code,
    region_config_version: "2.0.0",
    metric_definition_set_id: metricDefinitionSetId,
    reference_set_id: referenceSetId,
    scoring_model_id: scoringModelId,
    benchmark_status: region.benchmark_status,
  };
  const configHash = canonicalHash(config);

  const existing = await db.select().from(scenarioRevisions);
  const match = existing.find(
    (revision) => revision.scenarioId === scenarioId && revision.configHash === configHash,
  );
  if (match !== undefined) {
    return {
      scenarioId: match.scenarioId,
      revisionId: match.id,
      revisionNo: match.revisionNo,
      configHash: match.configHash,
      regionCode: region.code,
      countryScope: region.country_scope,
      metricDefinitionSetId,
      referenceSetId,
      scoringModelId,
      benchmarkStatus: region.benchmark_status,
    };
  }

  await db.insert(scenarios).values({
    id: scenarioId,
    name: input.name ?? `${region.name_en} Convenience AI Loss Prevention`,
    ownerUserId: requestedBy,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  const scenarioRevisionsForRegion = existing.filter((revision) => revision.scenarioId === scenarioId);
  const revisionId = revisionIdForHash(configHash);
  const revisionNo = scenarioRevisionsForRegion.length + 1;
  await db.insert(scenarioRevisions).values({
    id: revisionId,
    scenarioId,
    revisionNo,
    countryScopeJson: JSON.stringify(config.country_scope),
    retailFormatCodesJson: JSON.stringify(config.retail_format_codes),
    productProfileRevisionId: productRevisionId,
    customerFilterJson: JSON.stringify(config.customer_filter),
    researchWindowJson: JSON.stringify(config.research_window),
    strategyCode,
    weightProfileId,
    metricDefinitionSetId,
    referenceSetId,
    scoringModelId,
    benchmarkStatus: region.benchmark_status,
    configHash,
    changeSummary: scenarioRevisionsForRegion.length === 0
      ? `Initial ${region.name_en} regional scenario`
      : `Create revision from region configuration ${config.region_config_version}`,
    createdBy: requestedBy,
    createdAt: now,
  }).onConflictDoNothing();

  const resolvedRows = await db.select().from(scenarioRevisions);
  const resolved = resolvedRows.find(
    (revision) => revision.scenarioId === scenarioId && revision.configHash === configHash,
  );
  if (resolved === undefined) throw new Error(`Failed to resolve Scenario Revision for ${region.code}`);

  await db
    .update(scenarios)
    .set({ currentRevisionId: resolved.id, updatedAt: now })
    .where(eq(scenarios.id, scenarioId));

  return {
    scenarioId,
    revisionId: resolved.id,
    revisionNo: resolved.revisionNo,
    configHash,
    regionCode: region.code,
    countryScope: region.country_scope,
    metricDefinitionSetId,
    referenceSetId,
    scoringModelId,
    benchmarkStatus: region.benchmark_status,
  };
}

/** Backwards-compatible resolver for the original Southeast Asia Scenario. */
export async function createDefaultScenario(
  db: MarketDatabase,
  input: { name?: string; strategyCode?: string; requestedBy?: string } = {},
): Promise<CreatedScenario> {
  return createRegionalScenario(db, { ...input, regionCode: DEFAULT_REGION_CODE });
}
