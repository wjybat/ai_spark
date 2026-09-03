import { describe, expect, it } from "vitest";
import { runOpportunityPipeline, toolOrder } from "../src/agent/orchestrator.js";
import type { PipelineEvent } from "../src/types/domain.js";

describe("pi-agent-core orchestrator", () => {
  it("executes all P0 tools in order and returns a complete report", async () => {
    const events: Array<Omit<PipelineEvent, "id">> = [];
    const output = await runOpportunityPipeline(
      { runId: "test-run", regionId: "global", customerId: "cencosud", countryId: "brazil", countryName: "巴西", mode: "demo" },
      (event) => { events.push(event); },
    );
    const startedTools = events.filter((event) => event.type === "tool_start").map((event) => event.toolName);
    const endedTools = events.filter((event) => event.type === "tool_end").map((event) => event.toolName);

    expect(startedTools).toEqual(toolOrder);
    expect(endedTools).toEqual(toolOrder);
    expect(output.mode).toBe("demo");
    expect(output.marketRadar.regionId).toBe("global");
    expect(output.customerPool.customers).toHaveLength(3);
    expect(output.customerProfile.customerId).toBe("cencosud");
    expect(output.countryId).toBe("brazil");
    expect(output.countryName).toBe("巴西");
    expect(output.opportunitySignals.length).toBeGreaterThan(1);
    expect(output.evidenceChain.records.length).toBeGreaterThan(2);
    expect(output.productMatch.matches[0]?.capabilityName).toBe("Open Platform");
    expect(output.riskAssessment.risks.length).toBeGreaterThanOrEqual(4);
    expect(output.researchBrief.nextActions).toHaveLength(4);
    expect(output.finalNarrative).toContain("巴西国家商机报告");
    expect(output.finalNarrative).toContain("首个潜在客户样本为 Cencosud");
  }, 20_000);

  it("keeps the UAE country report in the UAE market scope", async () => {
    const output = await runOpportunityPipeline(
      { runId: "uae-region-regression", regionId: "uae", customerId: "sigma-chemist", countryId: "uae", countryName: "阿联酋", mode: "demo" },
      () => undefined,
    );

    expect(output.marketRadar.regionId).toBe("uae");
    expect(output.marketRadar.regionName).toBe("阿联酋");
    expect(output.marketRadar.recommendedCountries).toEqual(["阿联酋"]);
    expect(output.marketRadar.evidenceIds.length).toBeGreaterThan(0);
    expect(output.customerPool.regionId).toBe("uae");
    expect(output.customerPool.customers.map((customer) => customer.customerId)).toContain("sigma-chemist");
    expect(output.finalNarrative).toContain("阿联酋国家商机报告");
    expect(output.finalNarrative).not.toMatch(/澳大利亚\s*\/\s*新西兰|regionId=oceania/);
    expect(output.researchBrief.internalActions).toContain("销售确认阿联酋的试点业务范围");
    expect(output.researchBrief.internalActions.join(" ")).not.toContain("澳大利亚或新西兰");
  }, 20_000);
});
