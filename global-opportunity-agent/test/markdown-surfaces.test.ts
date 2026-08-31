import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformSync } from "esbuild";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildCustomerProfile, detectOpportunitySignals, assessAdmission,
  buildEvidenceChain, matchProducts, assessRisks, generateResearchBrief,
} from "../src/analysis/index.js";

const frontend = new URL("../../global-opportunity-radar/", import.meta.url);
const dom = new JSDOM('<div id="root"></div>', { runScripts: "outside-only" });
const window = dom.window;
window.React = React;
window.ReactDOM = { createRoot: () => ({ render: () => undefined }) };
// eval's strict scope differs from a browser <script>; publish the bundle as that script would.
window.eval(readFileSync(new URL("assets/markdown-renderer.js", frontend), "utf8") + "\nwindow.AtlasMarkdown = AtlasMarkdown;");
window.eval(readFileSync(new URL("data.js", frontend), "utf8"));
for (const file of ["markdown.jsx", "report-tabs.jsx", "app.jsx"]) {
  window.eval(transformSync(readFileSync(new URL(file, frontend), "utf8"), { loader: "jsx", target: "es2020" }).code);
}
afterAll(() => window.close());

const source = "## 销售结论\n\n- **高潜**\n- `OMS` 集成\n\n[原始证据](https://example.com/report)\n\n| 项目 | 状态 |\n| --- | --- |\n| 预算 | 待确认 |";
const customerId = "cencosud";
const profile = buildCustomerProfile(customerId);
const signals = detectOpportunitySignals(customerId);
const admission = assessAdmission(customerId, signals);
const productMatch = matchProducts(customerId, signals);
const risks = assessRisks(customerId);
const brief = generateResearchBrief(customerId, admission, signals, productMatch, risks);
const report = {
  mode: "live", customerProfile: profile, opportunitySignals: signals, admission,
  evidenceChain: buildEvidenceChain(customerId), productMatch, riskAssessment: risks,
  researchBrief: { ...brief, executiveSummary: source, firstMeetingQuestions: ["**确认**采购周期"] },
  finalNarrative: source,
};

function render(component, props) {
  return JSDOM.fragment(renderToStaticMarkup(React.createElement(component, props)));
}
function assertMarkdown(root) {
  expect(root.querySelector("h2")?.textContent).toBe("销售结论");
  expect(root.querySelector("ul strong")?.textContent).toBe("高潜");
  expect(root.querySelector("a")?.getAttribute("href")).toBe("https://example.com/report");
  expect(root.querySelectorAll("table th")).toHaveLength(2);
}

describe("Agent output surfaces", () => {
  it("renders final narrative and Brief using the same local Markdown bundle", () => {
    const root = render(window.LiveAgentResult, { report });
    assertMarkdown(root.querySelector(".live-result-narrative"));
    assertMarkdown(root.querySelector(".live-brief-summary"));
  });

  it("renders the completed run modal as Markdown instead of raw text", () => {
    const root = render(window.AgentRunOverlay, {
      steps: window.OPPORTUNITY_DATA.agentSteps, active: 9, mode: "package", statusMessage: source,
    });
    assertMarkdown(root.querySelector(".run-conclusion"));
  });

  it("renders package body and list items, preserving the copy/download source", () => {
    const country = window.OPPORTUNITY_DATA.countries.brazil;
    const region = window.OPPORTUNITY_DATA.regions.south_america;
    const root = render(window.BattlePackageDrawer, { country, region, liveReport: report });
    assertMarkdown(root.querySelector(".package-section > .markdown-content"));
    const artifacts = window.buildLiveBattlePackage(report);
    expect(artifacts.find(item => item.id === "actions").text).toContain(source);
    expect(artifacts.find(item => item.id === "research").text).toContain(source);
    expect(report.finalNarrative).toBe(source);
  });
});
