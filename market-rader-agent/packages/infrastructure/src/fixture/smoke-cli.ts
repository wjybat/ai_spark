import { openMarketDatabase } from "../db/connection.js";
import { loadConfig } from "../config/environment.js";
import { resolveFromRoot } from "../paths.js";
import { createDefaultScenario } from "../usecases/scenario.js";
import { runFixtureScan } from "../usecases/scan.js";
import { getRanking } from "../usecases/queries.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openMarketDatabase(
    resolveFromRoot(config.database.marketPath),
    config.database.sqliteBusyTimeoutMs,
  );

  const scenario = await createDefaultScenario(db);
  process.stdout.write(`scenario: ${scenario.scenarioId} revision: ${scenario.revisionId}\n`);

  const first = await runFixtureScan(db, { scenarioRevisionId: scenario.revisionId });
  process.stdout.write(`scan 1: ${first.scanRunId} replayed=${first.replayed} hash=${first.inputHash}\n`);

  const second = await runFixtureScan(db, { scenarioRevisionId: scenario.revisionId });
  process.stdout.write(`scan 2: ${second.scanRunId} replayed=${second.replayed} hash=${second.inputHash}\n`);

  const ranking = await getRanking(db, first.scanRunId);
  for (const item of ranking.items) {
    process.stdout.write(
      `#${item.rank ?? "-"} ${item.country.iso2} ${item.country.name}: opp=${item.opportunity_score} cov=${item.coverage} eqi=${item.evidence_quality_index} priority=${item.priority} status=${item.result_status} stability=${item.rank_stability}\n`,
    );
  }
  process.exit(0);
}

await main();
