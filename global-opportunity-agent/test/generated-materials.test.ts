import { describe, expect, it } from "vitest";
import { validateToolArguments } from "@earendil-works/pi-ai";
import { buildEvidenceChain } from "../src/analysis/index.js";
import { acceptGeneratedProduct, acceptGeneratedEmail, generatedProductSchema, generatedBriefSchema } from "../src/agent/generated-materials.js";
import { createOpportunityTools } from "../src/agent/tools.js";
import { productInput, emailInput } from "./fixtures/generated-materials.js";

const chain = buildEvidenceChain("cencosud");
const model = { provider: "test", model: "test-model", thinkingEffort: "high" };
function validate(name: string, parameters, args) { return validateToolArguments({ name, description: "test", parameters }, { id: "test", type: "toolCall", name, arguments: args }); }

describe("generated material contracts", () => {
  it("retains model-authored ranking, reasoning and pilot while enforcing canonical capability boundaries", () => {
    validate("match", generatedProductSchema, productInput);
    const result = acceptGeneratedProduct(productInput, chain, model);
    expect(result.matches.map(item => item.fitScore)).toEqual([88, 78]);
    expect(result.matches[0]?.capabilityName).toBe("OMS / 全渠道履约");
    expect(result.matches[0]?.pilotScope).toBe(productInput.analysis.matches[0]?.pilotScope);
    expect(result.matches[0]?.reasons).toEqual(productInput.analysis.matches[0]?.reasons);
    expect(result.matches[0]?.prerequisites).toContain("实时库存可用");
    expect(result.avoidClaims).toContain("替换 SAP");
    expect(result.generation).toMatchObject({ source: "llm", model: "test-model", requiresHumanReview: true });
  });

  it("keeps the model-written email verbatim and records its verified evidence", () => {
    validate("brief", generatedBriefSchema, emailInput);
    const result = acceptGeneratedEmail(emailInput, chain, model);
    expect(result.body).toBe(emailInput.email.body);
    expect(result.subject).toBe(emailInput.email.subject);
    expect(result.evidenceIds).toEqual(["cencosud-q2-2026"]);
    expect(result.generation?.source).toBe("llm");
  });

  it("requires generated arguments in live mode while demo keeps the simple deterministic contract", () => {
    for (const name of ["match_dmall_capabilities", "generate_research_brief"]) {
      const live = createOpportunityTools({ mode: "live" }).tools.find(item => item.name === name)!;
      const demo = createOpportunityTools({ mode: "demo" }).tools.find(item => item.name === name)!;
      const call = { type: "toolCall" as const, id: "test", name, arguments: { customerId: "cencosud" } };
      expect(() => validateToolArguments(live, call)).toThrow();
      expect(() => validateToolArguments(demo, call)).not.toThrow();
    }
  });

  it("rejects invalid scores, unknown capabilities, and missing authored text through the harness schema", () => {
    for (const change of [
      (draft) => { draft.analysis.matches[0].fitScore = 101; },
      (draft) => { draft.analysis.matches[0].capabilityId = "invented-product"; },
      (draft) => { draft.analysis.matches[0].pilotScope = ""; },
    ]) {
      const draft = structuredClone(productInput); change(draft);
      expect(() => validate("match", generatedProductSchema, draft)).toThrow();
    }
  });

  it("rejects cross-customer citations, inference-only support, duplicate capabilities and repeated reasoning", () => {
    for (const change of [
      (draft) => { draft.analysis.matches[0].evidenceIds = ["loblaw-annual-2025"]; },
      (draft) => { draft.analysis.matches[0].evidenceIds = ["cencosud-opportunity-inference"]; },
      (draft) => { draft.analysis.matches[1].capabilityId = draft.analysis.matches[0].capabilityId; },
      (draft) => { draft.analysis.matches[1].reasons = draft.analysis.matches[0].reasons; },
    ]) {
      const draft = structuredClone(productInput); change(draft);
      expect(() => acceptGeneratedProduct(draft, chain, model)).toThrow();
    }
  });

  it("rejects Chinese or short emails and inference citations instead of falling back to a template", () => {
    for (const change of [
      (draft) => { draft.email.body += " 智利"; },
      (draft) => { draft.email.body = "Hi, please meet us."; },
      (draft) => { draft.email.evidenceIds = ["cencosud-opportunity-inference"]; },
      (draft) => { draft.email.evidenceIds = ["loblaw-google-ai"]; },
      (draft) => { draft.email.subject += "\nSecond subject"; },
    ]) {
      const draft = structuredClone(emailInput); change(draft);
      expect(() => acceptGeneratedEmail(draft, chain, model)).toThrow();
    }
  });
});
