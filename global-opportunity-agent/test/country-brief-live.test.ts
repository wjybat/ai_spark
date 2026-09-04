import {describe,it,expect,vi} from "vitest";
import {fauxAssistantMessage,fauxToolCall,type FauxResponseStep} from "@earendil-works/pi-ai";
const fixture=vi.hoisted(()=>({responses:[] as FauxResponseStep[]}));
vi.mock("../src/config.js",async original=>{
  const actual=await original<typeof import("../src/config.js")>();
  return {...actual,config:{...actual.config,provider:"openai-compatible",model:"country-test"},resolveMode:()=>"live"};
});
vi.mock("../src/agent/compatible-provider.js",async original=>{
  const actual=await original<typeof import("../src/agent/compatible-provider.js")>();
  const {fauxProvider}=await import("@earendil-works/pi-ai");
  return {...actual,compatibleProvider:()=>{const faux=fauxProvider({provider:actual.COMPATIBLE_PROVIDER_ID,models:[{id:"country-test"}],tokensPerSecond:0});faux.setResponses(fixture.responses);return faux.provider;}};
});
const {runCountryBrief}=await import("../src/agent/country-brief.js");
const {getCountryContext}=await import("../src/data/country-research.js");
const c=getCountryContext("canada");
const call=(name:string,args:object)=>fauxAssistantMessage([fauxToolCall(name,args)],{stopReason:"toolUse"});
const prefix=()=>[call("read_country_context",{}),...c.companies.map(p=>call("read_company_evidence",{companyId:p.id}))];
describe("live national synthesis contract, scripted model without network",()=>{
  it("passes all three full dossiers to the model and publishes its authored national result",async()=>{
    const authored=structuredClone(c.draft);authored.executiveSummary="本次模型综合结论："+authored.executiveSummary;
    fixture.responses=[...prefix(),context=>{
      expect(context.systemPrompt).toContain("不能跳过后两家");
      const input=JSON.stringify(context.messages);
      for(const company of c.companies){expect(input).toContain(company.name);expect(input).toContain(company.systems[0]);expect(input).toContain(company.evidence[0]!.id);}
      return call("submit_country_brief",authored);
    }];
    const output=await runCountryBrief({runId:"live-national-test",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.analysis.executiveSummary).toBe(authored.executiveSummary);
    expect(output.generation.source).toBe("llm");expect(output.generation.model).toBe("country-test");
    expect(output.analysis.companyAssessments).toHaveLength(3);
  });
  it("repairs wrong evidence and never publishes a single-company result as a national brief",async()=>{
    const bad=structuredClone(c.draft);bad.companyAssessments[1]!.evidenceIds=["C1-source-1"];
    fixture.responses=[...prefix(),call("submit_country_brief",bad),call("submit_country_brief",c.draft)];
    const output=await runCountryBrief({runId:"repair-country",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.analysis.companyAssessments[1]!.evidenceIds).toContain("C2-profile");
    const single=structuredClone(c.draft);single.companyAssessments=single.companyAssessments.slice(0,1);
    fixture.responses=[...prefix(),...Array.from({length:3},()=>call("submit_country_brief",single))];
    await expect(runCountryBrief({runId:"reject-country",countryId:"canada",mode:"live"},()=>undefined)).rejects.toThrow(/国家简报未完成/);
  });
  it("returns the exact available citation index when schema validation rejects an invented risk reference",async()=>{
    const bad=structuredClone(c.draft);
    bad.risks[1]!.evidenceIds=["C1-risk"];
    expect(c.companies[0]!.evidence.some(e=>e.id==="C1-risk")).toBe(false);
    fixture.responses=[...prefix(),call("submit_country_brief",bad),context=>{
      const repair=JSON.stringify(context.messages.at(-1));
      expect(repair).toContain("本次提交未被接受");
      expect(repair).toContain("risks.1.evidenceIds.0");
      expect(repair).toContain("本次唯一可用引用索引");
      for(const company of c.companies) for(const evidence of company.evidence) expect(repair).toContain(evidence.id);
      expect(repair).toContain("禁止根据另一家企业的编号猜测");
      return call("submit_country_brief",c.draft);
    }];
    const events=[];
    const output=await runCountryBrief({runId:"repair-schema-country",countryId:"canada",mode:"live"},event=>{events.push(event);});
    expect(output.generation.source).toBe("llm");
    expect(output.analysis.risks[1]!.evidenceIds).not.toContain("C1-risk");
    expect(events.some(e=>e.type==="tool_end"&&e.data?.validationError)).toBe(true);
  });
});
