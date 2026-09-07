import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { openTestDatabase } from "./db/connection.js";
import { countries, evidenceClaims, retailerObservations, retailers, sourceDocuments, sourceSnapshots } from "./db/schema.js";
import { repoRoot } from "./paths.js";
import { getRetailerDirectory } from "./usecases/retailers.js";

let db: ReturnType<typeof openTestDatabase>;

beforeEach(async () => {
  db = openTestDatabase();
  db.$client.exec(readFileSync(path.join(repoRoot, "drizzle/0000_initial.sql"), "utf8").replaceAll("--> statement-breakpoint", ""));
  await db.insert(countries).values([
    { id: "cty_vn", iso2: "VN", iso3: "VNM", nameEn: "Vietnam", timezone: "Asia/Ho_Chi_Minh", active: true, createdAt: 1 },
    { id: "cty_br", iso2: "BR", iso3: "BRA", nameEn: "Brazil", timezone: "America/Sao_Paulo", active: true, createdAt: 1 },
  ]);
  await db.insert(retailers).values([
    { id: "ret_chain", canonicalName: "Example Chain", normalizedName: "example chain", countryId: "cty_vn", status: "active", createdAt: 1, updatedAt: 1 },
    { id: "ret_unknown", canonicalName: "Unknown % Chain", normalizedName: "unknown % chain", countryId: "cty_vn", status: "active", createdAt: 1, updatedAt: 1 },
    { id: "ret_br", canonicalName: "Brazil Chain", normalizedName: "brazil chain", countryId: "cty_br", status: "active", createdAt: 1, updatedAt: 1 },
  ]);
  await db.insert(sourceDocuments).values({ id: "doc", canonicalUrl: "https://example.test/report", publisher: "Annual report", sourceType: "audited_annual_report_exchange_filing", firstSeenAt: 1, lastSeenAt: 1, status: "active", createdAt: 1, updatedAt: 1 });
  await db.insert(sourceSnapshots).values({ id: "snap", sourceDocumentId: "doc", fetchedAt: 1, sourceType: "audited_annual_report_exchange_filing", mimeType: "text/plain", httpStatus: 200, contentHash: "hash", normalizedText: "The chain has stores.", parseStatus: "succeeded", parserVersion: "test", metadataJson: "{}", createdAt: 1 });
});

afterEach(() => db.$client.close());

async function observation(id: string, value: string, date: string | null, options: {
  status?: string; active?: boolean; retailerId?: string; countryId?: string;
  method?: string; metric?: string; unit?: string; claimRetailerId?: string;
} = {}): Promise<void> {
  const retailerId = options.retailerId ?? "ret_chain";
  const metric = options.metric ?? "store_count_actual";
  await db.insert(evidenceClaims).values({
    id, subjectEntityType: "retailer", subjectEntityId: options.claimRetailerId ?? retailerId,
    subjectText: "Example Chain", predicateCode: metric === "store_count_actual" ? "retailer_store_count_actual" : "announced_store_openings_actual",
    numericValueDecimal: value, unit: options.unit ?? "store", effectiveFrom: date, observedAt: date,
    countryId: options.countryId ?? "cty_vn", geoScopeJson: "{}", sourceSnapshotId: "snap",
    quoteText: "The chain has stores.", locatorJson: '{"page":1}',
    verificationStatus: options.status ?? "verified", verificationMethod: options.method ?? "manual",
    verifiedAt: 1, sourceQualityBps: 9200, claimQualityBps: 8800,
    claimIdentityHash: id, conflictKeyHash: id, claimVersion: 1, active: options.active ?? true, createdAt: 1,
  });
  await db.insert(retailerObservations).values({ id: `obs_${id}`, retailerId, metricCode: metric,
    numericValueDecimal: value, unit: options.unit ?? "store", effectiveFrom: date, claimId: id, createdAt: 1 });
}

const scope = { countryIds: ["cty_vn"], asOf: "2026-09-01" };

describe("retailer directory", () => {
  it("keeps master records without evidence visible and scopes countries explicitly", async () => {
    const result = await getRetailerDirectory(db, scope);
    expect(result.items.map((r) => r.retailer_id)).toEqual(["ret_chain", "ret_unknown"]);
    expect(result.items.every((r) => r.latest_store_count === null)).toBe(true);
    expect(result.countries.map((c) => c.country_id)).toEqual(["cty_vn"]);
    expect((await getRetailerDirectory(db, { ...scope, countryIds: [] })).items).toEqual([]);
    expect((await getRetailerDirectory(db, { ...scope, countryId: "cty_br" })).items).toEqual([]);
  });

  it("selects the latest dated actual count and retains quote, source and claim lineage", async () => {
    await observation("new", "600", "2025-12-31");
    await observation("older-imported-later", "500", "2022-12-31");
    await observation("future", "700", "2027-01-01");
    await observation("undated", "900", null);
    const result = await getRetailerDirectory(db, scope);
    const item = result.items[0]!;
    expect(item.latest_store_count).toMatchObject({ value: "600", data_as_of: "2025-12-31", claim_id: "new", claim_version: 1, evidence_quality: 88, source_url: "https://example.test/report", quote: "The chain has stores." });
    expect(item.observations.map((o) => o.claim_id)).not.toContain("future");
    expect(item.observations.find((o) => o.claim_id === "undated")?.data_as_of).toBeNull();
    expect(result.total).toBe(2);
  });

  it("excludes disputed, superseded and cross-retailer claims, plans and non-store units", async () => {
    await observation("valid-zero", "0", "2025-01-01");
    await observation("disputed", "999", "2026-01-01", { status: "disputed", active: false });
    await observation("superseded", "999", "2026-01-01", { status: "superseded", active: false });
    await observation("wrong-retailer", "999", "2026-01-01", { claimRetailerId: "ret_unknown" });
    await observation("wrong-country", "999", "2026-01-01", { countryId: "cty_br" });
    await observation("planned", "999", "2026-01-01", { metric: "announced_store_openings_actual" });
    await observation("bad-unit", "999", "2026-01-01", { unit: "percent" });
    const item = (await getRetailerDirectory(db, scope)).items[0]!;
    expect(item.latest_store_count?.value).toBe("0");
    expect(item.observations.map((o) => o.claim_id)).toEqual(["valid-zero"]);
  });

  it("discloses low precision and same-date conflicting values rather than hiding them", async () => {
    await observation("one", "600", "2025-12-31", { method: "auto_low_precision" });
    await observation("two", "650", "2025-12-31");
    const item = (await getRetailerDirectory(db, scope)).items[0]!;
    expect(item.latest_store_count).toBeNull();
    expect(item.has_conflicting_latest_counts).toBe(true);
    expect(item.observations.find((o) => o.claim_id === "one")?.verification_method).toBe("auto_low_precision");
  });

  it("filters names literally and returns an honest empty result without writing data", async () => {
    const before = db.$client.prepare("SELECT total_changes() AS n").get();
    expect((await getRetailerDirectory(db, { ...scope, query: "  EXAMPLE  " })).items).toHaveLength(1);
    expect((await getRetailerDirectory(db, { ...scope, query: "%" })).items.map((r) => r.retailer_id)).toEqual(["ret_unknown"]);
    expect((await getRetailerDirectory(db, { ...scope, query: "no match" })).total).toBe(0);
    expect(db.$client.prepare("SELECT total_changes() AS n").get()).toEqual(before);
  });
});
