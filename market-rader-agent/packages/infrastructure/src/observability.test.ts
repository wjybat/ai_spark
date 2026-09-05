import { describe, expect, it } from "vitest";

import { MetricsRegistry } from "./observability/metrics.js";
import { getTraceContext, withTrace } from "./observability/trace.js";

describe("MetricsRegistry", () => {
  it("aggregates labeled counters", () => {
    const registry = new MetricsRegistry();
    registry.increment("jobs_total", { status: "succeeded" });
    registry.increment("jobs_total", { status: "succeeded" });
    registry.increment("jobs_total", { status: "failed" });
    expect(registry.value("jobs_total", { status: "succeeded" })).toBe(2);
    expect(registry.value("jobs_total", { status: "failed" })).toBe(1);
    expect(registry.value("jobs_total")).toBe(0);
  });

  it("renders canonical Prometheus text with sorted names and labels", () => {
    const registry = new MetricsRegistry();
    registry.increment("b_total", { zeta: "1", alpha: "2" });
    registry.increment("a_total");
    const text = registry.render();
    const lines = text.trim().split("\n");
    expect(lines[0]).toBe("# TYPE a_total counter");
    expect(lines[1]).toBe("a_total 1");
    expect(lines[2]).toBe("# TYPE b_total counter");
    expect(lines[3]).toBe('b_total{alpha="2",zeta="1"} 1');
  });

  it("escapes label values and rejects invalid metric names", () => {
    const registry = new MetricsRegistry();
    registry.increment("esc_total", { path: 'a"b\\c' });
    expect(registry.render()).toContain('path="a\\"b\\\\c"');
    expect(() => registry.increment("Invalid Name")).toThrow(RangeError);
  });
});

describe("trace context", () => {
  it("propagates through async chains and nests", async () => {
    expect(getTraceContext()).toBeUndefined();
    await withTrace({ traceId: "trc_1", requestId: "req_1" }, async () => {
      expect(getTraceContext()?.traceId).toBe("trc_1");
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(getTraceContext()?.traceId).toBe("trc_1");
      await withTrace({ traceId: "trc_2", requestId: "req_2" }, async () => {
        expect(getTraceContext()?.traceId).toBe("trc_2");
      });
      expect(getTraceContext()?.traceId).toBe("trc_1");
    });
    expect(getTraceContext()).toBeUndefined();
  });
});
