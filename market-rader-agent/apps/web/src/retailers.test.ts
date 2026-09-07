import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RetailerDirectoryResult, RetailerStoreObservation } from "@market-radar/infrastructure";
import { RetailerDirectoryView } from "../app/retailers/directory-view.js";

const observation: RetailerStoreObservation = {
  observation_id: "obs", value: "1200", data_as_of: "2025-12-31", claim_id: "clm_1", claim_version: 2,
  verification_method: "auto_low_precision", evidence_quality: 40,
  source_url: "https://example.test/report", publisher: "Annual report", quote: "<script>alert(1)</script> Chain operates 1200 stores.",
  snapshot_id: "snap_1", locator: '{"page":4}', synthetic: false,
};
const directory: RetailerDirectoryResult = {
  total: 1, countries: [{ country_id: "cty_vn", iso2: "VN", name: "Vietnam" }],
  items: [{ retailer_id: "ret_1", name: "Example Chain", country_id: "cty_vn", country_iso2: "VN", country_name: "Vietnam",
    website: "javascript:alert(1)", status: "active", observations: [observation], latest_store_count: observation, has_conflicting_latest_counts: false }],
};
function render(data = directory): string {
  return renderToStaticMarkup(createElement(RetailerDirectoryView, {
    directory: data, regions: [{ code: "sea", name: "东南亚" }], region: "sea", country: "", query: "", asOf: "2026-09-07",
  }));
}

describe("retailer directory UI", () => {
  it("replaces the placeholder with real data, accessible filters and expandable evidence", () => {
    const html = render();
    expect(html).toContain("Example Chain");
    expect(html).toContain("1,200");
    expect(html).toContain("2025-12-31");
    expect(html).toContain('name="q"');
    expect(html).toContain('name="country"');
    expect(html).toContain('name="region"');
    expect(html).toContain("全部区域");
    expect(html).toContain("<details");
    expect(html).toContain("低精度自动验证");
    expect(html).toContain("clm_1");
    expect(html).toContain("snap_1");
    expect(html).not.toContain("将在接入");
  });
  it("escapes quotes and never links unsafe website or source protocols", () => {
    const item = directory.items[0]!;
    const html = render({ ...directory, items: [{ ...item, observations: [{ ...observation, source_url: "javascript:alert(1)" }] }] });
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("来源链接不可用");
  });
  it("shows missing evidence and conflicting counts without inventing zero", () => {
    const item = directory.items[0]!;
    expect(render({ ...directory, items: [{ ...item, observations: [], latest_store_count: null }] })).toContain("暂无有效证据");
    expect(render({ ...directory, items: [{ ...item, latest_store_count: null, has_conflicting_latest_counts: true }] })).toContain("同日数据存在差异");
    expect(render({ items: [], total: 0, countries: [] })).toContain("未找到匹配的零售商");
  });
});
