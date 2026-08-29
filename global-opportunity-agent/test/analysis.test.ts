import { describe, expect, it } from "vitest";
import {
  assessAdmission,
  assessRisks,
  buildCustomerProfile,
  buildEvidenceChain,
  detectOpportunitySignals,
  generateCustomerPool,
  generateResearchBrief,
  matchProducts,
  scanMarket,
} from "../src/analysis/index.js";

describe("P0 evidence-first analysis", () => {
  it("builds a global market radar and ranked real customer pool", () => {
    const radar = scanMarket("global");
    const pool = generateCustomerPool("global");
    expect(radar.opportunityScore).toBeGreaterThan(70);
    expect(radar.evidenceIds.length).toBeGreaterThan(8);
    expect(pool.customers).toHaveLength(3);
    expect(pool.customers.map((item) => item.customerId).sort()).toEqual(["cencosud", "loblaw", "sigma-chemist"]);
    expect(pool.customers.every((item) => item.poolScore > 50)).toBe(true);
  });

  it.each(["cencosud", "sigma-chemist", "loblaw"])("completes P0 4-10 for %s", (customerId) => {
    const profile = buildCustomerProfile(customerId);
    const signals = detectOpportunitySignals(customerId);
    const admission = assessAdmission(customerId, signals);
    const chain = buildEvidenceChain(customerId);
    const productMatch = matchProducts(customerId, signals);
    const risks = assessRisks(customerId);
    const brief = generateResearchBrief(customerId, admission, signals, productMatch, risks);

    expect(profile.evidenceIds.length).toBeGreaterThan(1);
    expect(signals.length).toBeGreaterThan(1);
    expect(admission.dimensions.some((dimension) => dimension.name === "预算适配" && dimension.status === "unknown")).toBe(true);
    expect(admission.disclaimer).toContain("不代表成交概率");
    expect(chain.coverage.sourceLevelA).toBeGreaterThan(1);
    expect(chain.records.some((record) => record.kind === "fact")).toBe(true);
    expect(chain.records.some((record) => record.kind === "inference")).toBe(true);
    expect(productMatch.matches[0]?.fit).toBe("high");
    expect(productMatch.positioning.length).toBeGreaterThan(20);
    expect(risks.pendingConfirmations).toContain("预算与采购周期");
    expect(risks.risks.every((risk) => risk.mitigation.length > 8)).toBe(true);
    expect(brief.firstMeetingQuestions).toHaveLength(5);
    expect(brief.outreachEmail.body).toContain("coexist");
    expect(brief.evidenceIds.length).toBeGreaterThan(2);
  });
});
