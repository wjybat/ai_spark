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
const repair=(fields:Record<string,unknown>)=>call("repair_country_brief",{changes:Object.entries(fields).map(([field,value])=>({field,value}))});
// Evidence loading is now deterministic application work, not model round trips.
describe("live national synthesis contract, scripted model without network",()=>{
  it("passes all three full dossiers to the model and publishes its authored national result",async()=>{
    const authored=structuredClone(c.draft);authored.executiveSummary="本次模型综合结论："+authored.executiveSummary;
    let requests=0;
    fixture.responses=[context=>{
      requests+=1;
      expect(context.systemPrompt).toContain("不能跳过后两家");
      expect(context.tools?.map(t=>t.name)).not.toContain("read_company_evidence");
      const input=JSON.stringify(context.messages);
      for(const company of c.companies){expect(input).toContain(company.name);expect(input).toContain(company.systems[0]);expect(input).toContain(company.evidence[0]!.id);}
      expect(input).not.toContain(c.draft.executiveSummary);
      return call("submit_country_brief",authored);
    }];
    const events: Array<{type:string;message?:string;data?:unknown}>=[];
    const output=await runCountryBrief({runId:"live-national-test",countryId:"canada",mode:"live"},event=>{events.push(event);});
    expect(output.analysis.executiveSummary).toBe(authored.executiveSummary);
    expect(output.generation.source).toBe("llm");expect(output.generation.model).toBe("country-test");
    expect(output.analysis.companyAssessments).toHaveLength(3);
    expect(requests).toBe(1);
    expect(output.diagnostics.modelTurns).toHaveLength(1);
    expect(output.diagnostics.validationFailures).toEqual([]);
    expect(events.some(e=>e.type==="tool_progress"&&e.message?.includes("模型"))).toBe(true);
  });
  it("repairs wrong evidence and never publishes a single-company result as a national brief",async()=>{
    const bad=structuredClone(c.draft);bad.companyAssessments[1]!.evidenceIds=["C1-source-1"];
    fixture.responses=[call("submit_country_brief",bad),call("submit_country_brief",c.draft)];
    const output=await runCountryBrief({runId:"repair-country",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.analysis.companyAssessments[1]!.evidenceIds).toContain("C2-profile");
    const single=structuredClone(c.draft);single.companyAssessments=single.companyAssessments.slice(0,1);
    fixture.responses=Array.from({length:3},()=>call("submit_country_brief",single));
    await expect(runCountryBrief({runId:"reject-country",countryId:"canada",mode:"live"},()=>undefined)).rejects.toThrow(/国家简报未完成/);
  });
  it("does not let a partial repair bypass validation of unchanged fields",async()=>{
    const bad=structuredClone(c.draft);
    bad.companyAssessments[1]!.evidenceIds=[c.companies[0]!.evidence[0]!.id];
    fixture.responses=[call("submit_country_brief",bad),repair({title:c.draft.title}),repair({companyAssessments:c.draft.companyAssessments})];
    const output=await runCountryBrief({runId:"validate-entire-repair",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.diagnostics.validationFailures).toHaveLength(2);
    expect(output.diagnostics.validationFailures.every(e=>e.message.includes("cross-company"))).toBe(true);
    expect(output.analysis.executiveSummary).toBe(bad.executiveSummary);
    expect(output.analysis.companyAssessments).toEqual(c.draft.companyAssessments);
  });
  it("requires explicit nonempty field-value changes to repair a rejected title",async()=>{
    const bad=structuredClone(c.draft);bad.title="加拿大";
    fixture.responses=[call("submit_country_brief",bad),context=>{
      const schema=context.tools!.find(t=>t.name==="repair_country_brief")!.parameters as {required:string[]};
      expect(schema.required).toEqual(["changes"]);
      return call("repair_country_brief",{changes:[]});
    },repair({title:c.draft.title})];
    const output=await runCountryBrief({runId:"repair-title-contract",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.analysis.title).toBe(c.draft.title);
    expect(output.analysis.executiveSummary).toBe(bad.executiveSummary);
    expect(output.diagnostics.validationFailures).toHaveLength(2);
  });
  it("reports the selected repair field's precise constraint, not unrelated union branches",async()=>{
    const bad=structuredClone(c.draft);bad.title="加拿大";
    fixture.responses=[call("submit_country_brief",bad),repair({title:"短"}),context=>{
      const error=JSON.stringify(context.messages.at(-1));
      expect(error).toContain("title: must not have fewer than 5 characters");
      expect(error).not.toContain("must be equal to constant");
      return repair({title:c.draft.title});
    }];
    const output=await runCountryBrief({runId:"precise-repair-error",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.analysis.title).toBe(c.draft.title);
  });
  it("reports missing company names alongside schema errors in a single repair request",async()=>{
    const bad=structuredClone(c.draft);bad.nextActions[0]!.deliverable="清单";bad.opportunityLogic="本次分析仅描述市场共性与需求边界。".repeat(10);
    fixture.responses=[call("submit_country_brief",bad),context=>{
      const error=JSON.stringify(context.messages.at(-1));
      expect(error).toContain("nextActions.0.deliverable");
      expect(error).toContain("opportunityLogic");
      for(const company of c.companies)expect(error).toContain(company.name);
      return repair({nextActions:c.draft.nextActions,opportunityLogic:c.draft.opportunityLogic});
    }];
    const output=await runCountryBrief({runId:"combined-repair",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.diagnostics.modelTurns).toHaveLength(2);
    expect(output.analysis.executiveSummary).toBe(bad.executiveSummary);
  });
  it("reports the total deadline explicitly instead of a misleading stream error",async()=>{
    vi.useFakeTimers();
    try {
      let ready!:()=>void;
      const started=new Promise<void>(resolve=>{ready=resolve;});
      fixture.responses=[async (_context,options)=>{
        ready();
        await new Promise<void>(resolve=>options?.signal?.addEventListener("abort",()=>resolve(),{once:true}));
        return fauxAssistantMessage([],{stopReason:"aborted"});
      }];
      const assertion=expect(runCountryBrief({runId:"deadline-test",countryId:"canada",mode:"live"},()=>undefined)).rejects.toThrow(/超过 240 秒/);
      await started;
      await vi.advanceTimersByTimeAsync(240_000);
      await assertion;
    } finally {vi.useRealTimers();}
  });
  it("retains valid field replacements across consecutive repairs",async()=>{
    const bad=structuredClone(c.draft);bad.title="错误标题";bad.risks[0]!.evidenceIds=["invented"];
    fixture.responses=[call("submit_country_brief",bad),repair({risks:c.draft.risks}),repair({title:c.draft.title})];
    const output=await runCountryBrief({runId:"accumulate-repairs",countryId:"canada",mode:"live"},()=>undefined);
    expect(output.analysis.risks).toEqual(c.draft.risks);
    expect(output.analysis.title).toBe(c.draft.title);
    expect(output.analysis.executiveSummary).toBe(bad.executiveSummary);
  });
  it("rejects repair before a complete submission and refuses to patch token-truncated output",async()=>{
    const truncated=fauxAssistantMessage([fauxToolCall("submit_country_brief",c.draft)],{stopReason:"length"});
    fixture.responses=[repair({title:c.draft.title}),truncated,repair({title:c.draft.title})];
    await expect(runCountryBrief({runId:"truncated-repair",countryId:"canada",mode:"live"},()=>undefined)).rejects.toThrow(/国家简报未完成/);
  });
  it("returns the exact available citation index when schema validation rejects an invented risk reference",async()=>{
    const bad=structuredClone(c.draft);
    bad.risks[1]!.evidenceIds=["C1-risk"];
    expect(c.companies[0]!.evidence.some(e=>e.id==="C1-risk")).toBe(false);
    fixture.responses=[call("submit_country_brief",bad),context=>{
      const repair=JSON.stringify(context.messages.at(-1));
      expect(repair).toContain("本次提交未被接受");
      expect(repair).toContain("risks.1.evidenceIds.0");
      expect(repair).toContain("本次唯一可用引用索引");
      for(const company of c.companies) for(const evidence of company.evidence) expect(repair).toContain(evidence.id);
      expect(repair).toContain("禁止根据另一家企业的编号猜测");
      expect(repair).toContain("repair_country_brief");
      return call("repair_country_brief",{changes:[{field:"risks",value:c.draft.risks}]});
    }];
    const events=[];
    const output=await runCountryBrief({runId:"repair-schema-country",countryId:"canada",mode:"live"},event=>{events.push(event);});
    expect(output.generation.source).toBe("llm");
    expect(output.analysis.risks[1]!.evidenceIds).not.toContain("C1-risk");
    expect(output.analysis.executiveSummary).toBe(bad.executiveSummary);
    expect(output.analysis.companyAssessments).toEqual(bad.companyAssessments);
    expect(events.some(e=>e.type==="tool_end"&&e.data?.validationError)).toBe(true);
    expect(output.diagnostics.validationFailures[0]?.message).toContain("risks.1.evidenceIds.0");
    expect(output.diagnostics.modelTurns).toHaveLength(2);
  });
});
