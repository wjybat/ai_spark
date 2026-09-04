import { beforeEach, describe, expect, it, vi } from "vitest";
import { fauxAssistantMessage, fauxToolCall, type FauxResponseStep } from "@earendil-works/pi-ai";
import { productInput, emailInput } from "./fixtures/generated-materials.js";
import type { PipelineEvent } from "../src/types/domain.js";

const fixture = vi.hoisted(() => ({ responses: [] as FauxResponseStep[] }));
vi.mock("../src/config.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/config.js")>();
  return { ...actual, config: { ...actual.config, provider: "dmall-router", model: "materials-test" }, resolveMode: () => "live" };
});
vi.mock("../src/agent/dmall-router-provider.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/agent/dmall-router-provider.js")>();
  const { fauxProvider } = await import("@earendil-works/pi-ai");
  return { ...actual, dmallRouterProvider: () => {
    const faux = fauxProvider({ provider: actual.DMALL_ROUTER_PROVIDER_ID, models: [{ id: "materials-test" }], tokensPerSecond: 0 });
    faux.setResponses(fixture.responses);
    return faux.provider;
  } };
});
const { runOpportunityPipeline, toolOrder } = await import("../src/agent/orchestrator.js");
const call = (name: string, args: Record<string, unknown>) => fauxAssistantMessage(fauxToolCall(name, args), { stopReason: "toolUse" });
const prefix = () => toolOrder.slice(0, 6).map((name, index) => call(name, index < 2 ? { regionId: "south-america" } : { customerId: "cencosud" }));
const finish = () => [call("assess_customer_risks", { customerId: "cencosud" }), call("generate_research_brief", emailInput), fauxAssistantMessage("模型已完成两个内容模块，建议由销售审核后跟进。")];
const request = { runId: "live-contract-test", regionId: "south-america", customerId: "cencosud", countryId: "brazil", countryName: "巴西", mode: "live" as const };
beforeEach(() => { fixture.responses = []; });

describe("live model-authored tool workflow (scripted provider, no network)", { timeout: 20_000 }, () => {
  it("passes real prior evidence and capability context to generation, then carries generated matching into Brief", async () => {
    fixture.responses = [...prefix(), context => {
      expect(context.systemPrompt).toContain("Dmall capability catalog");
      expect(context.systemPrompt).toContain("selected enterprise cencosud, operating in 巴西");
      expect(context.systemPrompt).toContain("customer battle package, not a country management brief");
      const previous = JSON.stringify(context.messages);
      expect(previous).toContain("cencosud-q2-2026");
      expect(previous).toContain("SAP");
      return call("match_dmall_capabilities", productInput);
    }, call("assess_customer_risks", { customerId: "cencosud" }), context => {
      expect(JSON.stringify(context.messages)).toContain(productInput.analysis.matches[0]!.pilotScope);
      return call("generate_research_brief", emailInput);
    }, fauxAssistantMessage("本次模型匹配和邮件均已生成，需人工审核。")];
    const events: Array<Omit<PipelineEvent, "id">> = [];
    const report = await runOpportunityPipeline(request, event => { events.push(event); });
    expect(report.mode).toBe("live");
    expect(report.countryName).toBe("巴西");
    expect(report.productMatch.generation?.source).toBe("llm");
    expect(report.productMatch.matches[0]?.fitScore).toBe(88);
    expect(report.researchBrief.outreachEmail.body).toBe(emailInput.email.body);
    expect(report.researchBrief.outreachEmail.generation?.model).toBe("materials-test");
    expect(events.filter(event => event.type === "tool_start").map(event => event.toolName)).toEqual(toolOrder);
    expect(events.some(event => event.label === "撰写英文开发邮件")).toBe(true);
    expect(events.some(event => event.label === "分析客户需求与产品适配")).toBe(true);
    for (const event of events.filter(event => ["tool_start", "tool_progress", "tool_end"].includes(event.type))) {
      expect(event.label || "").not.toMatch(/LLM|模型生成|模型校验/i);
    }
  });

  it("repairs invalid matching at the same stage before progressing", async () => {
    const invalid = structuredClone(productInput);
    invalid.analysis.matches[0]!.evidenceIds = ["wrong-customer-evidence"];
    fixture.responses = [...prefix(), call("match_dmall_capabilities", invalid), call("match_dmall_capabilities", productInput), ...finish()];
    const events: Array<Omit<PipelineEvent, "id">> = [];
    const report = await runOpportunityPipeline(request, event => { events.push(event); });
    expect(report.productMatch.matches[0]?.evidenceIds).toEqual(["cencosud-q2-2026"]);
    expect(events.filter(event => event.type === "tool_end" && event.message === "tool failed")).toHaveLength(1);
  });

  it("repairs missing email arguments and never substitutes the old template", async () => {
    fixture.responses = [...prefix(), call("match_dmall_capabilities", productInput), call("assess_customer_risks", { customerId: "cencosud" }), call("generate_research_brief", { customerId: "cencosud" }), call("generate_research_brief", emailInput), fauxAssistantMessage("已修正邮件。")];
    const output = await runOpportunityPipeline(request, () => undefined);
    expect(output.researchBrief.outreachEmail.subject).toBe(emailInput.email.subject);
    expect(output.researchBrief.outreachEmail.body).not.toContain("We have been following");
  });

  it("fails explicitly after three invalid generations without a successful report", async () => {
    const invalid = structuredClone(productInput);
    invalid.analysis.matches[0]!.evidenceIds = ["nonexistent-evidence"];
    fixture.responses = [...prefix(), ...Array.from({ length: 3 }, () => call("match_dmall_capabilities", invalid)), ...finish()];
    const events: Array<Omit<PipelineEvent, "id">> = [];
    await expect(runOpportunityPipeline(request, event => { events.push(event); })).rejects.toThrow("three times; no template fallback");
    expect(events.some(event => event.type === "tool_start" && event.toolName === "assess_customer_risks")).toBe(false);
  });
});
