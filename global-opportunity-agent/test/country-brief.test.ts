import { describe, expect, it } from "vitest";
import { countryBriefCatalog, getCountryContext } from "../src/data/country-research.js";
import { acceptCountryBrief, runCountryBrief } from "../src/agent/country-brief.js";
import { RunStore } from "../src/http/run-store.js";
import { createCompatibleModel } from "../src/agent/compatible-provider.js";

describe("country management brief",{timeout:20_000},()=>{
  it("passes Brazil's official counts, source years and online sales ratio to the brief", () => {
    const context = getCountryContext("brazil");
    expect(context.asOf).toBe("2026-09-05");
    expect(context.evidence.find(item => item.id === "M1")).toMatchObject({ kind: "fact" });
    expect(context.evidence.find(item => item.id === "M1")?.text).toContain("巴西雷亚尔");
    expect(context.evidence.find(item => item.id === "M3")).toMatchObject({ kind: "fact" });
    expect(context.evidence.find(item => item.id === "M3")?.text).toContain("9.78%");
    expect(context.market.counts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "零售企业", value: "1,175,862", period: "2024", basis: "公开资料" }),
      expect.objectContaining({ label: "零售经营网点", value: "1,329,153", period: "2024", basis: "公开资料" }),
      expect.objectContaining({ label: "特许经营品牌", value: "3,297", period: "2025", basis: "公开资料" }),
    ]));
  });
  it("reads exactly the same three companies as each of the eleven country pages and answers all six questions",async()=>{
    expect(countryBriefCatalog).toHaveLength(11);
    for (const item of countryBriefCatalog) {
      const context=getCountryContext(item.id);
      expect(context.market.counts).toEqual(expect.arrayContaining([expect.objectContaining({ basis: "公开资料", source: expect.objectContaining({ url: expect.stringMatching(/^https:\/\//) }) })]));
      expect(JSON.stringify(context.market.counts)).not.toMatch(/估算|待核实|约 /);
      for (const metric of context.market.metrics as Array<{ value: string; unit?: string; source: { url: string } }>) {
        expect(metric.source.url).toMatch(/^https:\/\//);
        expect(metric.value).not.toMatch(/估算|待核实|约 /);
        if (metric.unit) expect(context.evidence.some(e => e.text.includes(metric.value + metric.unit))).toBe(true);
      }
      for(const c of context.companies){
        expect(c.business.length).toBeGreaterThan(1);expect(c.systems.length).toBeGreaterThan(1);
        expect(c.digital.length).toBeGreaterThan(1);expect(c.roles.length).toBeGreaterThan(1);
        expect(c.evidence.some(e=>e.kind==="fact"&&e.source?.url.startsWith("https://"))).toBe(true);
      }
      const stages:string[]=[];
      const output=await runCountryBrief({runId:`test-${item.id}`,countryId:item.id,mode:"demo"},e=>{if(e.type==="tool_start")stages.push(e.label!);});
      expect(stages).toHaveLength(5);
      expect(stages.slice(1,4)).toEqual(context.companies.map(c=>`研究 ${c.name}`));
      expect(output.scope).toBe("country");expect(output.generation.source).toBe("rules");
      expect(output.analysis.companyAssessments.map(c=>c.companyId)).toEqual(item.companyIds);
      expect(output.analysis.keySignals.length).toBeGreaterThanOrEqual(3);
      expect(output.analysis.risks.length).toBeGreaterThanOrEqual(3);
      expect(output.analysis.nextActions.length).toBeGreaterThanOrEqual(3);
      expect(output.analysis.confidence.gaps.length).toBeGreaterThan(1);
      expect(output.analysis.title).toContain(item.name);
    }
  });
  it("rejects dropped companies and mixed evidence, and conservatively labels inferred signals",()=>{
    const context=getCountryContext("canada");
    const missing=structuredClone(context.draft);missing.companyAssessments.pop();
    expect(()=>acceptCountryBrief(missing,context)).toThrow(/three/);
    const crossed=structuredClone(context.draft);crossed.companyAssessments[1]!.evidenceIds=[context.companies[0]!.evidence[0]!.id];
    expect(()=>acceptCountryBrief(crossed,context)).toThrow(/cross-company/);
    const falseFact=structuredClone(context.draft);falseFact.keySignals[0]!.basis="事实";falseFact.keySignals[0]!.evidenceIds=[context.companies[0]!.evidence.find(e=>e.kind==="inference")!.id];
    expect(acceptCountryBrief(falseFact,context).keySignals[0]!.basis).toBe("研判");
    expect(falseFact.keySignals[0]!.basis).toBe("事实");
    const macro=structuredClone(context.draft);macro.keySignals.push({title:"国家电商指标",detail:"使用官方国家统计作为共同市场背景",basis:"事实",companyIds:context.companies.map(c=>c.id),evidenceIds:["M3"]});
    expect(acceptCountryBrief(macro,context).keySignals[3]!.evidenceIds).toEqual(["M3"]);
    macro.companyAssessments[0]!.evidenceIds=["M3"];
    expect(()=>acceptCountryBrief(macro,context)).toThrow(/cross-company/);
    const absent=structuredClone(context.draft);absent.keySignals=absent.keySignals.map(s=>({...s,companyIds:[context.companies[0]!.id],evidenceIds:[context.companies[0]!.evidence[0]!.id]}));
    expect(()=>acceptCountryBrief(absent,context)).toThrow(/cover all three/);
    const store=new RunStore();
    expect(()=>store.create({scope:"country",countryId:"africa",mode:"demo"})).toThrow(/Unknown country/);
    expect(()=>store.create({scope:"country",countryId:"canada",customerId:"loblaw"})).toThrow(/all three/);
    expect(()=>store.create({scope:"customer",countryId:"canada",countryName:"加拿大",customerId:"canada-candidate-1",regionId:"canada"})).toThrow();
    expect(()=>store.create({countryId:"uae",countryName:"爱尔兰",customerId:"sigma-chemist",regionId:"uae"})).toThrow(/do not match|must target/);
  });
  it("routes Qwen through the configured compatible chat endpoint without Responses-only parameters",()=>{
    const model=createCompatibleModel({baseUrl:"https://example.test/compatible-mode/v1/",modelId:"qwen3.7-flash"});
    expect(model.api).toBe("openai-completions");expect(model.baseUrl).toBe("https://example.test/compatible-mode/v1");
    expect(model.compat).toMatchObject({thinkingFormat:"qwen",maxTokensField:"max_tokens",supportsReasoningEffort:false,supportsDeveloperRole:false});
  });
});
