import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { openTestDatabase } from "./db/connection.js";
import { evidenceCandidates, evidenceClaims } from "./db/schema.js";
import { repoRoot } from "./paths.js";
import { executeTopicResearch } from "./research/pipeline.js";

function testDatabase() {
  const db = openTestDatabase();
  for (const file of ["0000_initial.sql", "0001_research_agent.sql", "0002_trace_observability.sql"]) {
    const sql = readFileSync(path.join(repoRoot, "drizzle", file), "utf8")
      .replaceAll("--> statement-breakpoint", "");
    db.$client.exec(sql);
  }
  db.$client.pragma("foreign_keys = OFF");
  return db;
}

describe("low-precision evidence admission", () => {
  it("auto-verifies soft local-language ambiguity with warnings and reduced quality", async () => {
    const db = testDatabase();
    const quote = "En 2024, OXXO operaba 24462 tiendas en México.";

    const result = await executeTopicResearch(db, {
      scanRunId: "scan_reviewable",
      planItemId: "rpi_reviewable",
      countryId: "cty_mx",
      topicCode: "retailer_foundations_a",
      window: { from: "2022-01-01", to: "2026-09-01" },
      documents: [{
        country: "MX",
        topic: "retailer_foundations_a",
        source_type: "audited_annual_report_exchange_filing",
        publisher: "OXXO",
        url: "https://example.mx/informe-anual",
        published_at: "2025-04-01",
        language: "es",
        text: quote,
        provider: "pi-agent",
        extracted_claims: [{
          predicate: "retailer_store_count_actual",
          retailer_name: "OXXO",
          value: "24462",
          unit: "store",
          observed_at: "2024-12-31",
          quote_text: quote,
          validation_errors: [
            "retailer_store_unit_not_explicit",
            "retailer_total_store_count_not_explicit",
          ],
        }],
      }],
    });

    expect(result).toMatchObject({ candidates: 1, verified: 1, reviewRequired: 0 });
    const candidates = await db.select().from(evidenceCandidates);
    expect(candidates[0]?.validationStatus).toBe("valid");
    expect(JSON.parse(candidates[0]!.validationErrorsJson)).toEqual(expect.arrayContaining([
      "retailer_store_unit_not_explicit",
      "retailer_total_store_count_not_explicit",
    ]));
    const claims = await db.select().from(evidenceClaims);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({
      verificationStatus: "verified",
      verificationMethod: "auto_low_precision",
      verifiedBy: null,
      claimQualityBps: 4_000,
    });
    db.$client.close();
  });

  it("auto-verifies regulatory classifications without entering a review queue", async () => {
    const db = testDatabase();
    const quote = "Video surveillance is subject to the national personal data law.";

    const result = await executeTopicResearch(db, {
      scanRunId: "scan_regulatory_low_precision",
      planItemId: "rpi_regulatory_low_precision",
      countryId: "cty_mx",
      topicCode: "privacy_and_video_regulation",
      window: { from: "2022-01-01", to: "2026-09-01" },
      documents: [{
        country: "MX",
        topic: "privacy_and_video_regulation",
        source_type: "government_regulator_official_statistics",
        publisher: "Regulator",
        url: "https://example.mx/privacy",
        published_at: "2025-04-01",
        language: "en",
        text: quote,
        provider: "pi-agent",
        extracted_claims: [{
          predicate: "video_processing_restriction_status",
          value: "restricted",
          unit: "level",
          observed_at: "2025-04-01",
          quote_text: quote,
        }],
      }],
    });

    expect(result).toMatchObject({ candidates: 1, verified: 1, reviewRequired: 0 });
    const candidate = (await db.select().from(evidenceCandidates))[0]!;
    expect(candidate.validationStatus).toBe("valid");
    expect(JSON.parse(candidate.validationErrorsJson))
      .toContain("manual_review_bypassed:low_precision_policy");
    expect((await db.select().from(evidenceClaims))[0]).toMatchObject({
      verificationMethod: "auto_low_precision",
      verifiedBy: null,
      claimQualityBps: 4_000,
    });
    db.$client.close();
  });

  it("auto-verifies same-period conflicting leads without manual review", async () => {
    const db = testDatabase();
    const quotes = [
      "Mexico had 100 convenience stores in 2024.",
      "Mexico had 250 convenience stores in 2024.",
    ];

    const result = await executeTopicResearch(db, {
      scanRunId: "scan_conflicting_low_precision",
      planItemId: "rpi_conflicting_low_precision",
      countryId: "cty_mx",
      topicCode: "format_store_count",
      window: { from: "2022-01-01", to: "2026-09-01" },
      documents: quotes.map((quote, index) => ({
        country: "MX",
        topic: "format_store_count",
        source_type: "mainstream_business_media",
        publisher: `Publisher ${index + 1}`,
        url: `https://example.mx/store-count-${index + 1}`,
        published_at: "2025-04-01",
        language: "en",
        text: quote,
        provider: "pi-agent" as const,
        extracted_claims: [{
          predicate: "format_store_count_actual",
          value: index === 0 ? "100" : "250",
          unit: "store",
          observed_at: "2024-12-31",
          quote_text: quote,
        }],
      })),
    });

    expect(result).toMatchObject({ candidates: 2, verified: 2, reviewRequired: 0 });
    expect((await db.select().from(evidenceCandidates)).map((candidate) => candidate.validationStatus))
      .toEqual(["valid", "valid"]);
    const claims = await db.select().from(evidenceClaims);
    expect(claims).toHaveLength(2);
    expect(claims.some((claim) =>
      claim.verificationMethod === "auto_low_precision" && claim.claimQualityBps === 4_000,
    )).toBe(true);
    db.$client.close();
  });

  it("still rejects a number that is absent from the exact quote", async () => {
    const db = testDatabase();
    const quote = "OXXO operaba tiendas en México durante 2024.";

    const result = await executeTopicResearch(db, {
      scanRunId: "scan_hard_invalid",
      planItemId: "rpi_hard_invalid",
      countryId: "cty_mx",
      topicCode: "retailer_foundations_a",
      window: { from: "2022-01-01", to: "2026-09-01" },
      documents: [{
        country: "MX",
        topic: "retailer_foundations_a",
        source_type: "audited_annual_report_exchange_filing",
        publisher: "OXXO",
        url: "https://example.mx/informe-invalido",
        published_at: "2025-04-01",
        language: "es",
        text: quote,
        provider: "pi-agent",
        extracted_claims: [{
          predicate: "retailer_store_count_actual",
          retailer_name: "OXXO",
          value: "24462",
          unit: "store",
          observed_at: "2024-12-31",
          quote_text: quote,
        }],
      }],
    });

    expect(result).toMatchObject({ candidates: 1, verified: 0, reviewRequired: 0 });
    expect((await db.select().from(evidenceCandidates))[0]?.validationStatus).toBe("invalid");
    expect(await db.select().from(evidenceClaims)).toEqual([]);
    db.$client.close();
  });
});
