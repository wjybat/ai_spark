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
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", window.document);
  Object.assign(window, { React, ReactDOM: { createRoot: () => ({ render: () => undefined }) } });
  for (const file of ["data.js", "continent-data.js"]) window.eval(readFileSync(new URL(file, frontend), "utf8"));
  window.eval(transformSync(readFileSync(new URL("app.jsx", frontend), "utf8"), { loader: "jsx", target: "es2020" }).code);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); onSelectCountry.mockClear(); });
afterAll(() => { window.close(); vi.unstubAllGlobals(); });

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
    expect(Object.keys(data.regions).sort()).toEqual(["asia", "europe", "north_america", "oceania", "south_america"]);
    expect(data.continentFeatures.map(feature => feature.properties.id).sort()).toEqual(Object.keys(data.regions).sort());
    for (const id of Object.keys(data.regions)) {
      await mount(id);
      expect(container.querySelector("h1")?.textContent).toContain(data.regions[id].name);
      expect(container.textContent).toContain("零售公司 · 演示估算");
      expect(container.textContent).toContain("连锁品牌 · 演示估算");
      expect(container.textContent).toContain("市场整体情况");
      expect(container.querySelectorAll('[role="meter"]')).toHaveLength(4);
      await tab("events");
      const events = [...container.querySelectorAll(".continent-event")];
      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        const dates = [...event.querySelectorAll("time")].map(item => item.dateTime);
        expect(dates[0] <= dates[1]).toBe(true);
        expect(dates[0] >= "2025-09-04" && dates[1] <= "2026-09-04").toBe(true);
        expect(event.querySelector("a")?.href).toMatch(/^https:\/\//);
      }
      await tab("signals");
      expect(container.querySelectorAll(".continent-signals article")).toHaveLength(3);
      expect(container.querySelectorAll(".continent-risks article")).toHaveLength(3);
      expect(container.textContent).toContain("下一步建议");
      expect(container.textContent).toContain("风险分越高表示进入风险越大");
      expect(container.querySelector(".continent-method")?.textContent).toContain("演示假设值");
    }
  });

  it("retains every existing country route without turning representative brands or scenario counts into customer records", async () => {
    const data = window.OPPORTUNITY_DATA;
    expect(Object.values(data.countries)).toHaveLength(11);
    expect(Object.values(data.companyProfiles)).toHaveLength(3);
    for (const id of Object.keys(data.regions)) {
      await mount(id);
      for (const [index, button] of [...container.querySelectorAll<HTMLButtonElement>(".country-row")].entries()) {
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
