import { canonicalHash, canonicalJson } from "@market-radar/domain";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import {
  loadJsonConfig,
  marketRegionFileSchema,
  metricDefinitionSetSchema,
  productProfileSchema,
  referenceSetSchema,
  retailFormatFileSchema,
  countryFileSchema,
  scoringModelSchema,
  weightProfileSchema,
} from "@market-radar/contracts";

import { loadConfig } from "../config/environment.js";
import { openMarketDatabase } from "./connection.js";
import { configDirectory, migrationsFolder, resolveFromRoot } from "../paths.js";
import {
  countries,
  metricDefinitionSets,
  metricDefinitions,
  productProfiles,
  productProfileRevisions,
  referenceSets,
  retailFormats,
  scoringModels,
  users,
  weightProfiles,
} from "./schema.js";

const OPS_USER = { id: "usr_market_radar_ops", email: "ops@market-radar.local", displayName: "Market Radar Ops" };

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openMarketDatabase(
    resolveFromRoot(config.database.marketPath),
    config.database.sqliteBusyTimeoutMs,
  );
  migrate(db, { migrationsFolder });

  const countryFile = await loadJsonConfig(
    `${configDirectory}/countries.v1.json`,
    countryFileSchema,
  );
  const regionFile = await loadJsonConfig(
    `${configDirectory}/regions.v2.json`,
    marketRegionFileSchema,
  );
  const configuredCountryIso2 = new Set(countryFile.value.countries.map((country) => country.iso2));
  for (const region of regionFile.value.regions) {
    for (const iso2 of region.country_scope) {
      if (!configuredCountryIso2.has(iso2)) {
        throw new Error(`Region ${region.code} references unknown country ${iso2}`);
      }
    }
  }
  const formatFile = await loadJsonConfig(
    `${configDirectory}/retail-formats.v1.json`,
    retailFormatFileSchema,
  );
  const productProfile = await loadJsonConfig(
    `${configDirectory}/product-profiles/ai-video-loss-prevention.1.0.0.json`,
    productProfileSchema,
  );
  const metricSet = await loadJsonConfig(
    `${configDirectory}/metric-definition-sets/southeast-asia-retail.1.0.0.json`,
    metricDefinitionSetSchema,
  );
  const referenceSet = await loadJsonConfig(
    `${configDirectory}/reference-sets/southeast-asia-retail.1.0.0.json`,
    referenceSetSchema,
  );
  const scoringModel = await loadJsonConfig(
    `${configDirectory}/scoring-models/market-opportunity.1.2.0.json`,
    scoringModelSchema,
  );
  const weightProfileFiles = [
    "overall.1.0.0.json",
    "growth-first.1.0.0.json",
    "entry-first.1.0.0.json",
  ].map(async (file) =>
    loadJsonConfig(`${configDirectory}/weight-profiles/${file}`, weightProfileSchema),
  );
  const weightProfileConfigs = await Promise.all(weightProfileFiles);
  const regionalEvaluationConfigs = regionFile.value.regions.map((region) => {
    const inheritedBaseline = region.benchmark_status !== "regional";
    const referenceValue = region.code === "sea"
      ? referenceSet.value
      : {
          ...referenceSet.value,
          code: region.reference_set_code,
          version: region.reference_set_version,
          scope: { countries: [...region.country_scope] },
          config: {
            ...referenceSet.value.config,
            ...(inheritedBaseline
              ? { todo_business_decision: "Replace inherited Southeast Asia anchors with approved regional benchmarks." }
              : {}),
          },
        };
    const metricValue = {
      ...metricSet.value,
      code: region.metric_definition_set_code,
      version: region.metric_definition_set_version,
    };
    const scoringValue = {
      ...scoringModel.value,
      code: region.scoring_model_code,
      version: region.scoring_model_version,
    };
    return {
      region,
      reference: {
        value: referenceValue,
        hash: canonicalHash(referenceValue),
        canonicalJson: canonicalJson(referenceValue),
      },
      metric: {
        value: metricValue,
        hash: canonicalHash(metricValue),
      },
      scoring: {
        value: scoringValue,
        hash: canonicalHash(scoringValue),
      },
    };
  });

  const now = Date.now();

  // ops user
    const existingUser = await db.select().from(users).where(eq(users.id, OPS_USER.id));
    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: OPS_USER.id,
        email: OPS_USER.email,
        displayName: OPS_USER.displayName,
        createdAt: now,
        updatedAt: now,
      });
    }

    // countries
    for (const country of countryFile.value.countries) {
      const existing = await db.select().from(countries).where(eq(countries.id, country.id));
      if (existing.length === 0) {
        await db.insert(countries).values({
          id: country.id,
          iso2: country.iso2,
          iso3: country.iso3,
          nameEn: country.name_en,
          nameLocal: country.name_local ?? null,
          regionCode: country.region_code,
          currencyCode: country.currency_code,
          timezone: country.timezone,
          active: true,
          createdAt: now,
        });
      }
    }

    // retail formats
    for (const format of formatFile.value.formats) {
      const id = `fmt_${slug(format.code)}`;
      const existing = await db.select().from(retailFormats).where(eq(retailFormats.id, id));
      if (existing.length === 0) {
        await db.insert(retailFormats).values({
          id,
          code: format.code,
          nameEn: format.name_en,
          taxonomyVersion: format.taxonomy_version,
          active: true,
          createdAt: now,
        });
      }
    }

    // product profile + revision
    const profileId = `pp_${slug(productProfile.value.code)}`;
    const revisionId = `ppr_${slug(productProfile.value.code)}_${slug(productProfile.value.version)}`;
    const existingProfile = await db.select().from(productProfiles).where(eq(productProfiles.id, profileId));
    if (existingProfile.length === 0) {
      await db.insert(productProfiles).values({
        id: profileId,
        code: productProfile.value.code,
        name: productProfile.value.name,
        status: productProfile.value.status,
        createdAt: now,
        updatedAt: now,
      });
    } else if (existingProfile[0]!.status !== productProfile.value.status) {
      await db
        .update(productProfiles)
        .set({ status: productProfile.value.status, updatedAt: now })
        .where(eq(productProfiles.id, profileId));
    }
    const existingRevision = await db
      .select()
      .from(productProfileRevisions)
      .where(eq(productProfileRevisions.id, revisionId));
    if (existingRevision.length === 0) {
      await db.insert(productProfileRevisions).values({
        id: revisionId,
        productProfileId: profileId,
        revisionNo: 1,
        version: productProfile.value.version,
        configJson: productProfile.canonicalJson,
        configHash: productProfile.hash,
        status: productProfile.value.status,
        createdBy: OPS_USER.id,
        createdAt: now,
      });
    } else if (existingRevision[0]!.configHash !== productProfile.hash) {
      throw new Error(
        `Seeded product profile revision ${revisionId} hash mismatch: expected ${existingRevision[0]!.configHash}, file has ${productProfile.hash}`,
      );
    }
    await db
      .update(productProfiles)
      .set({ currentRevisionId: revisionId, updatedAt: now })
      .where(eq(productProfiles.id, profileId));

    // Region-specific reference and metric definition sets. Until Product approves
    // regional anchors, non-SEA sets remain draft and transparently inherit the
    // SEA formulas instead of inventing production thresholds.
    for (const regional of regionalEvaluationConfigs) {
      const referenceSetId = `rs_${slug(regional.reference.value.code)}_${slug(regional.reference.value.version)}`;
      const existingReferenceSet = await db.select().from(referenceSets).where(eq(referenceSets.id, referenceSetId));
      if (existingReferenceSet.length === 0) {
        await db.insert(referenceSets).values({
          id: referenceSetId,
          code: regional.reference.value.code,
          version: regional.reference.value.version,
          scopeJson: JSON.stringify(regional.reference.value.scope),
          effectiveAt: regional.reference.value.effective_at,
          configJson: regional.reference.canonicalJson,
          configHash: regional.reference.hash,
          status: regional.reference.value.status,
          createdAt: now,
        });
      } else if (existingReferenceSet[0]!.configHash !== regional.reference.hash) {
        throw new Error(`Seeded reference set ${referenceSetId} hash mismatch`);
      }

      const metricSetId = `mds_${slug(regional.metric.value.code)}_${slug(regional.metric.value.version)}`;
      const existingMetricSet = await db
        .select()
        .from(metricDefinitionSets)
        .where(eq(metricDefinitionSets.id, metricSetId));
      if (existingMetricSet.length === 0) {
        await db.insert(metricDefinitionSets).values({
          id: metricSetId,
          code: regional.metric.value.code,
          version: regional.metric.value.version,
          status: regional.metric.value.status,
          configHash: regional.metric.hash,
          createdAt: now,
        });
      } else if (existingMetricSet[0]!.configHash !== regional.metric.hash) {
        throw new Error(`Seeded metric set ${metricSetId} hash mismatch`);
      }
      for (const metric of regional.metric.value.metrics) {
        const definitionId = regional.region.code === "sea"
          ? `md_${slug(metric.metric_code)}`
          : `md_${slug(regional.metric.value.code)}_${slug(metric.metric_code)}`;
        const existing = await db.select().from(metricDefinitions).where(eq(metricDefinitions.id, definitionId));
        if (existing.length === 0) {
          await db.insert(metricDefinitions).values({
            id: definitionId,
            metricDefinitionSetId: metricSetId,
            metricCode: metric.metric_code,
            dimensionCode: metric.dimension_code,
            name: metric.name,
            description: metric.description,
            valueType: metric.value_type,
            rawUnit: metric.raw_unit ?? null,
            direction: metric.direction,
            indicatorWeightBps: metric.indicator_weight_bps,
            aggregationMethod: metric.aggregation_method,
            aggregationConfigJson: JSON.stringify(metric.aggregation_config),
            normalizationMethod: metric.normalization_method,
            normalizationConfigJson: JSON.stringify(metric.normalization_config),
            referenceSetId: metric.reference_set_code === null ? null : referenceSetId,
            freshnessWindowDays: metric.freshness_window_days,
            minimumVerifiedClaims: metric.minimum_verified_claims,
            minimumIndependentSources: metric.minimum_independent_sources,
            critical: metric.critical,
            missingDataPolicy: metric.missing_data_policy,
            outlierPolicy: metric.outlier_policy,
            inputPredicatesJson: JSON.stringify(metric.input_predicates),
            version: metric.version,
            status: metric.status,
            createdAt: now,
          });
        }
      }
    }

    // weight profiles
    for (const profile of weightProfileConfigs) {
      const id = `wp_${slug(profile.value.code)}`;
      const existing = await db.select().from(weightProfiles).where(eq(weightProfiles.id, id));
      if (existing.length === 0) {
        await db.insert(weightProfiles).values({
          id,
          code: profile.value.code,
          version: profile.value.version,
          name: profile.value.name,
          dimensionWeightsJson: JSON.stringify(profile.value.dimension_weights),
          configHash: profile.hash,
          status: profile.value.status,
          createdAt: now,
        });
      } else if (existing[0]!.configHash !== profile.hash) {
        throw new Error(`Seeded weight profile ${id} hash mismatch`);
      }
    }

    // Each region has a scoring model identity bound to its own metric set.
    for (const regional of regionalEvaluationConfigs) {
      const scoringModelId = `sm_${slug(regional.scoring.value.code)}_${slug(regional.scoring.value.version)}`;
      const metricSetId = `mds_${slug(regional.metric.value.code)}_${slug(regional.metric.value.version)}`;
      const existingScoringModel = await db.select().from(scoringModels).where(eq(scoringModels.id, scoringModelId));
      if (existingScoringModel.length === 0) {
        await db.insert(scoringModels).values({
          id: scoringModelId,
          code: regional.scoring.value.code,
          version: regional.scoring.value.version,
          metricDefinitionSetId: metricSetId,
          opportunityFormulaJson: JSON.stringify(regional.scoring.value.opportunity_formula),
          priorityRulesJson: JSON.stringify(regional.scoring.value.priority_rules),
          hardBlockerRulesJson: JSON.stringify(regional.scoring.value.hard_blocker_rules),
          minimumCoverageJson: JSON.stringify(regional.scoring.value.minimum_coverage),
          configHash: regional.scoring.hash,
          status: regional.scoring.value.status,
          createdAt: now,
        });
      } else if (existingScoringModel[0]!.configHash !== regional.scoring.hash) {
        throw new Error(`Seeded scoring model ${scoringModelId} hash mismatch`);
      }
    }

  process.stdout.write(`Seed completed for ${config.database.marketPath}\n`);
  process.exit(0);
}

await main();
