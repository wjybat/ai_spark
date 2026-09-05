import { readFileSync } from "node:fs";
import path from "node:path";

import { canonicalHash } from "@market-radar/domain";
import { describe, expect, it } from "vitest";

import { openTestDatabase } from "./db/connection.js";
import {
  countries,
  evidenceCandidates,
  evidenceClaims,
  evidenceReviews,
  retailerObservations,
  retailers,
  sourceDocuments,
  sourceSnapshots,
  users,
} from "./db/schema.js";
import { repoRoot } from "./paths.js";
import { createVerifiedClaimFromCandidate } from "./research/pipeline.js";
import { approveCandidate } from "./usecases/review.js";

function migrateTestDatabase(db: ReturnType<typeof openTestDatabase>): void {
  for (const file of ["0000_initial.sql", "0001_research_agent.sql", "0002_trace_observability.sql"]) {
    const sql = readFileSync(path.join(repoRoot, "drizzle", file), "utf8")
      .replaceAll("--> statement-breakpoint", "");
    db.$client.exec(sql);
  }
}

describe("manual evidence review", () => {
  it("overrides a numeric conflict and updates a pre-existing review idempotently", async () => {
    const db = openTestDatabase();
    migrateTestDatabase(db);
    const now = Date.now();
    const countryId = "cty_id";
    const candidateId = "ec_pending_conflict";
    const snapshotId = "snap_review";
    const predicate = "announced_store_openings_actual";
    const conflictKeyHash = canonicalHash({
      subject: countryId,
      predicate,
      geo: "ID",
      unit: "store",
    });

    await db.insert(users).values({
      id: "usr_market_radar_ops",
      email: "ops@example.test",
      displayName: "Ops",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(countries).values({
      id: countryId,
      iso2: "ID",
      iso3: "IDN",
      nameEn: "Indonesia",
      timezone: "Asia/Jakarta",
      active: true,
      createdAt: now,
    });
    await db.insert(sourceDocuments).values({
      id: "sdoc_review",
      canonicalUrl: "https://example.test/review",
      publisher: "Example",
      sourceType: "company_news_product_page",
      originClusterId: "example",
      firstSeenAt: now,
      lastSeenAt: now,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(sourceSnapshots).values({
      id: snapshotId,
      sourceDocumentId: "sdoc_review",
      fetchedAt: now,
      publishedAt: now,
      publisher: "Example",
      sourceType: "company_news_product_page",
      language: "en",
      mimeType: "text/plain",
      httpStatus: 200,
      contentHash: "snapshot-hash",
      normalizedText: "The retailer announced one store.",
      parseStatus: "succeeded",
      parserVersion: "test",
      metadataJson: "{}",
      createdAt: now,
    });
    await db.insert(evidenceCandidates).values({
      id: candidateId,
      scanRunId: null,
      subjectEntityType: "country",
      subjectEntityId: countryId,
      subjectText: "ID",
      predicateCode: predicate,
      numericValueDecimal: "1",
      unit: "store",
      observedAt: "2026-01-01",
      countryId,
      geoScopeJson: JSON.stringify({ country_iso2: "ID" }),
      sourceSnapshotId: snapshotId,
      quoteText: "The retailer announced one store.",
      locatorJson: "{}",
      candidateHash: "candidate-hash",
      validationStatus: "review_required",
      validationErrorsJson: JSON.stringify(["conflicts_with_claim:clm_existing"]),
      createdAt: now,
    });
    await db.insert(evidenceClaims).values({
      id: "clm_existing",
      sourceCandidateId: null,
      subjectEntityType: "country",
      subjectEntityId: countryId,
      subjectText: "ID",
      predicateCode: predicate,
      numericValueDecimal: "20",
      unit: "store",
      observedAt: "2026-01-01",
      countryId,
      geoScopeJson: JSON.stringify({ country_iso2: "ID" }),
      sourceSnapshotId: snapshotId,
      quoteText: "Existing conflicting value.",
      locatorJson: "{}",
      verificationStatus: "verified",
      verificationMethod: "corroborated",
      verifiedBy: "usr_market_radar_ops",
      verifiedAt: now,
      sourceQualityBps: 7_000,
      claimQualityBps: 7_000,
      originClusterId: "existing",
      claimIdentityHash: "existing-identity",
      conflictKeyHash,
      claimVersion: 1,
      active: true,
      createdAt: now,
    });
    // Reproduces the legacy partial state: a review row was written while the
    // conflicting candidate remained review_required.
    await db.insert(evidenceReviews).values({
      id: "rev_pending_conflict",
      candidateId,
      reviewerUserId: "usr_market_radar_ops",
      action: "approve",
      beforeJson: "{}",
      afterJson: JSON.stringify({ verified: false }),
      reason: "Legacy partial approval",
      createdAt: now,
    });

    const result = await approveCandidate(db, {
      candidateId,
      expectedCandidateHash: "candidate-hash",
    });

    expect(result.approved).toBe(true);
    expect(result.claimId).toMatch(/^clm_/);
    expect(
      (await db.select().from(evidenceCandidates)).find((candidate) => candidate.id === candidateId)
        ?.validationStatus,
    ).toBe("valid");
    expect(await db.select().from(evidenceClaims)).toHaveLength(2);
    const reviews = await db.select().from(evidenceReviews);
    expect(reviews).toHaveLength(1);
    expect(JSON.parse(reviews[0]!.afterJson ?? "{}")).toMatchObject({
      validation_status: "valid",
      verified: true,
    });
    expect(
      (await db.select().from(evidenceClaims)).find((claim) => claim.sourceCandidateId === candidateId)
        ?.verificationMethod,
    ).toBe("manual");

    const historicalCandidateId = "ec_historical_period";
    await db.insert(evidenceCandidates).values({
      id: historicalCandidateId,
      scanRunId: null,
      subjectEntityType: "country",
      subjectEntityId: countryId,
      subjectText: "ID",
      predicateCode: predicate,
      numericValueDecimal: "100",
      unit: "store",
      observedAt: "2025-01-01",
      countryId,
      geoScopeJson: JSON.stringify({ country_iso2: "ID" }),
      sourceSnapshotId: snapshotId,
      quoteText: "Historical opening plan.",
      locatorJson: "{}",
      candidateHash: "historical-candidate-hash",
      validationStatus: "valid",
      validationErrorsJson: "[]",
      createdAt: now,
    });
    expect(await createVerifiedClaimFromCandidate(db, {
      candidateId: historicalCandidateId,
      snapshotId,
      countryId,
      countryIso: "ID",
      predicate,
      numericValue: "100",
      textValue: null,
      unit: "store",
      observedAt: "2025-01-01",
      quoteText: "Historical opening plan.",
      sourceQualityBps: 7_000,
      originClusterId: "historical",
    })).toBe(true);
    expect(await db.select().from(evidenceClaims)).toHaveLength(3);

    const retailerId = "ret_test_chain";
    await db.insert(retailers).values({
      id: retailerId,
      canonicalName: "Test Chain",
      normalizedName: "test chain",
      countryId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const retailerCandidateId = "ec_retailer_count";
    await db.insert(evidenceCandidates).values({
      id: retailerCandidateId,
      scanRunId: null,
      subjectEntityType: "retailer",
      subjectEntityId: retailerId,
      subjectText: "Test Chain",
      predicateCode: "retailer_store_count_actual",
      numericValueDecimal: "900",
      unit: "store",
      observedAt: "2026-01-01",
      countryId,
      geoScopeJson: JSON.stringify({ country_iso2: "ID" }),
      sourceSnapshotId: snapshotId,
      quoteText: "Test Chain operates 900 stores.",
      locatorJson: "{}",
      candidateHash: "retailer-candidate-hash",
      validationStatus: "valid",
      validationErrorsJson: "[]",
      createdAt: now,
    });
    expect(await createVerifiedClaimFromCandidate(db, {
      candidateId: retailerCandidateId,
      snapshotId,
      countryId,
      countryIso: "ID",
      subjectEntityType: "retailer",
      subjectEntityId: retailerId,
      subjectText: "Test Chain",
      predicate: "retailer_store_count_actual",
      numericValue: "900",
      textValue: null,
      unit: "store",
      observedAt: "2026-01-01",
      quoteText: "Test Chain operates 900 stores.",
      sourceQualityBps: 9_000,
      originClusterId: "test-chain",
    })).toBe(true);
    expect(await db.select().from(retailerObservations)).toHaveLength(1);

    db.$client.close();
  });
});
