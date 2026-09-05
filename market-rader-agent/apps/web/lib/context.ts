import {
  createRegionalScenario,
  getScanRuns,
  getScenarios,
} from "@market-radar/infrastructure";
import { cookies } from "next/headers";

import { getDb, getWebConfig } from "@/lib/db";
import {
  DEFAULT_REGION_CODE,
  parseRegionCode,
  REGION_COOKIE,
  type RegionCode,
} from "@/lib/regions";
import { selectDisplayRun } from "@/lib/display-runs";

export interface AppContext {
  readonly regionCode: RegionCode;
  readonly countryIds: readonly string[];
  readonly benchmarkStatus: "regional" | "shared_baseline" | "provisional_shared_baseline";
  readonly scenarioName: string | null;
  readonly scenarioRevisionId: string | null;
  readonly scenarioRevisionIds: readonly string[];
  readonly scanRunId: string | null;
  readonly scanStatus: string | null;
  readonly dataAsOf: string | null;
  readonly researchProvider: string;
  readonly resultProvider: string | null;
}

async function selectedRegionCode(): Promise<RegionCode> {
  const cookieStore = await cookies();
  return parseRegionCode(cookieStore.get(REGION_COOKIE)?.value) ?? DEFAULT_REGION_CODE;
}

/** Resolves the selected regional Scenario and isolates scans/results to its revisions. */
export async function getAppContext(): Promise<AppContext> {
  const db = getDb();
  const config = getWebConfig();
  const regionCode = await selectedRegionCode();
  const selected = await createRegionalScenario(db, { regionCode });
  const scenarios = await getScenarios(db);
  const scenario = scenarios.find((candidate) => candidate.scenario_id === selected.scenarioId);
  const revisionIds = scenario?.revisions.map((revision) => revision.revision_id) ?? [selected.revisionId];
  const runs = await getScanRuns(db);
  const regionalRuns = runs.filter((run) => revisionIds.includes(run.scenario_revision_id));
  const latestRun = regionalRuns[0];
  // 数据展示使用当前区域和 Provider 最近完成的结果；进行中或取消的 Scan
  // 只反映在状态上，不能覆盖已有结果，也不能跨区域或回退到 Fixture。
  const displayRun = selectDisplayRun(regionalRuns, config.search.provider, revisionIds);
  return {
    regionCode,
    countryIds: selected.countryScope.map((iso2) => `cty_${iso2.toLowerCase()}`),
    benchmarkStatus: selected.benchmarkStatus,
    scenarioName: scenario?.name ?? null,
    scenarioRevisionId: scenario?.current_revision_id ?? selected.revisionId,
    scenarioRevisionIds: revisionIds,
    scanRunId: displayRun?.scan_run_id ?? null,
    scanStatus: latestRun?.status ?? null,
    dataAsOf: displayRun?.data_as_of ?? null,
    researchProvider: config.search.provider,
    resultProvider: displayRun?.model_provider ?? null,
  };
}
