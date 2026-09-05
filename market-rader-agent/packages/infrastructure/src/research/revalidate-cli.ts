import { mkdirSync } from "node:fs";
import path from "node:path";

import { and, desc, eq } from "drizzle-orm";

import { loadConfig } from "../config/environment.js";
import { openMarketDatabase } from "../db/connection.js";
import { scanRuns } from "../db/schema.js";
import { resolveFromRoot } from "../paths.js";
import { evaluateAndPersist, loadEvaluationSetup } from "../usecases/evaluation.js";
import {
  isLowPrecisionAdvisoryError,
  validatePredicateEvidence,
  validatePredicateValue,
} from "./topics.js";

interface ClaimRow {
  readonly id: string;
  readonly country_iso2: string;
  readonly source_candidate_id: string | null;
  readonly predicate_code: string;
  readonly value: string | null;
  readonly unit: string | null;
  readonly observed_at: string | null;
  readonly quote_text: string;
  readonly published_at: string | null;
}

const config = loadConfig();
const databasePath = resolveFromRoot(config.database.marketPath);
const backupDirectory = resolveFromRoot(config.storage.backupDirectory);
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupPath = path.join(backupDirectory, `pre-evidence-revalidation-${timestamp}.db`);
mkdirSync(backupDirectory, { recursive: true });

const db = openMarketDatabase(databasePath, config.database.sqliteBusyTimeoutMs);
await db.$client.backup(backupPath);

const rows = db.$client.prepare(`
  select
    ec.id,
    c.iso2 as country_iso2,
    ec.source_candidate_id,
    ec.predicate_code,
    coalesce(ec.numeric_value_decimal, ec.text_value) as value,
    ec.unit,
    ec.observed_at,
    ec.quote_text,
    date(ss.published_at / 1000, 'unixepoch') as published_at
  from evidence_claims ec
  join countries c on c.id = ec.country_id
  join source_snapshots ss on ss.id = ec.source_snapshot_id
  where ec.active = 1
    and ec.verification_status = 'verified'
    and json_extract(ss.metadata_json, '$.provider') = 'pi-agent'
`).all() as ClaimRow[];

const invalid = rows.flatMap((row) => {
  if (row.value === null || row.unit === null || row.observed_at === null) {
    return [{ row, errors: ["missing_structured_claim_field"] }];
  }
  const errors = [
    ...validatePredicateValue(row.predicate_code, row.value, row.unit),
    ...validatePredicateEvidence(
      row.predicate_code,
      row.value,
      row.quote_text,
      row.observed_at,
      row.published_at ?? undefined,
      row.country_iso2,
    ).filter((error) => !isLowPrecisionAdvisoryError(error)),
  ];
  return errors.length === 0 ? [] : [{ row, errors }];
});

const deactivate = db.$client.transaction(() => {
  const deactivateClaim = db.$client.prepare("update evidence_claims set active = 0 where id = ?");
  const invalidateCandidate = db.$client.prepare(`
    update evidence_candidates
    set validation_status = 'invalid', validation_errors_json = ?
    where id = ?
  `);
  for (const item of invalid) {
    deactivateClaim.run(item.row.id);
    if (item.row.source_candidate_id !== null) {
      invalidateCandidate.run(JSON.stringify(item.errors), item.row.source_candidate_id);
    }
  }
});
deactivate();

const latestScans = await db
  .select()
  .from(scanRuns)
  .where(
    and(
      eq(scanRuns.modelProvider, "pi-agent"),
      eq(scanRuns.status, "completed"),
    ),
  )
  .orderBy(desc(scanRuns.finishedAt))
  .limit(1);
const latestScan = latestScans[0];
let recomputedScanId: string | null = null;
if (latestScan !== undefined && invalid.length > 0) {
  const setup = await loadEvaluationSetup(db, latestScan.id);
  await evaluateAndPersist(db, latestScan.id, setup);
  recomputedScanId = latestScan.id;
}

db.$client.pragma("wal_checkpoint(FULL)");
db.$client.close();
process.stdout.write(`${JSON.stringify({
  backupPath,
  inspectedClaims: rows.length,
  deactivatedClaims: invalid.length,
  recomputedScanId,
  invalidClaims: invalid.map(({ row, errors }) => ({
    claimId: row.id,
    predicate: row.predicate_code,
    errors,
  })),
}, null, 2)}\n`);
