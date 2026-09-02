import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { transformSync } from "esbuild";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runOpportunityPipeline } from "../src/agent/orchestrator.js";

const frontend = new URL("../../global-opportunity-radar/", import.meta.url);
const dom = new JSDOM('<div id="root"></div>', { runScripts: "outside-only", url: "http://localhost/" });
const window = dom.window;
const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url === "/api/health" ? { ok: false } : { runId: "existing-customer-run", eventsUrl: "/api/agent/runs/existing-customer-run/events" } }));
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
let report;

class TestEventSource {
  static CLOSED = 2;
  static instances: TestEventSource[] = [];
  readyState = 1;
  listeners = new Map<string, (event: { data: string }) => void>();
  constructor(public url: string) { TestEventSource.instances.push(this); }
  addEventListener(type: string, listener: (event: { data: string }) => void) { this.listeners.set(type, listener); }
  close() { this.readyState = TestEventSource.CLOSED; }
  complete(data: unknown) { this.listeners.get("run_complete")?.({ data: JSON.stringify({ type: "run_complete", data }) }); }
}

beforeAll(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", window.document);
  Object.assign(window, {
    React, ReactDOM: { createRoot: () => ({ render: () => undefined }) },
    fetch: fetchMock, EventSource: TestEventSource,
    TWEAK_DEFAULTS: { palette: ["#F47C61", "#DDF2EC", "#F7F3E8", "#24443D", "#6E8F87"], density: "stage", motion: false },
    useTweaks: (defaults) => [defaults, () => undefined],
    Globe: ({ onSelectCountry }) => React.createElement("button", { onClick: () => onSelectCountry("canada") }, "测试选择加拿大"),
  });
  for (const name of ["TweaksPanel", "TweakSection", "TweakColor", "TweakRadio", "TweakToggle"]) window[name] = () => null;
  window.eval(readFileSync(new URL("assets/markdown-renderer.js", frontend), "utf8") + "\nwindow.AtlasMarkdown = AtlasMarkdown;");
  for (const file of ["data.js", "agent-client.js"]) window.eval(readFileSync(new URL(file, frontend), "utf8"));
  for (const file of ["markdown.jsx", "report-tabs.jsx", "market-scan.jsx", "app.jsx"]) {
    window.eval(transformSync(readFileSync(new URL(file, frontend), "utf8"), { loader: "jsx", target: "es2020" }).code);
  }
  report = await runOpportunityPipeline({ runId: "existing-customer-run", regionId: "canada", customerId: "loblaw", mode: "demo" }, () => undefined);
}, 20_000);

beforeEach(async () => {
  fetchMock.mockClear();
  TestEventSource.instances = [];
  vi.useFakeTimers();
  container = window.document.createElement("div");
  window.document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(window.App)));
  // The existing page-load health check is unrelated to either button.
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe("/api/health");
  fetchMock.mockClear();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); });
afterAll(() => { window.close(); vi.unstubAllGlobals(); });

function button(label: string) {
  return [...container.querySelectorAll("button")].find(item => item.textContent === label || item.getAttribute("aria-label") === label)!;
}
async function click(label: string) { expect(button(label)).toBeTruthy(); await act(async () => button(label).click()); }
async function tick() { await act(async () => vi.advanceTimersByTimeAsync(1100)); }
async function finishScan() { for (let i = 0; i < 4; i += 1) await tick(); }

