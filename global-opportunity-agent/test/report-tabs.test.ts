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
  for (const file of ["markdown.jsx", "report-tabs.jsx", "app.jsx"]) {
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

// Each case mounts and switches several Markdown-heavy views; allow for a busy dev machine.
describe("country-to-customer report hierarchy", { timeout: 20_000 }, () => {
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
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(3);
    expect(container.querySelector('[data-view-level="country"]')).not.toBeNull();
    expect(body().textContent).toContain(country().marketBrief);
    expect([...container.querySelectorAll(".detail-tabs button")].map(item => item.textContent)).toEqual(["市场与商机", "客户雷达", "管理层简报"]);
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
    expect(body().querySelector(".brief-page h2")?.textContent).toContain("巴西");
    expect(body().querySelector(".brief-page h2")?.textContent).not.toContain("Cencosud");
    await click("复制简报");
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("巴西真实资料摘要"));
  });

  it("backfills country views, then opens customer-specific sales and battle views", async () => {
    await mount();
    await mount(report);
    expect(container.textContent).not.toMatch(/待 Agent|Agent Core|pi-agent|LLM|xhigh|P0\s*2[–-]10/i);
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(4);
    expect(body().querySelector(".live-result-hero > div > h2")?.textContent).toBe("巴西");
    expect(body().querySelector(".live-result-narrative > p > strong")?.textContent).toBe("NARRATIVE_FIRST");
    const cases = [
      ["市场与商机", "overview", "MARKET_FIRST", "SIGNAL_FIRST"],
      ["客户雷达", "customers", "POOL_FIRST", null],
      ["管理层简报", "brief", "SUMMARY_FIRST", "NARRATIVE_FIRST"],
    ];
    for (const [label, tab, first, second] of cases) {
      body().scrollTop = 200;
      await click(label);
      expect(body().scrollTop).toBe(0);
      expect(body().querySelector("[data-report-tab]")?.getAttribute("data-report-tab")).toBe(tab);
      expect(body().querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe(report.runId);
      expect(body().textContent).toContain(first);
      if (second) expect(body().textContent).toContain(second);
      else expect(body().textContent).not.toContain("PROFILE_FIRST");
      expect(body().textContent).toContain("报告国家：巴西");
      expect(body().textContent).toContain("当前潜在客户样本：Cencosud");
      expect(body().textContent).not.toMatch(/尚未运行|等待 Agent|不使用静态模板/);
    }
    expect(body().querySelector(".report-management table")).not.toBeNull();
    expect(body().querySelector(".report-management h1")?.textContent).toBe("巴西 · 管理层简报");
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
    await click("智能分析结果");
    expect(body().querySelector(".live-agent-result")).not.toBeNull();
    expect(body().querySelector(".report-tabs")).toBeNull();
  });

  it("copies and downloads exactly the displayed brief source; reports clipboard failure honestly", async () => {
    await mount(report);
    await click("管理层简报");
    const expected = window.buildReportManagementBrief(report, country());
    expect(expected).toContain("# 巴西 · 管理层简报");
    expect(expected).not.toContain("# Cencosud · 管理层简报");
    expect(body().querySelector(".report-management")?.innerHTML).toBe(window.AtlasMarkdown.renderMarkdown(expected));
    await click("复制简报");
    expect(writeText).toHaveBeenLastCalledWith(expected);
    expect(expected).toContain("**NARRATIVE_FIRST**");
    expect(expected).toContain("**谨慎跟进**");
    expect(report.finalNarrative).toContain("## NARRATIVE_FIRST");
    expect(expected).toContain(report.runId);
    expect(expected).not.toContain("巴西真实资料摘要");
    const createUrl = vi.fn(() => "blob:report-test");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    let filename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { filename = this.download; });
    await click("下载 Markdown");
    expect(filename).toBe("Brazil-management-brief.md");
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    const source = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob); });
    expect(source).toBe(expected);
    writeText.mockRejectedValueOnce(new Error("denied"));
    await click("复制简报");
    expect(notify).toHaveBeenLastCalledWith("复制失败，请下载简报，或允许浏览器访问剪贴板");
  });

  it("keeps the last success during reruns, replaces all views after success, and does not leak into another country", async () => {
    await mount(report);
    await click("管理层简报");
    await mount(report, { generating: true });
    expect(body().textContent).toContain("正在更新 · 当前显示上次结果");
    expect(body().textContent).toContain("NARRATIVE_FIRST");
    // A failed rerun leaves the previous successful report in the existing App cache.
    await mount(report, { generating: false });
    expect(body().textContent).toContain("NARRATIVE_FIRST");
    const updated = JSON.parse(JSON.stringify(report).replaceAll("FIRST", "SECOND"));
    updated.runId = "tabs-second-run";
    await mount(updated);
    for (const label of ["市场与商机", "客户雷达", "管理层简报"]) {
      await click(label);
      expect(body().querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe("tabs-second-run");
      expect(body().textContent).toContain("SECOND");
      expect(body().textContent).not.toContain("FIRST");
    }
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
    await click("复制简报");
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining("NARRATIVE_SECOND"));
    await mount(undefined, { country: country("canada") });
    expect(container.querySelectorAll(".detail-tabs button")).toHaveLength(3);
    expect(body().textContent).toContain(country("canada").marketBrief);
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
      expect(body().textContent).toMatch(/未返回|待确认/);
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
      expect(body().querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe(output.runId);
      expect(body().textContent).toContain(output.customerProfile.name);
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
