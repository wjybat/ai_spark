import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { transformSync } from "esbuild";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const frontend = new URL("../../global-opportunity-radar/", import.meta.url);
const dom = new JSDOM('<div id="root"></div>', { runScripts: "outside-only" });
const window = dom.window;
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
const onSelectCountry = vi.fn();

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-05T12:00:00"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", window.document);
  Object.assign(window, { React, ReactDOM: { createRoot: () => ({ render: () => undefined }) } });
  for (const file of ["data.js", "continent-data.js"]) window.eval(readFileSync(new URL(file, frontend), "utf8"));
  window.eval(transformSync(readFileSync(new URL("app.jsx", frontend), "utf8"), { loader: "jsx", target: "es2020" }).code);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); onSelectCountry.mockClear(); });
afterAll(() => { window.close(); vi.unstubAllGlobals(); vi.useRealTimers(); });

async function mount(id: string) {
  if (!container?.isConnected) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  const data = window.OPPORTUNITY_DATA;
  await act(async () => root.render(React.createElement(window.RegionPanel, { key: id, region: data.regions[id], countries: data.countries, pinned: true, onSelectCountry })));
}
async function tab(id: string) {
  const target = container.querySelector<HTMLButtonElement>(`[role="tab"][id$="-${id}"]`)!;
  await act(async () => target.click());
}

