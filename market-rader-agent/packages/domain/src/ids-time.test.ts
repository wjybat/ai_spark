import { describe, expect, it } from "vitest";

import { newId } from "./ids.js";
import { epochMsToIsoUtc, isIsoUtcString, isUtcDateString, isoUtcToEpochMs } from "./time.js";

describe("newId", () => {
  it.each([
    ["scn"],
    ["scan"],
    ["clm_2"], // invalid: underscore not allowed after first char per pattern? allowed: [a-z0-9_]
  ] as const)("generates unique prefixed ids for %s", (prefix) => {
    if (prefix === "clm_2") {
      // pattern allows underscores and digits after the first letter
      const id = newId(prefix);
      expect(id.startsWith("clm_2_")).toBe(true);
      expect(newId(prefix)).not.toBe(id);
      return;
    }
    const id = newId(prefix);
    expect(id.startsWith(`${prefix}_`)).toBe(true);
    expect(id.length).toBeGreaterThan(prefix.length + 1);
  });

  it("rejects invalid prefixes", () => {
    expect(() => newId("SCN")).toThrow(RangeError);
    expect(() => newId("1abc")).toThrow(RangeError);
    expect(() => newId("")).toThrow(RangeError);
  });
});

describe("time", () => {
  it("round-trips epoch milliseconds and ISO UTC strings", () => {
    const ms = 1_789_000_000_000;
    const iso = epochMsToIsoUtc(ms);
    expect(isoUtcToEpochMs(iso)).toBe(ms);
  });

  it.each([
    ["2026-08-15T00:00:00Z", true],
    ["2026-08-15T00:00:00.123Z", true],
    ["2026-08-15T00:00:00+00:00", false],
    ["2026-08-15", false],
    ["not-a-date", false],
  ])("validates ISO UTC string %s as %s", (value, expected) => {
    expect(isIsoUtcString(value)).toBe(expected);
  });

  it.each([
    ["2026-08-15", true],
    ["2026-02-30", false],
    ["2026-8-15", false],
    ["20260815", false],
  ])("validates UTC date string %s as %s", (value, expected) => {
    expect(isUtcDateString(value)).toBe(expected);
  });

  it("rejects invalid epoch values", () => {
    expect(() => epochMsToIsoUtc(Number.NaN)).toThrow(RangeError);
    expect(() => epochMsToIsoUtc(-1)).toThrow(RangeError);
    expect(() => epochMsToIsoUtc(1.5)).toThrow(RangeError);
    expect(() => isoUtcToEpochMs("2026-08-15")).toThrow(RangeError);
  });
});
