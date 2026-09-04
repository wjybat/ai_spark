import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { transformSync } from "esbuild";
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { runOpportunityPipeline } from "../src/agent/orchestrator.js";
import type { PipelineOutput } from "../src/types/domain.js";

const frontend = new URL("../../global-opportunity-radar/", import.meta.url);
const dom = new JSDOM('<div id="root"></div>', { runScripts: "outside-only" });
const window = dom.window;
let report: PipelineOutput;
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
const notify = vi.fn();
const writeText = vi.fn().mockResolvedValue(undefined);

beforeAll(async () => {
  // Keep esbuild in Node's realm; expose only the DOM globals React's client renderer needs.
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  for (const name of ["window", "document", "navigator", "HTMLAnchorElement", "Blob", "FileReader", "URL"]) {
    vi.stubGlobal(name, name === "window" ? window : window[name]);
  }
  Object.assign(window, { React, ReactDOM: { createRoot: () => ({ render: () => undefined }) } });
  window.eval(readFileSync(new URL("assets/markdown-renderer.js", frontend), "utf8") + "\nwindow.AtlasMarkdown = AtlasMarkdown;");
  window.eval(readFileSync(new URL("data.js", frontend), "utf8"));
  window.eval(readFileSync(new URL("country-data.js", frontend), "utf8"));
window.eval(readFileSync(new URL("country-brief-data.js", frontend), "utf8"));
  for (const file of ["markdown.jsx", "report-tabs.jsx", "country-market.jsx", "country-brief.jsx", "app.jsx"]) {
    window.eval(transformSync(readFileSync(new URL(file, frontend), "utf8"), { loader: "jsx", target: "es2020" }).code);
  }
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  report = await runOpportunityPipeline({ runId: "tabs-first-run", regionId: "global", customerId: "cencosud", mode: "demo" }, () => undefined);
  report.marketRadar.summary = "**MARKET_FIRST**：本次市场分析";
  report.customerPool.customers.find(customer => customer.customerId === "cencosud")!.reason = "POOL_FIRST：本次客户排序";
  report.customerProfile.organization = "PROFILE_FIRST：集团画像";
  report.opportunitySignals[0].interpretation = "SIGNAL_FIRST：商机推断";
  report.researchBrief.outreachEmail.body = "## EMAIL_FIRST\n\n- **真实建议**\n- 确认 `OMS` 边界";
  report.productMatch.matches[0].reasons = ["MATCH_FIRST：匹配依据"];
  report.riskAssessment.risks[0].mitigation = "MITIGATION_FIRST：风险应对";
  report.finalNarrative = "## NARRATIVE_FIRST\n\n**谨慎跟进**\n\n| 项目 | 状态 |\n| --- | --- |\n| 预算 | 待确认 |";
  report.researchBrief.executiveSummary = "SUMMARY_FIRST：执行摘要";
});

afterAll(() => { vi.unstubAllGlobals(); window.close(); });

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  vi.restoreAllMocks();
  notify.mockClear();
  writeText.mockReset().mockResolvedValue(undefined);
});

function country(id = "brazil") { return window.OPPORTUNITY_DATA.countries[id]; }
async function mount(liveReport?: PipelineOutput, extra = {}) {
  if (!container?.isConnected) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  const selected = extra.country || country();
  await act(async () => root.render(React.createElement(window.CountryPanel, {
    country: selected, region: window.OPPORTUNITY_DATA.regions[selected.region],
    notify, liveReport, onBack: vi.fn(), onGenerate: vi.fn(), onViewPackage: vi.fn(),
    packageReady: Boolean(liveReport), generating: false, ...extra,
  })));
}
async function click(label: string) {
  const button = [...container.querySelectorAll("button")].find(item => item.textContent === label);
  expect(button, `button: ${label}`).toBeTruthy();
  await act(async () => button!.click());
}
function body() { return container.querySelector(".country-tab-scroll")!; }
async function enterCustomer() {
  const entry = container.querySelector<HTMLButtonElement>("[data-customer-entry]");
  expect(entry, "clickable customer card").toBeTruthy();
  await act(async () => entry!.click());
}
async function returnToCountry(countryName = "巴西") { await click(`${countryName} · 客户雷达`); }
function nationalReport(id = "brazil", version = "FIRST") {
  const c=country(id), research=c.research;
  const analysis=JSON.parse(JSON.stringify(research.managementDraft));
  analysis.executiveSummary=`NATIONAL_${version}：${analysis.executiveSummary}`;
  return {scope:"country",countryId:id,countryName:c.name,runId:`national-${version}`,completedAt:"2026-09-04T12:00:00Z",generation:{source:"llm"},analysis,companies:research.companies,evidence:research.companies.flatMap(c=>c.evidence)};
}