describe("continent market briefs", () => {
  it("answers all four framework questions for the original five continents and only lists events inside the snapshot window", async () => {
    const data = window.OPPORTUNITY_DATA;
    const continentCounts = {
      south_america: ["280 万", "320 万"],
      north_america: ["180 万", "280 万"],
      oceania: ["18 万", "22 万"],
      europe: ["350 万", "450 万"],
      asia: ["1,800 万", "2,200 万"]
    };
    expect(Object.keys(data.regions).sort()).toEqual(["asia", "europe", "north_america", "oceania", "south_america"]);
    expect(data.continentFeatures.map(feature => feature.properties.id).sort()).toEqual(Object.keys(data.regions).sort());
    for (const id of Object.keys(data.regions)) {
      await mount(id);
      expect(container.querySelector("h1")?.textContent).toContain(data.regions[id].name);
      expect(data.regions[id].market.countMetrics.map(metric => metric.key)).toEqual(["companies", "outlets"]);
      expect(data.regions[id].market.countMetrics.map(metric => metric.value)).toEqual(continentCounts[id]);
      for (const metric of data.regions[id].market.countMetrics) {
        expect(metric.scope).toBe("continent");
        expect(metric.label).toContain(data.regions[id].name);
        expect(metric.meta).toContain("大洲口径");
        expect(container.textContent).toContain(metric.label);
        expect(container.textContent).toContain(metric.value);
      }
      expect(container.textContent).not.toContain("估算");
      const countryCount = { south_america: 12, north_america: 23, europe: 44, asia: 48, oceania: 14 }[id];
      expect(data.regions[id].badge).toBe(`${countryCount} 国`);
      expect(data.regions[id].market.geography.names).toHaveLength(countryCount);
      expect(new Set(data.regions[id].market.geography.names).size).toBe(countryCount);
      expect(container.querySelector(".continent-thesis")).toBeNull();
      expect(container.querySelectorAll(".country-row")).toHaveLength(0);
      if (id === "south_america") {
        expect(container.textContent).not.toContain("约 280 万");
        expect(container.textContent).not.toContain("8,500");
        expect(container.textContent).toContain("1.1451 万亿");
        expect(container.textContent).toContain("280 万");
        expect(container.textContent).toContain("320 万");
        expect(container.textContent).not.toContain("巴西零售企业");
        expect(container.textContent).not.toContain("巴西特许经营品牌");
        expect(container.textContent).not.toContain("待核实");
        expect(container.textContent).not.toContain("不是全南美");
        expect(container.textContent).toContain("巴西雷亚尔（BRL）");
        expect(container.textContent).toContain("2025 年全年；发布版本：ABRAS 2026");
        expect(data.regions[id].market.geography.names).toHaveLength(12);
        expect(data.regions[id].badge).toBe("12 国");
      }
      expect(container.textContent).toContain("市场整体情况");
      expect(container.querySelectorAll('[role="meter"]')).toHaveLength(4);
      await tab("countries");
      expect(container.querySelector('[aria-selected="true"]')?.textContent).toContain("国家");
      expect(container.querySelectorAll(".country-row")).toHaveLength(data.regions[id].countryIds.length);
      expect(container.textContent).toContain(`全洲 ${countryCount} 国 · 已收录 ${data.regions[id].countryIds.length} 国`);
      await tab("events");
      const events = [...container.querySelectorAll(".continent-event")];
      expect(events).toHaveLength(5);
      expect(container.textContent).toContain("2025-09-01 — 2026-12-31");
      expect(container.textContent).not.toContain("近 12 个月");
      for (const event of events) {
        const dates = [...event.querySelectorAll("time")].map(item => item.dateTime);
        expect(dates[0] <= dates[1]).toBe(true);
        expect(dates[0] >= "2025-09-01" && dates[1] <= "2026-12-31").toBe(true);
        expect(event.querySelector(".continent-event-status")?.textContent).toMatch(/已结束|正在举办|即将举办/);
        expect(event.querySelector("a")?.href).toMatch(/^https:\/\//);
      }
      await tab("signals");
      expect(container.querySelectorAll(".continent-signals article")).toHaveLength(3);
      expect(container.querySelectorAll(".continent-risks article")).toHaveLength(id === "south_america" ? 2 : 3);
      expect(container.textContent).not.toContain("下一步建议");
      expect(container.querySelector(".continent-next-step")).toBeNull();
      if (id === "south_america") expect(container.textContent).not.toContain("汇率与回款");
      expect(container.textContent).toContain("风险分越高表示进入风险越大");
      const methodology = container.querySelector(".continent-method")!;
      expect(methodology.querySelectorAll("p")).toHaveLength(0);
      expect(methodology.textContent).not.toContain("截至");
      expect(methodology.textContent).not.toContain(data.continentMeta.countMethod);
      expect(methodology.textContent).not.toContain(data.continentMeta.scoreMethod);
      expect(methodology.textContent).not.toContain(data.continentMeta.scopeNote);
      expect(methodology.querySelectorAll("a").length).toBeGreaterThan(0);
      expect([...methodology.querySelector("div")!.children].every(item => item.tagName === "A")).toBe(true);
    }
  });

  it("includes historical and late-2026 Brazil events, with inclusive ongoing date boundaries", async () => {
    const data = window.OPPORTUNITY_DATA;
    await mount("south_america");
    await tab("events");
    expect(container.querySelectorAll(".continent-event")).toHaveLength(5);
    expect(container.querySelector(".continent-event h2")?.textContent).toBe("Superminas 2026");
    expect(container.querySelector(".continent-event-status")?.textContent).toBe("即将举办");
    expect(container.textContent).not.toContain("当前展示");
    expect(container.textContent).not.toContain("按开始日期从未来到过去排列");
    expect(container.textContent).not.toContain("本轮优先核验巴西");
    const expand = container.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')!;
    await act(async () => expand.click());
    expect(container.querySelectorAll(".continent-event")).toHaveLength(11);
    const starts = [...container.querySelectorAll(".continent-event")].map(item => item.querySelector("time")!.dateTime);
    expect(starts).toEqual([...starts].sort().reverse());
    for (const name of ["Beauty Fair 2025", "SuperAgos 2025", "ACAPS Trade Show 2025", "Expo Supermercados 2026", "SRE Super Rio Expofood 2026"]) {
      expect(container.textContent).toContain(name);
    }
    expect(container.textContent).toContain("Latam Retail Show 2025");
    expect(container.textContent).toContain("Latam Retail Show 2026");
    expect(container.textContent).toContain("Superminas 2026");
    expect([...container.querySelectorAll(".continent-event-city")].every(item => item.textContent?.startsWith("巴西"))).toBe(true);
    const show = data.regions.south_america.market.events.find(item => item.name === "Latam Retail Show 2026");
    expect(data.getContinentEventStatus(show, "2026-09-14")).toBe("upcoming");
    expect(data.getContinentEventStatus(show, "2026-09-15")).toBe("ongoing");
    expect(data.getContinentEventStatus(show, "2026-09-16")).toBe("ongoing");
    expect(data.getContinentEventStatus(show, "2026-09-17")).toBe("ongoing");
    expect(data.getContinentEventStatus(show, "2026-09-18")).toBe("ended");
    await act(async () => expand.click());
    expect(container.querySelectorAll(".continent-event")).toHaveLength(5);
    expect(expand.getAttribute("aria-expanded")).toBe("false");
  });

  it("retains every existing country route without turning representative brands or scenario counts into customer records", async () => {
    const data = window.OPPORTUNITY_DATA;
    expect(Object.values(data.countries)).toHaveLength(11);
    expect(Object.values(data.companyProfiles)).toHaveLength(3);
    for (const id of Object.keys(data.regions)) {
      await mount(id);
      await tab("countries");
      expect(container.querySelectorAll(".country-row-main small")).toHaveLength(0);
      for (const [index, button] of [...container.querySelectorAll<HTMLButtonElement>(".country-row")].entries()) {
        expect(button.textContent).not.toContain(data.countries[data.regions[id].countryIds[index]].tagline);
        await act(async () => button.click());
        expect(onSelectCountry).toHaveBeenLastCalledWith(data.regions[id].countryIds[index]);
      }
    }
  });

  it("resets scroll and chapter when switching continents and supports keyboard chapter navigation", async () => {
    await mount("asia");
    const first = container.querySelector<HTMLButtonElement>('[role="tab"]')!;
    await act(async () => first.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(container.querySelector('[aria-selected="true"]')?.textContent).toContain("展会日历");
    expect(document.activeElement?.id).toBe("continent-asia-events");
    container.querySelector(".continent-body")!.scrollTop = 400;
    await tab("signals");
    expect(container.querySelector(".continent-body")!.scrollTop).toBe(0);
    await mount("north_america");
    expect(container.querySelector('[aria-selected="true"]')?.textContent).toBe("市场全景");
    expect(container.textContent).not.toContain("亚洲 / 中东零售市场简报");
  });
});
