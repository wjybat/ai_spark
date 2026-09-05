import { describe, expect, it } from "vitest";

import {
  isLowPrecisionAdvisoryError,
  localLanguageSearchInstruction,
  predicateContractInstruction,
  researchLanguages,
  topicResearchInstruction,
  validatePredicateEvidence,
  validatePredicateValue,
} from "./topics.js";

describe("local-language research adaptation", () => {
  it("targets official multi-year Brazil retailer tables", () => {
    const instruction = topicResearchInstruction("retailer_foundations_a", "BR");
    expect(instruction).toContain("AM/PM, BR Mania, Shell Select");
    expect(instruction).toContain("official ABF 2022-2025");
    expect(instruction).toContain("both year columns");
  });

  it("plans local and English searches for every target country", () => {
    expect(researchLanguages("MY")).toEqual(["ms", "en"]);
    expect(researchLanguages("TH")).toEqual(["th", "en"]);
    expect(researchLanguages("SA")).toEqual(["ar", "en"]);
    expect(researchLanguages("BR")).toEqual(["pt", "en"]);
    expect(researchLanguages("MA")).toEqual(["ar", "fr", "en"]);
    expect(localLanguageSearchInstruction("MY")).toContain("bilangan kedai");
    expect(localLanguageSearchInstruction("VN")).toContain("số lượng cửa hàng");
    expect(localLanguageSearchInstruction("MX")).toContain("número de tiendas");
  });
});

describe("research predicate value contracts", () => {
  it("accepts exact numeric and ordinal values", () => {
    expect(validatePredicateValue("format_store_count_actual", "23277", "store")).toEqual([]);
    expect(validatePredicateValue("data_residency_fit_level", "partial", "level")).toEqual([]);
  });

  it("rejects prose and formatted numbers in structured value fields", () => {
    expect(
      validatePredicateValue(
        "data_residency_fit_level",
        "data localization requirements on certain service providers",
        "level",
      ),
    ).toContain("invalid_ordinal_value");
    expect(validatePredicateValue("format_store_count_actual", "23,277 stores", "store"))
      .toContain("invalid_numeric_value");
  });

  it("rejects incorrect units and out-of-range values", () => {
    expect(validatePredicateValue("format_store_count_actual", "23277", "percent"))
      .toContain("invalid_unit:expected_store");
    expect(validatePredicateValue("modern_retail_share_percent", "105", "percent"))
      .toContain("value_above_max:100");
    expect(validatePredicateValue("qualified_retailer_count_actual", "3912", "retailer"))
      .toContain("value_above_max:1000");
  });

  it("renders the exact provider submission contract", () => {
    expect(predicateContractInstruction("store_system_readiness_level"))
      .toContain("exactly one of low|medium|high; unit must be level");
    expect(predicateContractInstruction("qualified_retailer_count_actual"))
      .toContain("never use a store/outlet/establishment count");
  });

  it("rejects nearby facts that do not match retailer and store scopes", () => {
    expect(
      validatePredicateEvidence(
        "qualified_retailer_count_actual",
        "3912",
        "7-Eleven had 3,912 stores in 2023.",
        "2023-12-31",
        "2024-01-01",
      ),
    ).toEqual(expect.arrayContaining([
      "retailer_count_scope_not_explicit",
      "store_or_establishment_count_not_retailer_count",
    ]));
    expect(
      validatePredicateEvidence(
        "addressable_store_base_actual",
        "1300000",
        "There are about 1.3 million sari-sari stores nationwide in 2025.",
        "2025-12-31",
        "2025-12-31",
      ),
    ).toContain("non_target_store_scope");
  });

  it("requires the submitted number and point-in-time year to be grounded", () => {
    expect(
      validatePredicateEvidence(
        "format_store_count_actual",
        "2767",
        "Convenience store outlets increased from 2,736 in 2025 to 2,847 in 2026.",
        "2026-03-31",
        "2026-04-01",
      ),
    ).toContain("numeric_value_not_in_quote");
    expect(
      validatePredicateEvidence(
        "format_store_count_actual",
        "48158",
        "The convenience retail sector reached 48,158 outlets in 2024.",
        "2025-11-21",
        "2025-11-21",
      ),
    ).toContain("observed_year_not_supported_by_quote");
  });

  it("rejects cross-country and non-retail readiness evidence", () => {
    expect(
      validatePredicateEvidence(
        "modern_retail_share_percent",
        "77",
        "In Urban India, modern grocery accounted for 77% of sales in 2023.",
        "2023-12-31",
        "2024-01-01",
        "MY",
      ),
    ).toContain("country_scope_mismatch");
    expect(
      validatePredicateEvidence(
        "store_system_readiness_level",
        "high",
        "Malaysia has 88% banking adoption and widespread digital payments.",
        "2024-12-31",
        "2024-12-31",
        "MY",
      ),
    ).toContain("retail_store_system_signal_not_explicit");
    expect(
      validatePredicateEvidence(
        "video_infrastructure_readiness_level",
        "high",
        "A Malaysian retailer deployed CCTV cameras across its retail stores.",
        "2024-12-31",
        "2024-12-31",
        "MY",
      ),
    ).toEqual([]);
  });

  it("keeps only minimum grounding failures hard in low-precision mode", () => {
    expect(isLowPrecisionAdvisoryError("retailer_store_unit_not_explicit")).toBe(true);
    expect(isLowPrecisionAdvisoryError("document[0].claim[0]:retailer_name_not_in_quote")).toBe(true);
    expect(isLowPrecisionAdvisoryError("country_scope_mismatch")).toBe(true);
    expect(isLowPrecisionAdvisoryError("opening_plan_not_actual_store_count")).toBe(true);
    expect(isLowPrecisionAdvisoryError("numeric_value_not_in_quote")).toBe(false);
  });

  it("accepts a scoped nationwide format observation", () => {
    expect(
      validatePredicateEvidence(
        "format_store_count_actual",
        "48158",
        "The convenience retail sector reached 48,158 outlets in 2024.",
        "2024-12-31",
        "2025-11-21",
      ),
    ).toEqual([]);
    expect(topicResearchInstruction("format_store_count", "PH"))
      .toContain("convenience-store outlets");
    expect(topicResearchInstruction("retailer_foundations_a", "MY"))
      .toContain("99 Speed Mart, 7-Eleven Malaysia, MR D.I.Y. Malaysia");
    expect(topicResearchInstruction("retailer_foundations_b", "MY"))
      .toContain("Watsons Malaysia, KK Super Mart, Guardian Malaysia");
    expect(topicResearchInstruction("retailer_foundations_a", "SA"))
      .toContain("three largest qualified convenience");
    expect(topicResearchInstruction("retailer_foundations_b", "SA"))
      .toContain("three additional qualified convenience");
  });
});