// Each case mounts and switches several Markdown-heavy views; allow for a busy dev machine.
describe("country-to-customer report hierarchy", { timeout: 20_000 }, () => {
  it("presents both national chapters for exactly the existing eleven countries without confusing customer and market counts", async () => {
    const countries = Object.values(window.OPPORTUNITY_DATA.countries);
    expect(countries.map(c => c.id).sort()).toEqual(["argentina","australia","brazil","canada","chile","colombia","ireland","new_zealand","peru","uae","usa"]);
    expect(Object.keys(window.OPPORTUNITY_DATA.regions)).toHaveLength(5);
    for (const item of countries) {
      await mount(undefined, { country: item });
      expect(container.querySelector(".detail-tabs .is-active")?.textContent).toBe("国家概况");
      expect(body().querySelector(`[data-country-overview="${item.id}"]`)).not.toBeNull();
      expect(body().textContent).toContain(item.research.summary);
      expect(body().textContent).toContain(item.research.sample.stores);
      expect(container.querySelector(".country-quick-metrics")?.textContent).toContain("线下门店 · 估算");
      expect(container.querySelector(".country-quick-metrics")?.textContent).not.toContain(item.storeCount);
      expect(body().querySelectorAll(".national-metrics article")).toHaveLength(3);
      expect(body().querySelectorAll('[role="meter"]')).toHaveLength(4);
      expect(body().querySelectorAll(".national-signals article")).toHaveLength(3);
      expect(body().textContent).toContain("未收录具体招聘或招标事件");
      for (const metric of item.research.metrics) {
        if (metric.basis === "公开资料") expect(metric.source.url).toMatch(/^https:\/\//);
        else expect(metric.basis).toBe("演示估算");
      }
      await click("市场与商机");
      expect(body().querySelector(`[data-country-radar="${item.id}"]`)).not.toBeNull();
      for (const heading of ["为什么值得看","机会在哪里","风险与应对","适合切入的零售场景"]) expect(body().textContent).toContain(heading);
      expect(body().textContent).toContain(item.research.nextStep);
      expect(body().querySelectorAll(".national-scenarios article")).toHaveLength(3);
      await click("查看本国客户雷达 →");
      expect(container.querySelector(".detail-tabs .is-active")?.textContent).toBe("客户雷达");
    }
  });

  it("retains national facts and country scores alongside a generated customer report", async () => {
    await mount(report);
    await click("国家概况");
    expect(body().textContent).toContain(country().research.summary);
    expect(body().textContent).not.toContain("MARKET_FIRST");
    await click("市场与商机");
    expect(body().querySelector('[data-country-radar="brazil"]')).not.toBeNull();
    expect(body().querySelector(".national-score")?.textContent).toContain("84");
    expect(body().querySelector(".national-live-supplement")).toBeNull();
    expect(body().textContent).not.toContain("MARKET_FIRST");
    await mount(undefined, { country: country("uae") });
    expect(body().textContent).toContain("单国门店数未单独披露");
    expect(body().textContent).not.toContain("MARKET_FIRST");
  });

  it("fills every country with one actionable customer and two display-only candidates", async () => {
    const collectedProfiles = Object.values(window.OPPORTUNITY_DATA.companyProfiles);
    expect(collectedProfiles).toHaveLength(3);
    for (const profile of collectedProfiles) {
      expect(profile.headquarters).toBeTruthy();
      expect(profile.businessAreas.length).toBeGreaterThan(3);
      expect(profile.digitalFoundation.length).toBeGreaterThan(3);
      expect(profile.knownSystems.length).toBeGreaterThan(3);
      expect(profile.recentDynamics.length).toBeGreaterThan(3);
      expect(profile.decisionRoles.length).toBeGreaterThan(3);
      expect(profile.unknowns.length).toBeGreaterThan(3);
      expect(profile.sources.every(source => source.excerpt && source.url.startsWith("https://"))).toBe(true);
    }
    for (const item of Object.values(window.OPPORTUNITY_DATA.countries)) {
      expect(item.customers).toHaveLength(3);
      expect(item.customers.filter(customer => customer.selectable !== false)).toHaveLength(1);
      expect(item.customers.filter(customer => customer.selectable === false)).toHaveLength(2);
      expect(new Set(item.customers.map(customer => customer.name)).size).toBe(3);
      for (const customer of item.customers.filter(customer => customer.selectable === false)) {
        expect(customer.sourceLevel).toBe("A级");
        expect(customer.sourceTitle.length).toBeGreaterThan(3);
        expect(customer.sourceUrl).toMatch(/^https:\/\//);
      }
    }
    await mount();
    expect(container.textContent).not.toMatch(/待 Agent|Agent Core|pi-agent|LLM|xhigh|P0\s*2[–-]10/i);
    await click("客户雷达");
    expect(container.querySelectorAll('button[data-customer-entry="cencosud"]')).toHaveLength(1);
    expect(container.querySelectorAll("article[data-candidate-customer]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-candidate-customer] button")).toHaveLength(0);
    expect([...container.querySelectorAll(".customer-card-action > span")].map(item => item.textContent)).toEqual(["进入客户作战视图", "进入客户作战视图", "进入客户作战视图"]);
    expect(body().textContent).toContain("业务观察");
    expect(body().textContent).toContain("潜在切入");
    expect(body().textContent).not.toMatch(/早期扫描候选|仅展示|待核验/);
    for (const card of container.querySelectorAll("article[data-candidate-customer]")) expect(card.textContent).toContain("来源A级");
  });

  it("keeps the customer pool at country level and opens the collected customer chapters after clicking a company", async () => {
    await mount();
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(4);
    expect(container.querySelector('[data-view-level="country"]')).not.toBeNull();
    expect(body().textContent).toContain(country().research.summary);
    expect([...container.querySelectorAll(".detail-tabs button")].map(item => item.textContent)).toEqual(["国家概况", "市场与商机", "客户雷达", "管理层简报"]);
    await click("客户雷达");
    expect(container.querySelectorAll("article[data-candidate-customer]")).toHaveLength(2);
    await enterCustomer();
    expect(container.querySelector('[data-view-level="customer"]')).not.toBeNull();
    expect(container.querySelector(".country-head-main h1")?.textContent).toBe("Cencosud");
    const intelligenceLink = container.querySelector<HTMLAnchorElement>("[data-customer-intelligence-link]");
    expect(intelligenceLink?.textContent).toContain("客户情报中心");
    expect(intelligenceLink?.href).toBe("http://localhost:3001/customers");
    expect(intelligenceLink?.target).toBe("_blank");
    expect([...container.querySelectorAll(".detail-tabs button")].map(item => item.textContent)).toEqual(["客户概览", "业务布局", "数字化与系统", "动态与组织", "资料来源", "销售建议", "作战卡"]);
    expect(body().querySelector('[data-customer-research-tab="profile"]')).not.toBeNull();
    expect(body().textContent).toContain(window.OPPORTUNITY_DATA.companyProfiles.cencosud.headquarters);
    await click("业务布局");
    expect(body().textContent).toContain(window.OPPORTUNITY_DATA.companyProfiles.cencosud.businessAreas[0]);
    await click("数字化与系统");
    expect(body().textContent).toContain(window.OPPORTUNITY_DATA.companyProfiles.cencosud.knownSystems[0]);
    await click("动态与组织");
    expect(body().textContent).toContain(window.OPPORTUNITY_DATA.companyProfiles.cencosud.decisionRoles[0]);
    await click("资料来源");
    expect(body().textContent).toContain(window.OPPORTUNITY_DATA.companyProfiles.cencosud.sources[0].title);
    await click("销售建议");
    expect(body().textContent).toContain(country().recommendations[0]);
    await click("作战卡");
    expect(body().textContent).toContain("Cencosud");
    await returnToCountry();
    expect(container.querySelector('[data-view-level="country"]')).not.toBeNull();
    expect(container.querySelector(".detail-tabs .is-active")?.textContent).toBe("客户雷达");
    await click("管理层简报");
    expect(body().querySelectorAll(".brief-placeholder")).toHaveLength(6);
    expect(body().querySelector(".brief-executive")).toBeNull();
    expect(body().querySelector("[data-brief-analysis]")).toBeNull();
    expect(body().textContent).not.toContain(country().research.managementDraft.executiveSummary);
    expect([...body().querySelectorAll("button")].some(button=>button.textContent==="复制国家简报")).toBe(false);
    expect(window.countryBriefText(country())).toBe("");
  });

  it("backfills country views, then opens customer-specific sales and battle views", async () => {
    await mount();
    await mount(report);
    expect(container.textContent).not.toMatch(/待 Agent|Agent Core|pi-agent|LLM|xhigh|P0\s*2[–-]10/i);
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(4);
    for (const label of ["市场与商机", "客户雷达", "管理层简报"]) {
      body().scrollTop = 200;
      await click(label);
      expect(body().scrollTop).toBe(0);
      expect(body().querySelector("[data-report-run]")).toBeNull();
      expect(body().textContent).not.toContain("NARRATIVE_FIRST");
    }
    expect(body().querySelectorAll(".brief-placeholder")).toHaveLength(6);
    await click("客户雷达");
    expect(container.querySelectorAll("article[data-candidate-customer]")).toHaveLength(2);
    await enterCustomer();
    expect(container.querySelector(".country-head-main h1")?.textContent).toBe(report.customerProfile.name);
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(7);
    expect(body().querySelector("[data-customer-research-tab]")?.getAttribute("data-customer-research-tab")).toBe("profile");
    expect(body().querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe(report.runId);
    await click("业务布局");
    expect(body().textContent).toContain(report.customerProfile.businessAreas[0]);
    await click("数字化与系统");
    expect(body().textContent).toContain("PROFILE_FIRST");
    expect(body().textContent).toContain(report.customerProfile.knownSystems[0]);
    await click("动态与组织");
    expect(body().textContent).toContain(report.customerProfile.recentDynamics[0]);
    await click("资料来源");
    expect(body().textContent).toContain(report.evidenceChain.records[0].title);
    await click("销售建议");
    expect(body().textContent).toContain("EMAIL_FIRST");
    expect(body().textContent).toContain(report.researchBrief.firstMeetingQuestions[0]);
    await click("作战卡");
    expect(body().textContent).toContain("MATCH_FIRST");
    expect(body().textContent).toContain("MITIGATION_FIRST");
    await returnToCountry();
    await click("管理层简报");
    expect(body().querySelector(".country-management")).not.toBeNull();
    expect(body().querySelector(".report-tabs")).toBeNull();
  });

  it("copies exactly the displayed brief source, removes downloads, and reports clipboard failure honestly", async () => {
    const national=nationalReport();
    await mount(report,{countryReport:national});
    await click("管理层简报");
    const expected = window.countryBriefText(country(),national);
    expect(expected).toContain("巴西管理层简报");
    expect(body().textContent).toContain(national.analysis.executiveSummary);
    await click("复制国家简报");
    expect(writeText).toHaveBeenLastCalledWith(expected);
    expect(expected).toContain("NATIONAL_FIRST");
    expect(expected).toContain("Grupo Mateus");
    expect(report.finalNarrative).toContain("## NARRATIVE_FIRST");
    expect(expected).toContain("Assaí Atacadista");
    expect(expected).not.toContain("巴西真实资料摘要");
    expect(container.textContent).not.toMatch(/下载 Markdown|下载文本版|下载全部/);
    writeText.mockRejectedValueOnce(new Error("denied"));
    await click("复制国家简报");
    expect(notify).toHaveBeenLastCalledWith("复制失败，请允许浏览器访问剪贴板");
  });

  it("reveals and focuses the generated brief even when its tab is already selected", async () => {
    const national = {...nationalReport(), startedAt:"2026-09-04T11:58:39Z", generation:{source:"llm",model:"qwen3.7-flash"}};
    await mount(undefined, {countryReport:national});
    await click("查看国家简报");
    for (const entry of ["查看国家简报", "管理层简报", "查看国家简报"]) {
      body().scrollTop = 1600;
      await click(entry);
      expect(body().scrollTop).toBe(0);
      expect(window.document.activeElement).toBe(body().querySelector(".brief-result-heading"));
    }
    const status = body().querySelector('.brief-generation-status.is-ready')!;
    expect(status.textContent).toContain("国家简报已更新");
    expect(status.textContent).not.toContain("qwen3.7-flash");
    expect(status.textContent).toContain("1 分 21 秒");
    expect(body().querySelector("[data-brief-analysis]")?.textContent).toContain("NATIONAL_FIRST");
    expect(body().querySelector(".brief-source-section")?.textContent).not.toContain("NATIONAL_FIRST");
    body().scrollTop = 900;
    await mount(undefined, {countryReport:national,briefRequest:1});
    expect(body().scrollTop).toBe(0);
    await click("市场与商机");
    await click("查看国家简报");
    expect(body().querySelector(".brief-result-heading")?.textContent).toBe("国家简报已更新");
  });

  it("shows only section placeholders until generation succeeds, with audience-facing status labels", async () => {
    await mount();
    await click("管理层简报");
    expect(body().querySelector(".brief-result-heading")?.textContent).toBe("国家简报待生成");
    expect(body().querySelectorAll(".brief-placeholder")).toHaveLength(6);
    expect(body().querySelector(".brief-source-section")).toBeNull();
    expect(body().textContent).not.toContain(country().research.managementDraft.executiveSummary);
    const run = {steps:["国家", "企业一", "企业二", "企业三", "综合"],step:3,done:false,statusMessage:"正在研究企业三"};
    await mount(undefined,{generating:true,briefRun:run});
    expect(body().querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("3");
    expect(body().querySelector(".brief-generation-status")?.textContent).toContain("正在研究企业三");
    expect(body().querySelectorAll(".brief-placeholder")).toHaveLength(6);
    expect(body().querySelector("[data-brief-analysis]")).toBeNull();
    await mount(undefined,{countryReport:nationalReport(),briefRun:{...run,done:true}});
    expect(body().querySelector(".brief-result-heading")?.textContent).toBe("国家简报已更新");
    expect(body().querySelector("[data-brief-analysis]")?.textContent).toContain("智能体生成简报");
    expect(body().querySelectorAll(".brief-placeholder")).toHaveLength(0);
    expect(body().querySelector(".brief-generation-status")?.textContent).not.toMatch(/AI|预览|上方|下方|自动更新|模型|正文/);
  });

  it("keeps the last success during reruns, replaces all views after success, and does not leak into another country", async () => {
    const national=nationalReport();
    await mount(report,{countryReport:national});
    await click("管理层简报");
    await mount(report, { countryReport:national,generating: true });
    expect(body().textContent).toContain("正在生成国家简报");
    expect(body().querySelector(".brief-generation-meta")?.textContent).toContain("上次更新");
    expect(body().textContent).toContain("NATIONAL_FIRST");
    // A failed rerun leaves the previous successful report in the existing App cache.
    await mount(report, { countryReport:national,generating: false });
    expect(body().textContent).toContain("NATIONAL_FIRST");
    const updated = JSON.parse(JSON.stringify(report).replaceAll("FIRST", "SECOND"));
    updated.runId = "tabs-second-run";
    await mount(updated,{countryReport:nationalReport("brazil","SECOND")});
    expect(container.querySelector(".detail-tabs .is-active")?.textContent).toBe("管理层简报");
    expect(body().querySelector("[data-brief-run]")?.getAttribute("data-brief-run")).toBe("national-SECOND");
    expect(body().textContent).toContain("NATIONAL_SECOND");
    expect(body().textContent).not.toContain("NATIONAL_FIRST");
    await click("客户雷达");
    await enterCustomer();
    for (const label of ["销售建议", "作战卡"]) {
      await click(label);
      expect(body().querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe("tabs-second-run");
      expect(body().textContent).toContain("SECOND");
      expect(body().textContent).not.toContain("FIRST");
    }
    await returnToCountry();
    await click("管理层简报");
    await click("复制国家简报");
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining("NATIONAL_SECOND"));
    await mount(undefined, { country: country("canada") });
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(4);
    expect(body().textContent).toContain(country("canada").research.summary);
    expect(body().textContent).not.toMatch(/FIRST|SECOND|Cencosud/);
  });

  it("shows explicit empty states and safely renders Markdown without falling back to static country data", async () => {
    const empty = JSON.parse(JSON.stringify(report));
    empty.marketRadar.dimensions = [];
    empty.opportunitySignals = [];
    empty.customerPool.customers = [];
    empty.productMatch.matches = [];
    empty.riskAssessment.risks = [];
    empty.riskAssessment.pendingConfirmations = [];
    empty.researchBrief.nextActions = [];
    empty.researchBrief.outreachEmail.body = '**SAFE**<script>alert(1)</script><img src=x onerror="alert(1)">';
    await mount(empty);
    for (const label of ["市场与商机", "客户雷达", "管理层简报"]) {
      await click(label);
      expect(body().textContent).not.toContain("SAFE");
      expect(body().textContent).not.toContain(country().marketBrief);
      expect(body().querySelector("script,img,[onerror]")).toBeNull();
    }
    await click("客户雷达");
    await enterCustomer();
    await click("销售建议");
    expect(body().querySelector(".report-email strong")?.textContent).toBe("SAFE");
  });

  it.each([
    ["canada", "canada", "loblaw"],
    ["australia", "oceania", "sigma-chemist"],
  ])("renders all views for %s using that company's backend output", async (countryId, regionId, customerId) => {
    const output = await runOpportunityPipeline({ runId: `tabs-${customerId}`, regionId, customerId, mode: "demo" }, () => undefined);
    await mount(output, { country: country(countryId) });
    for (const label of ["市场与商机", "客户雷达", "管理层简报"]) {
      await click(label);
      expect(body().querySelector("[data-report-run]")).toBeNull();
      if(label === "客户雷达") expect(body().textContent).toContain(output.customerProfile.name);
      if(label === "管理层简报") expect(body().querySelectorAll(".brief-placeholder")).toHaveLength(6);
      expect(body().textContent).not.toContain("Cencosud");
    }
    await click("客户雷达");
    await enterCustomer();
    expect(container.querySelector(".country-head-main h1")?.textContent).toBe(output.customerProfile.name);
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(7);
    for (const [label, expected] of [
      ["客户概览", output.customerProfile.headquarters],
      ["业务布局", output.customerProfile.businessAreas[0]],
      ["数字化与系统", output.customerProfile.knownSystems[0]],
      ["动态与组织", output.customerProfile.recentDynamics[0]],
      ["资料来源", output.evidenceChain.records[0].title],
    ]) {
      await click(label);
      expect(body().textContent).toContain(expected);
      expect(body().querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe(output.runId);
    }
    for (const label of ["销售建议", "作战卡"]) {
      await click(label);
      expect(body().querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe(output.runId);
      expect(body().textContent).toContain(output.customerProfile.name);
      expect(body().textContent).not.toContain("Cencosud");
    }
  });
});