describe("local market scan demo", { timeout: 20_000 }, () => {
  it("advances four nodes without any API calls, then opens the overall market and customer pool", async () => {
    expect(container.textContent).not.toContain("实时商机信号");
    expect(container.textContent).not.toContain("水滴引擎");
    expect(container.querySelectorAll(".agent-step")).toHaveLength(9);
    await click("测试选择加拿大");
    await click("重新扫描市场");
    expect(button("扫描中").disabled).toBe(true);
    expect(container.querySelectorAll(".market-scan-nodes li")).toHaveLength(4);
    for (const [index, title] of ["资料对齐", "市场汇总", "客户归并", "雷达更新"].entries()) {
      expect(container.querySelector('[aria-current="step"] strong')?.textContent).toBe(title);
      expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe(String(index * 25));
      await tick();
    }
    expect(container.querySelectorAll(".market-scan-nodes .is-done")).toHaveLength(4);
    expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("100");
    expect(container.querySelector(".market-scan-result")?.textContent).toBe("5 个区域12 个国家3 家客户");
    await click("查看整体市场");
    expect(container.querySelectorAll("[data-market-customer]")).toHaveLength(3);
    expect(container.querySelectorAll(".market-overview-regions button")).toHaveLength(5);
    expect(container.querySelector(".country-panel-shell")).toBeNull();
    expect(container.querySelector(".market-overview")?.textContent).toContain("未执行后端扫描");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(TestEventSource.instances).toHaveLength(0);
    expect(button("重新扫描市场").disabled).toBe(false);
  });

  it("cancels timers, supports Esc, and restarts from the first node", async () => {
    await click("测试选择加拿大");
    await click("重新扫描市场");
    await tick();
    await click("取消市场扫描");
    await finishScan();
    expect(container.querySelector(".market-scan-card")).toBeNull();
    expect(container.querySelector(".market-overview")).toBeNull();
    expect(container.querySelector(".country-head-main h1")?.textContent).toBe("加拿大");
    await click("重新扫描市场");
    expect(container.querySelector('[aria-current="step"] strong')?.textContent).toBe("资料对齐");
    await act(async () => window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await finishScan();
    expect(container.querySelector(".market-scan-card")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps keyboard focus inside the scan dialog", async () => {
    await click("重新扫描市场");
    expect(window.document.activeElement).toBe(button("取消市场扫描"));
    await act(async () => button("取消市场扫描").dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
    expect(window.document.activeElement).toBe(button("取消市场扫描"));
    await finishScan();
    await act(async () => button("关闭市场扫描").dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })));
    expect(window.document.activeElement).toBe(button("查看整体市场"));
  });

  it("preserves the real BD request, blocks scanning during it, and keeps that result after a local scan", async () => {
    await click("测试选择加拿大");
    await click("生成 BD 作战包");
    expect(container.textContent).toContain("正在运行完整商机分析链路");
    expect(container.textContent).not.toMatch(/P0\s*2[–-]10/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/agent/runs");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ regionId: "canada", customerId: "loblaw", countryId: "canada", countryName: "加拿大", mode: "auto" });
    expect(TestEventSource.instances).toHaveLength(1);
    expect(button("重新扫描市场").disabled).toBe(true);
    await click("重新扫描市场");
    expect(container.querySelector(".market-scan-card")).toBeNull();
    await act(async () => TestEventSource.instances[0].complete(report));
    await click("返回商机地图");
    await click("客户雷达");
    await act(async () => container.querySelector<HTMLButtonElement>('[data-customer-entry="loblaw"]')!.click());
    expect(container.querySelector('[data-view-level="customer"]')).not.toBeNull();
    expect(container.querySelector(".country-head-main h1")?.textContent).toBe("Loblaw Companies Limited");
    expect([...container.querySelectorAll(".detail-tabs button")].map(item => item.textContent)).toEqual(["销售建议", "作战卡"]);
    await act(async () => window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector('[data-view-level="country"]')).not.toBeNull();
    expect(container.querySelector(".country-head-main h1")?.textContent).toBe("加拿大");
    expect(container.querySelector(".detail-tabs .is-active")?.textContent).toBe("客户雷达");
    await click("管理层简报");
    const original = container.querySelector(".report-management")?.innerHTML;
    fetchMock.mockClear();
    await click("重新扫描市场");
    await finishScan();
    await click("查看整体市场");
    await act(async () => container.querySelector<HTMLButtonElement>('[data-market-customer="loblaw"]')!.click());
    expect(button("查看作战包")).toBeTruthy();
    await click("管理层简报");
    expect(container.querySelector("[data-report-run]")?.getAttribute("data-report-run")).toBe("existing-customer-run");
    expect(container.querySelector(".report-management")?.innerHTML).toBe(original);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(TestEventSource.instances).toHaveLength(1);
  });
});
