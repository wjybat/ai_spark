import { describe, expect, it } from "vitest";

import { assertBasisPoint, bpsFromRatio, bpsToRatio, clampBps, contributionBps, isBasisPoint } from "./bps.js";

describe("basis points", () => {
  it.each([
    [0, 0],
    [78.35, 7835],
    [100, 10000],
    [0.845, 85], // rounds to nearest basis point
    [99.999, 10000],
  ])("converts API ratio %s to %d bps", (ratio, expected) => {
    expect(bpsFromRatio(ratio)).toBe(expected);
  });

  it.each([
    [7835, 78.35],
    [0, 0],
    [10000, 100],
    [1234, 12.34],
    [1, 0.01],
  ])("converts %d bps back to API ratio %s", (value, expected) => {
    expect(bpsToRatio(value as never)).toBe(expected);
  });

  it.each([
    [-1],
    [10001],
    [0.5],
    [Number.NaN],
  ])("rejects invalid basis point %s", (value) => {
    expect(() => assertBasisPoint(value)).toThrow(RangeError);
    expect(isBasisPoint(value)).toBe(false);
  });

  it("clamps out-of-range values", () => {
    expect(clampBps(-500)).toBe(0);
    expect(clampBps(10500)).toBe(10000);
    expect(clampBps(7835.4)).toBe(7835);
    expect(() => clampBps(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("computes integer contributions with a single rounding step", () => {
    expect(contributionBps(7835 as never, 2000 as never)).toBe(1567);
    expect(contributionBps(9999 as never, 9999 as never)).toBe(9998);
    expect(contributionBps(0 as never, 5000 as never)).toBe(0);
  });

  it("round-trips ratios through bps", () => {
    const bps = bpsFromRatio(84.25);
    expect(bpsToRatio(bps)).toBe(84.25);
  });
});
