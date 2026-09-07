import { and, asc, eq, inArray } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { countries, evidenceClaims, retailerObservations, retailers, sourceDocuments, sourceSnapshots } from "../db/schema.js";

export interface RetailerStoreObservation {
  readonly observation_id: string;
  readonly value: string;
  readonly data_as_of: string | null;
  readonly claim_id: string;
  readonly claim_version: number;
  readonly verification_method: string;
  readonly evidence_quality: number;
  readonly source_url: string;
  readonly publisher: string | null;
  readonly quote: string;
  readonly snapshot_id: string;
  readonly locator: string;
  readonly synthetic: boolean;
}

export interface RetailerDirectoryItem {
  readonly retailer_id: string;
  readonly name: string;
  readonly country_id: string;
  readonly country_iso2: string;
  readonly country_name: string;
  readonly website: string | null;
  readonly status: string;
  readonly observations: readonly RetailerStoreObservation[];
  readonly latest_store_count: RetailerStoreObservation | null;
  readonly has_conflicting_latest_counts: boolean;
}

export interface RetailerDirectoryResult {
  readonly items: readonly RetailerDirectoryItem[];
  readonly total: number;
  readonly countries: readonly { country_id: string; iso2: string; name: string }[];
}

export interface RetailerDirectoryInput {
  /** Explicit scope: an empty scope returns nothing, never the global directory. */
  readonly countryIds: readonly string[];
  readonly countryId?: string;
  readonly query?: string;
  readonly asOf: string;
}

/** Current evidence directory, not a frozen score/scan or a qualified-customer ranking. */
export async function getRetailerDirectory(
  db: MarketDatabase,
  input: RetailerDirectoryInput,
): Promise<RetailerDirectoryResult> {
  if (input.countryIds.length === 0) return { items: [], total: 0, countries: [] };
  const availableCountries = await db.select({ country_id: countries.id, iso2: countries.iso2, name: countries.nameEn })
    .from(countries).where(inArray(countries.id, [...input.countryIds])).orderBy(asc(countries.nameEn));
  const query = input.query?.trim().toLocaleLowerCase() ?? "";
  const masterRows = (await db.select({
    retailer_id: retailers.id, name: retailers.canonicalName, country_id: retailers.countryId,
    country_iso2: countries.iso2, country_name: countries.nameEn, website: retailers.website, status: retailers.status,
  }).from(retailers).innerJoin(countries, eq(retailers.countryId, countries.id))
    .where(and(inArray(retailers.countryId, [...input.countryIds]), eq(retailers.status, "active")))
    .orderBy(asc(retailers.canonicalName), asc(retailers.id)))
    .filter((row) => (!input.countryId || row.country_id === input.countryId) && row.name.toLocaleLowerCase().includes(query));
  if (masterRows.length === 0) return { items: [], total: 0, countries: availableCountries };

  // Separate master and observation queries preserve retailers with missing evidence
  // and avoid treating a denormalized master field as a verified store count.
  const evidence = await db.select({
    retailer_id: retailerObservations.retailerId,
    observation_id: retailerObservations.id,
    value: retailerObservations.numericValueDecimal,
    observation_date: retailerObservations.effectiveFrom,
    observed_at: evidenceClaims.observedAt,
    effective_from: evidenceClaims.effectiveFrom,
    claim_id: evidenceClaims.id,
    claim_version: evidenceClaims.claimVersion,
    verification_method: evidenceClaims.verificationMethod,
    claim_quality_bps: evidenceClaims.claimQualityBps,
    source_url: sourceDocuments.canonicalUrl,
    publisher: sourceSnapshots.publisher,
    quote: evidenceClaims.quoteText,
    snapshot_id: sourceSnapshots.id,
    locator: evidenceClaims.locatorJson,
    parser_version: sourceSnapshots.parserVersion,
  }).from(retailerObservations)
    .innerJoin(retailers, eq(retailerObservations.retailerId, retailers.id))
    .innerJoin(evidenceClaims, and(
      eq(retailerObservations.claimId, evidenceClaims.id),
      eq(evidenceClaims.subjectEntityId, retailers.id),
      eq(evidenceClaims.countryId, retailers.countryId),
    ))
    .innerJoin(sourceSnapshots, eq(evidenceClaims.sourceSnapshotId, sourceSnapshots.id))
    .innerJoin(sourceDocuments, eq(sourceSnapshots.sourceDocumentId, sourceDocuments.id))
    .where(and(
      inArray(retailerObservations.retailerId, masterRows.map((r) => r.retailer_id)),
      eq(retailerObservations.metricCode, "store_count_actual"),
      eq(retailerObservations.unit, "store"),
      eq(evidenceClaims.predicateCode, "retailer_store_count_actual"),
      eq(evidenceClaims.subjectEntityType, "retailer"),
      eq(evidenceClaims.verificationStatus, "verified"), eq(evidenceClaims.active, true),
      eq(evidenceClaims.unit, "store"),
      eq(retailerObservations.numericValueDecimal, evidenceClaims.numericValueDecimal),
    ));

  const byRetailer = new Map<string, RetailerStoreObservation[]>();
  for (const row of evidence) {
    if (row.value === null || !/^\d+$/.test(row.value)) continue;
    const dataAsOf = row.observation_date ?? row.observed_at ?? row.effective_from;
    if (dataAsOf !== null && dataAsOf > input.asOf) continue;
    const items = byRetailer.get(row.retailer_id) ?? [];
    items.push({
      observation_id: row.observation_id, value: row.value, data_as_of: dataAsOf,
      claim_id: row.claim_id, claim_version: row.claim_version,
      verification_method: row.verification_method, evidence_quality: row.claim_quality_bps / 100,
      source_url: row.source_url, publisher: row.publisher, quote: row.quote,
      snapshot_id: row.snapshot_id, locator: row.locator,
      synthetic: row.parser_version.startsWith("fixture"),
    });
    byRetailer.set(row.retailer_id, items);
  }
  const items = masterRows.map((row): RetailerDirectoryItem => {
    const observations = (byRetailer.get(row.retailer_id) ?? []).sort((a, b) =>
      (b.data_as_of ?? "").localeCompare(a.data_as_of ?? "") || a.claim_id.localeCompare(b.claim_id));
    const latest = observations.find((o) => o.data_as_of !== null);
    const conflicts = latest !== undefined && new Set(observations
      .filter((o) => o.data_as_of === latest.data_as_of).map((o) => BigInt(o.value).toString())).size > 1;
    return { ...row, observations, latest_store_count: conflicts ? null : latest ?? null, has_conflicting_latest_counts: conflicts };
  });
  return { items, total: items.length, countries: availableCountries };
}
