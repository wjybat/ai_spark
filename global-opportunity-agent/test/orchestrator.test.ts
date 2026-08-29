import { describe, expect, it } from "vitest";
import { runOpportunityPipeline, toolOrder } from "../src/agent/orchestrator.js";
import type { PipelineEvent } from "../src/types/domain.js";

describe("pi-agent-core orchestrator", () => {
  it("executes all P0 tools in order and returns a complete report", async () => {
    const events: Array<Omit<PipelineEvent, "id">> = [];
    const output = await runOpportunityPipeline(
      { runId: "test-run", regionId: "global", customerId: "cencosud", mode: "demo" },
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
    expect(output.opportunitySignals.length).toBeGreaterThan(1);
    expect(output.evidenceChain.records.length).toBeGreaterThan(2);
    expect(output.productMatch.matches[0]?.capabilityName).toBe("Open Platform");
    expect(output.riskAssessment.risks.length).toBeGreaterThanOrEqual(4);
    expect(output.researchBrief.nextActions).toHaveLength(4);
    expect(output.finalNarrative).toContain("待确认项");
  }, 20_000);
});
