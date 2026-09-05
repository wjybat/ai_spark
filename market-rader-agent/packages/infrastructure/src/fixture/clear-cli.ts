import { mkdirSync } from "node:fs";
import path from "node:path";

import { loadConfig } from "../config/environment.js";
import { openMarketDatabase } from "../db/connection.js";
import { resolveFromRoot } from "../paths.js";

const config = loadConfig();
const databasePath = resolveFromRoot(config.database.marketPath);
const backupDirectory = resolveFromRoot(config.storage.backupDirectory);
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupPath = path.join(backupDirectory, `pre-fixture-clear-${timestamp}.db`);

mkdirSync(backupDirectory, { recursive: true });
const db = openMarketDatabase(databasePath, config.database.sqliteBusyTimeoutMs);

function scalar(sql: string): number {
  return db.$client.prepare(sql).pluck().get() as number;
}

await db.$client.backup(backupPath);

const before = {
  fixtureSnapshots: scalar(
    `select count(*) from source_snapshots
     where metadata_json like '%"fixture":true%' or parser_version like 'fixture-%'`,
  ),
  evidenceClaims: scalar("select count(*) from evidence_claims"),
  metricValues: scalar("select count(*) from metric_values"),
  countryScores: scalar("select count(*) from country_scores"),
};

const clearFixtureData = db.$client.transaction(() => {
  db.$client.exec(`
    create temp table fixture_snapshot_ids (id text primary key);
    insert into fixture_snapshot_ids
      select id from source_snapshots
      where metadata_json like '%"fixture":true%' or parser_version like 'fixture-%';

    create temp table fixture_document_ids (id text primary key);
    insert into fixture_document_ids
      select distinct source_document_id from source_snapshots
      where id in (select id from fixture_snapshot_ids);

    create temp table fixture_claim_ids (id text primary key);
    insert into fixture_claim_ids
      select id from evidence_claims
      where source_snapshot_id in (select id from fixture_snapshot_ids);

    create temp table fixture_candidate_ids (id text primary key);
    insert into fixture_candidate_ids
      select id from evidence_candidates
      where source_snapshot_id in (select id from fixture_snapshot_ids);

    update scan_runs
      set status = 'stale', result_status = 'stale'
      where id in (select distinct scan_run_id from metric_values);

    delete from metric_evidence_links;
    delete from score_components;
    delete from country_scores;
    delete from score_runs;
    delete from metric_values;

    delete from retailer_formats
      where claim_id in (select id from fixture_claim_ids);
    delete from retailer_observations
      where claim_id in (select id from fixture_claim_ids);
    update retailer_aliases set source_snapshot_id = null
      where source_snapshot_id in (select id from fixture_snapshot_ids);
    delete from evidence_relations
      where from_claim_id in (select id from fixture_claim_ids)
         or to_claim_id in (select id from fixture_claim_ids);
    delete from evidence_reviews
      where claim_id in (select id from fixture_claim_ids)
         or candidate_id in (select id from fixture_candidate_ids);
    delete from evidence_claims
      where id in (select id from fixture_claim_ids);
    delete from evidence_candidates
      where id in (select id from fixture_candidate_ids);
    delete from ai_runs where provider = 'fixture';
    delete from source_snapshots
      where id in (select id from fixture_snapshot_ids);
    delete from source_documents
      where id in (select id from fixture_document_ids)
        and not exists (
          select 1 from source_snapshots where source_document_id = source_documents.id
        );

    drop table fixture_candidate_ids;
    drop table fixture_claim_ids;
    drop table fixture_document_ids;
    drop table fixture_snapshot_ids;
  `);
});

clearFixtureData();
db.$client.pragma("wal_checkpoint(FULL)");

const after = {
  fixtureSnapshots: scalar(
    `select count(*) from source_snapshots
     where metadata_json like '%"fixture":true%' or parser_version like 'fixture-%'`,
  ),
  evidenceClaims: scalar("select count(*) from evidence_claims"),
  metricValues: scalar("select count(*) from metric_values"),
  countryScores: scalar("select count(*) from country_scores"),
};

db.$client.close();
process.stdout.write(`${JSON.stringify({ backupPath, before, after }, null, 2)}\n`);
