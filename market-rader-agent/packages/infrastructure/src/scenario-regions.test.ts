import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import type { CountryEvaluation } from "@market-radar/application";

import { openTestDatabase } from "./db/connection.js";
import { researchJobs, researchPlanItems, scanRuns, scenarioRevisions } from "./db/schema.js";
import { repoRoot } from "./paths.js";
import { applyBenchmarkStatus, loadEvaluationSetup } from "./usecases/evaluation.js";
import { runResearchScan } from "./usecases/scan.js";
import {
  createDefaultScenario,
  createRegionalScenario,
  getMarketRegions,
  resolveMarketRegion,
} from "./usecases/scenario.js";

function scenarioDatabase() {
  const db = openTestDatabase();
  for (const migration of [
    "0000_initial.sql",
    "0001_research_agent.sql",
    "0002_trace_observability.sql",
    "0003_derived_metrics.sql",
    "0004_retailer_foundations.sql",
    "0005_conservative_retailer_proxies.sql",
    "0006_regional_evaluation_config.sql",
    "0007_regional_benchmark_status.sql",
  ]) {
    const sql = readFileSync(path.join(repoRoot, "drizzle", migration), "utf8")
      .replaceAll("--> statement-breakpoint", "");
    db.$client.exec(sql);
  }
  db.$client.pragma("foreign_keys = OFF");
  return db;
}

describe("regional scenarios", () => {
  it("defines four disjoint five-country regions", async () => {
    const regions = await getMarketRegions();
    expect(regions.map((region) => region.code)).toEqual([
      "sea",
      "middle-east",
      "latam",
      "north-africa",
    ]);
    expect(regions.every((region) => region.country_scope.length === 5)).toBe(true);
    expect(new Set(regions.flatMap((region) => region.country_scope)).size).toBe(20);
    await expect(resolveMarketRegion("unknown")).rejects.toThrow("Unsupported region code");
  });

  it("creates immutable, idempotent revisions with the selected country scope", async () => {
    const db = scenarioDatabase();
    const [first, concurrentReplay] = await Promise.all([
      createRegionalScenario(db, { regionCode: "middle-east" }),
      createRegionalScenario(db, { regionCode: "middle-east" }),
    ]);
    const replay = await createRegionalScenario(db, { regionCode: "middle-east" });
    const sea = await createDefaultScenario(db);

    expect(first.scenarioId).toBe("scn_region_middle_east");
    expect(first.countryScope).toEqual(["SA", "AE", "QA", "KW", "OM"]);
    expect(first.metricDefinitionSetId).toBe("mds_middle_east_retail_1_0_0");
    expect(first.referenceSetId).toBe("rs_middle_east_retail_1_0_0");
    expect(first.scoringModelId).toBe("sm_market_opportunity_middle_east_1_2_0");
    expect(first.benchmarkStatus).toBe("shared_baseline");
    expect(concurrentReplay.revisionId).toBe(first.revisionId);
    expect(replay.revisionId).toBe(first.revisionId);
    expect(sea.scenarioId).toBe("scn_default_sea");

    const revisions = await db.select().from(scenarioRevisions);
    expect(revisions).toHaveLength(2);
    expect(JSON.parse(revisions.find((revision) => revision.id === first.revisionId)!.countryScopeJson))
      .toEqual(["SA", "AE", "QA", "KW", "OM"]);
    db.$client.close();
  });

  it("builds research jobs only for countries in the selected region", async () => {
    const db = scenarioDatabase();
    const scenario = await createRegionalScenario(db, { regionCode: "middle-east" });
    const result = await runResearchScan(db, {
      scenarioRevisionId: scenario.revisionId,
      researchProvider: "pi-agent",
      idempotencyKey: "middle-east-test",
    });
    const jobs = await db.select().from(researchJobs);
    const planItems = await db.select().from(researchPlanItems);
    const scan = (await db.select().from(scanRuns))[0]!;

    expect(result.jobsCreated).toBe(65);
    expect(scan.metricDefinitionSetId).toBe("mds_middle_east_retail_1_0_0");
    expect(scan.scoringModelId).toBe("sm_market_opportunity_middle_east_1_2_0");
    expect(scan.researchPolicyVersion).toBe("1.7.0");
    expect(planItems.every((item) =>
      JSON.parse(item.reuseDecisionJson).force_refresh === true,
    )).toBe(true);
    expect((await loadEvaluationSetup(db, result.scanRunId)).benchmarkStatus)
      .toBe("shared_baseline");
    expect(new Set(jobs.map((job) => job.countryId))).toEqual(new Set([
      "cty_sa", "cty_ae", "cty_qa", "cty_kw", "cty_om",
    ]));
    db.$client.close();
  });

  it("does not force the approved shared baseline to provisional", () => {
    const published = { resultStatus: "published" } as CountryEvaluation;
    expect(applyBenchmarkStatus(published, "shared_baseline").resultStatus).toBe("published");
    expect(applyBenchmarkStatus(published, "regional").resultStatus).toBe("published");
    expect(applyBenchmarkStatus(published, "provisional_shared_baseline").resultStatus)
      .toBe("provisional");
  });
});
