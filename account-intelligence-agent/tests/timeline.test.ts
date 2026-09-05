import { describe, expect, it } from "vitest";
import { buildRecentTimeline, resolveEventOccurredAt } from "../src/lib/timeline";

const fallback = "2026-09-03T09:00:00+08:00";

describe("真实客户时间线", () => {
  it("使用材料中的实际完成日期，而不是材料上传日期", () => {
    expect(resolveEventOccurredAt("业务蓝图签字：2026-06-10 至 2026-06-26，已完成", fallback)).toBe("2026-06-26T00:00:00+08:00");
    expect(resolveEventOccurredAt("Solution 原计划 7 月 3 日完成，实际到 7 月 17 日确认", fallback)).toBe("2026-07-17T00:00:00+08:00");
  });

  it("不把尚未发生的计划日期当作真实事件日期", () => {
    expect(resolveEventOccurredAt("计划 2026-12-19 试点上线", fallback)).toBe(fallback);
  });

  it("同一份材料的同一事实在最近时间线中只展示一次", () => {
    const events = buildRecentTimeline([
      { source_item_id: "src-1", occurred_at: fallback, summary: "合同已签并开始部署", importance: 10, confidence: 0.9, payload: { evidence_text: "合同已签并开始部署" } },
      { source_item_id: "src-1", occurred_at: fallback, summary: "合同已签并开始部署", importance: 9, confidence: 0.8, payload: { evidence_text: "合同已签并开始部署" } },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].importance).toBe(10);
  });
});
