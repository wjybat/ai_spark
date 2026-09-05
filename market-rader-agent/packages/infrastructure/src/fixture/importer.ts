import { readFile } from "node:fs/promises";
import path from "node:path";

import { canonicalHash, newId } from "@market-radar/domain";
import { eq } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { METRIC_NAMES, metrics } from "../observability/metrics.js";
import { repoRoot } from "../paths.js";
import { evidenceClaims, sourceDocuments, sourceSnapshots } from "../db/schema.js";

interface FixtureSource {
  readonly key: string;
  readonly country: string;
  readonly publisher: string;
  readonly source_type: string;
  readonly source_quality_bps: number;
  readonly origin_cluster: string;
  readonly language: string;
  readonly published_at: string;
  readonly url: string;
}

interface FixtureClaim {
  readonly c: string;
  readonly p: string;
  readonly v?: number;
  readonly l?: string;
  readonly u: string;
  readonly at?: string;
  readonly ef?: string;
  readonly et?: string;
  readonly s: string;
}

export interface FixtureDataset {
  readonly fixture: boolean;
  readonly synthetic: boolean;
  readonly version: string;
  readonly as_of: string;
  readonly research_window: { readonly from: string; readonly to: string };
  readonly sources: readonly FixtureSource[];
  readonly claims: readonly FixtureClaim[];
}

const COUNTRY_IDS: Readonly<Record<string, string>> = {
  VN: "cty_vn",
  ID: "cty_id",
  TH: "cty_th",
  MY: "cty_my",
  PH: "cty_ph",
};

function decimalString(value: number): string {
  return String(value);
}

function claimSentence(claim: FixtureClaim, countryName: string): string {
  const value = claim.v !== undefined ? String(claim.v) : claim.l ?? "";
  const period = claim.ef !== undefined ? ` as of ${claim.ef}` : "";
  return `${countryName} ${claim.p}: ${value} ${claim.u}${period}.`;
}

/** Loads the synthetic SEA fixture dataset. */
export async function loadFixtureDataset(
  filePath = path.join(repoRoot, "fixtures", "sea-v1.json"),
): Promise<FixtureDataset> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as FixtureDataset;
}

/**
 * Imports the fixture dataset as verified evidence: one source document,
 * one snapshot and one active verified claim per fixture claim. Idempotent
 * via claim identity hash.
 */
export async function importFixtureEvidence(
  db: MarketDatabase,
  dataset: FixtureDataset,
): Promise<{ imported: number; skipped: number }> {
  const now = Date.now();
  const claimsBySource = new Map<string, FixtureClaim[]>();
  for (const claim of dataset.claims) {
    const list = claimsBySource.get(claim.s) ?? [];
    list.push(claim);
    claimsBySource.set(claim.s, list);
  }
  const countryNames = new Map(
    Object.entries(COUNTRY_IDS).map(([iso2, id]) => [id, iso2] as const),
  );

  let imported = 0;
  let skipped = 0;

  for (const source of dataset.sources) {
    const sourceClaims = claimsBySource.get(source.key) ?? [];
    const documentId = `sdoc_${source.key}`;
    const sentences = sourceClaims.map((claim) =>
      claimSentence(claim, COUNTRY_IDS[claim.c] ?? claim.c),
    );
    const normalizedText = sentences.join(" ");
    const contentHash = canonicalHash({ source: source.key, text: normalizedText });

    const existingDoc = await db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.id, documentId));
    if (existingDoc.length === 0) {
      await db.insert(sourceDocuments).values({
        id: documentId,
        canonicalUrl: source.url,
        publisher: source.publisher,
        sourceType: source.source_type,
        originClusterId: source.origin_cluster,
        firstSeenAt: now,
        lastSeenAt: now,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    const snapshotId = `snap_${source.key}`;
    const existingSnapshot = await db
      .select()
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.id, snapshotId));
    if (existingSnapshot.length === 0) {
      await db.insert(sourceSnapshots).values({
        id: snapshotId,
        sourceDocumentId: documentId,
        fetchedAt: now,
        publishedAt: Date.parse(`${source.published_at}T00:00:00.000Z`),
        publisher: source.publisher,
        sourceType: source.source_type,
        language: source.language,
        mimeType: "text/plain",
        httpStatus: 200,
        contentHash,
        normalizedText,
        parseStatus: "succeeded",
        parserVersion: "fixture-1.0.0",
        metadataJson: JSON.stringify({ fixture: true, synthetic: true }),
        createdAt: now,
      });
    }

    for (const claim of sourceClaims) {
      const countryId = COUNTRY_IDS[claim.c];
      if (!countryId) continue;
      const sentence = claimSentence(claim, countryId);
      const startOffset = normalizedText.indexOf(sentence);
      const endOffset = startOffset + sentence.length;
      const claimId = `clm_${newId("f").split("_")[1]}`;
      const numericValue = claim.v !== undefined ? decimalString(claim.v) : null;
      const identityHash = canonicalHash({
        snapshot: snapshotId,
        subject: countryId,
        predicate: claim.p,
        value: numericValue ?? claim.l ?? null,
        unit: claim.u,
        period: claim.ef ?? claim.at ?? null,
        geo: claim.c,
        format: null,
      });
      const conflictKeyHash = canonicalHash({
        subject: countryId,
        predicate: claim.p,
        geo: claim.c,
        unit: claim.u,
      });

      const existingClaim = await db
        .select({ id: evidenceClaims.id })
        .from(evidenceClaims)
        .where(eq(evidenceClaims.claimIdentityHash, identityHash));
      if (existingClaim.length > 0) {
        skipped += 1;
        continue;
      }

      await db.insert(evidenceClaims).values({
        id: claimId,
        subjectEntityType: "country",
        subjectEntityId: countryId,
        subjectText: countryNames.get(countryId) ?? countryId,
        predicateCode: claim.p,
        textValue: claim.l ?? null,
        numericValueDecimal: numericValue,
        unit: claim.u,
        effectiveFrom: claim.ef ?? null,
        effectiveTo: claim.et ?? null,
        observedAt: claim.at ?? null,
        countryId,
        geoScopeJson: JSON.stringify({ country_iso2: claim.c }),
        sourceSnapshotId: snapshotId,
        quoteText: sentence,
        locatorJson: JSON.stringify({ block_id: "b0", start_offset: startOffset, end_offset: endOffset }),
        verificationStatus: "verified",
        verificationMethod: "primary_source",
        verifiedBy: "usr_market_radar_ops",
        verifiedAt: now,
        sourceQualityBps: source.source_quality_bps,
        claimQualityBps: source.source_quality_bps,
        originClusterId: source.origin_cluster,
        claimIdentityHash: identityHash,
        conflictKeyHash,
        claimVersion: 1,
        active: true,
        createdAt: now,
      });
      imported += 1;
      metrics.increment(METRIC_NAMES.verifiedClaimsCreatedTotal, { source: "fixture" });
    }
  }

  return { imported, skipped };
}
