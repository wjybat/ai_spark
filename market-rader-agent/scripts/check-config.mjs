import assert from "node:assert/strict";

import {
  countryFileSchema,
  loadJsonConfig,
  marketRegionFileSchema,
  scoringModelSchema,
} from "../packages/contracts/dist/index.js";
import {
  ConfigValidationError,
  loadConfig,
} from "../packages/infrastructure/dist/index.js";

const validEnvironment = {
  APP_BASE_URL: "http://localhost:3000",
  MARKET_DB_PATH: "./data/market-radar.db",
  AGENT_DB_PATH: "./data/agent-sessions.db",
  SOURCE_CACHE_DIR: "./data/source-cache",
  BACKUP_DIR: "./data/backups",
  WORKER_ID: "config-check-worker",
  LLM_MAX_TOKENS_PER_SCAN: "100000",
  SCAN_MAX_COST_USD: "25.00",
};

const countryConfig = await loadJsonConfig("./config/countries.v1.json", countryFileSchema);
const regionConfig = await loadJsonConfig("./config/regions.v2.json", marketRegionFileSchema);
const scoringModelConfig = await loadJsonConfig(
  "./config/scoring-models/market-opportunity.1.2.0.json",
  scoringModelSchema,
);
assert.equal(scoringModelConfig.value.minimum_coverage.overall_bps, 6_000);
assert.equal(scoringModelConfig.value.minimum_coverage.dimension_score_bps, 2_000);
const countryIso2 = new Set(countryConfig.value.countries.map((country) => country.iso2));
for (const country of countryConfig.value.countries) {
  assert.ok(country.research_languages.includes("en"));
}
const configuredRegionCodes = new Set(regionConfig.value.regions.map((region) => region.code));
assert.equal(countryConfig.value.countries.length, 20);
assert.deepEqual(configuredRegionCodes, new Set(["sea", "middle-east", "latam", "north-africa"]));
const metricSetCodes = new Set();
const referenceSetCodes = new Set();
const scoringModelCodes = new Set();
for (const region of regionConfig.value.regions) {
  assert.equal(region.country_scope.length, 5);
  for (const iso2 of region.country_scope) assert.ok(countryIso2.has(iso2));
  metricSetCodes.add(region.metric_definition_set_code);
  referenceSetCodes.add(region.reference_set_code);
  scoringModelCodes.add(region.scoring_model_code);
  assert.equal(region.scoring_model_version, scoringModelConfig.value.version);
  if (region.code !== "sea") assert.equal(region.benchmark_status, "shared_baseline");
}
assert.equal(metricSetCodes.size, regionConfig.value.regions.length);
assert.equal(referenceSetCodes.size, regionConfig.value.regions.length);
assert.equal(scoringModelCodes.size, regionConfig.value.regions.length);

const config = loadConfig(validEnvironment);
assert.equal(config.nodeEnv, "development");
assert.equal(config.search.provider, "fixture");
assert.equal(config.fetch.maxHtmlBytes, 5 * 1_024 * 1_024);
assert.equal(config.worker.jobHeartbeatMs, 15_000);
assert.ok(Object.isFrozen(config));
assert.ok(Object.isFrozen(config.database));

const piConfig = loadConfig({ ...validEnvironment, SEARCH_PROVIDER: "pi-agent" });
assert.equal(piConfig.search.provider, "pi-agent");
assert.equal(piConfig.piAgent.model, "dmall-router/glm-5.3-zp");
assert.equal(piConfig.piAgent.timeoutMs, 180_000);
assert.equal(piConfig.piAgent.thinkingLevel, "high");
assert.equal(piConfig.agentChat.thinkingLevel, "high");

assert.throws(
  () => loadConfig({}),
  (error) => {
    assert.ok(error instanceof ConfigValidationError);
    assert.match(error.message, /Invalid environment configuration/);
    assert.match(error.message, /APP_BASE_URL/);
    assert.match(error.message, /MARKET_DB_PATH/);
    assert.match(error.message, /WORKER_ID/);
    return true;
  },
);

assert.throws(
  () => loadConfig({ ...validEnvironment, SEARCH_PROVIDER: "remote" }),
  (error) => {
    assert.ok(error instanceof ConfigValidationError);
    assert.match(error.message, /SEARCH_API_KEY: is required when SEARCH_PROVIDER is remote/);
    return true;
  },
);

assert.throws(
  () => loadConfig({ ...validEnvironment, JOB_LEASE_MS: "1000", JOB_HEARTBEAT_MS: "1000" }),
  /JOB_HEARTBEAT_MS: must be less than JOB_LEASE_MS/,
);

process.stdout.write("Configuration validation checks passed.\n");
