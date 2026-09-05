import { describe, expect, it } from "vitest";

import type { ResearchProviderRequest } from "@market-radar/infrastructure";

import { normalizePiSubmission } from "./pi-research-provider.js";

const request: ResearchProviderRequest = {
  requestId: "rjob_test",
  scanRunId: "scan_test",
  countryId: "cty_vn",
  countryIso2: "VN",
  topicCode: "privacy_and_video_regulation",
  predicates: ["privacy_video_regulation_fit_level", "video_processing_restriction_status"],
  window: { from: "2023-01-01", to: "2026-09-01" },
};

const quote = "Personal data processing requires a lawful purpose and notice to the data subject.";

function validSubmission() {
  return {
    documents: [
      {
        url: "https://regulator.example.vn/privacy/video-guidance",
        publisher: "Example Regulator",
        source_type: "government_regulator_official_statistics" as const,
        published_at: "2025-04-02",
        language: "en",
        source_excerpt: `Official guidance. ${quote} Additional details.`,
        claims: [
          {
            predicate: "video_processing_restriction_status",
            value: "restricted",
            unit: "level",
            observed_at: "2025-04-02",
            quote_text: quote,
          },
        ],
      },
    ],
  };
}

describe("Pi research submission normalization", () => {
  it("accepts grounded claims and attaches provider provenance", () => {
    const documents = normalizePiSubmission(validSubmission(), request, "openai-codex/test-model");

    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      country: "VN",
      topic: "privacy_and_video_regulation",
      provider: "pi-agent",
      extractor_model: "openai-codex/test-model",
      origin_cluster_id: "web_regulator.example.vn",
    });
    expect(documents[0]?.extracted_claims).toEqual([
      {
        predicate: "video_processing_restriction_status",
        value: "restricted",
        unit: "level",
        observed_at: "2025-04-02",
        quote_text: quote,
      },
    ]);
  });

  it("drops claims whose quote is not exact or date is outside the window", () => {
    const submission = validSubmission();
    submission.documents[0]!.claims.push(
      {
        predicate: "privacy_video_regulation_fit_level",
        value: "moderate",
        unit: "level",
        observed_at: "2022-12-31",
        quote_text: quote,
      },
      {
        predicate: "privacy_video_regulation_fit_level",
        value: "moderate",
        unit: "level",
        observed_at: "2025-04-02",
        quote_text: "This quote was not present in the fetched excerpt.",
      },
    );

    const documents = normalizePiSubmission(submission, request, "test-model");
    expect(documents[0]?.extracted_claims).toHaveLength(1);
  });

  it("drops structurally invalid values before persistence", () => {
    const submission = validSubmission();
    submission.documents[0]!.claims[0]!.value = "restricted under certain conditions";

    expect(normalizePiSubmission(submission, request, "test-model")).toEqual([]);
  });

  it("drops semantically mismatched numeric claims before persistence", () => {
    const numericRequest: ResearchProviderRequest = {
      ...request,
      topicCode: "retailer_landscape",
      predicates: ["qualified_retailer_count_actual"],
    };
    const submission = {
      documents: [{
        url: "https://example.test/retail-report",
        publisher: "Example",
        source_type: "industry_association_transparent_research" as const,
        published_at: "2024-01-01",
        language: "en",
        source_excerpt: "7-Eleven had 3,912 stores in 2023.",
        claims: [{
          predicate: "qualified_retailer_count_actual",
          value: "3912",
          unit: "retailer",
          observed_at: "2023-12-31",
          quote_text: "7-Eleven had 3,912 stores in 2023.",
        }],
      }],
    };

    expect(normalizePiSubmission(submission, numericRequest, "test-model")).toEqual([]);
  });

  it("retains locally worded scope ambiguity as low-precision warnings", () => {
    const retailerRequest: ResearchProviderRequest = {
      ...request,
      countryId: "cty_mx",
      countryIso2: "MX",
      topicCode: "retailer_foundations_a",
      predicates: ["retailer_store_count_actual"],
    };
    const localQuote = "En 2024, OXXO operaba 24462 tiendas en México.";
    const submission = {
      documents: [{
        url: "https://example.mx/informe-anual",
        publisher: "OXXO",
        source_type: "audited_annual_report_exchange_filing" as const,
        published_at: "2025-04-01",
        language: "es",
        source_excerpt: localQuote,
        claims: [{
          predicate: "retailer_store_count_actual",
          retailer_name: "OXXO",
          value: "24462",
          unit: "store",
          observed_at: "2024-12-31",
          quote_text: localQuote,
        }],
      }],
    };

    expect(normalizePiSubmission(submission, retailerRequest, "test-model")[0]?.extracted_claims)
      .toEqual([expect.objectContaining({
        retailer_name: "OXXO",
        validation_errors: expect.arrayContaining([
          "retailer_store_unit_not_explicit",
          "retailer_total_store_count_not_explicit",
        ]),
      })]);
  });

  it("preserves grounded retailer identity for store-count facts", () => {
    const retailerRequest: ResearchProviderRequest = {
      ...request,
      countryId: "cty_my",
      countryIso2: "MY",
      topicCode: "retailer_foundations",
      predicates: ["retailer_store_count_actual"],
    };
    const submission = {
      documents: [{
        url: "https://example.test/annual-report",
        publisher: "99 Speed Mart",
        source_type: "audited_annual_report_exchange_filing" as const,
        published_at: "2025-04-01",
        language: "en",
        source_excerpt: "As of 2024, 99 Speed Mart operates a total of 2,778 outlets in Malaysia.",
        claims: [{
          predicate: "retailer_store_count_actual",
          retailer_name: "99 Speed Mart",
          value: "2778",
          unit: "store",
          observed_at: "2024-12-31",
          quote_text: "As of 2024, 99 Speed Mart operates a total of 2,778 outlets in Malaysia.",
        }],
      }],
    };

    expect(normalizePiSubmission(submission, retailerRequest, "test-model")[0]?.extracted_claims)
      .toEqual([expect.objectContaining({ retailer_name: "99 Speed Mart", value: "2778" })]);
    delete (submission.documents[0]!.claims[0] as { retailer_name?: string }).retailer_name;
    expect(normalizePiSubmission(submission, retailerRequest, "test-model")).toEqual([]);
  });

  it("drops documents with no accepted claims", () => {
    const submission = validSubmission();
    submission.documents[0]!.claims[0]!.predicate = "not_allowed";

    expect(normalizePiSubmission(submission, request, "test-model")).toEqual([]);
  });
});
