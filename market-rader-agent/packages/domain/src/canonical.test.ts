import { describe, expect, it } from "vitest";

import { canonicalHash, canonicalJson, CanonicalizationError } from "./canonical.js";

describe("canonicalJson", () => {
  it("sorts object keys by Unicode code point in ascending order", () => {
    expect(canonicalJson({ b: 1, a: 2, A: 3, "ä": 4 })).toBe('{"A":3,"a":2,"b":1,"ä":4}');
  });

  it("sorts keys by code point, not UTF-16 code units", () => {
    // U+FFFD (0xFFFD) sorts before U+10000 (surrogate pair) in code point order.
    expect(canonicalJson({ "\u{10000}": 1, "\uFFFD": 2 })).toBe('{"\uFFFD":2,"\u{10000}":1}');
  });

  it("keeps array order (business order)", () => {
    expect(canonicalJson({ items: [3, 1, 2] })).toBe('{"items":[3,1,2]}');
  });

  it("removes undefined object keys but keeps undefined array positions as null", () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(canonicalJson([1, undefined, 2])).toBe("[1,null,2]");
  });

  it("serializes decimals without reformatting", () => {
    expect(canonicalJson({ value: 0.1 })).toBe('{"value":0.1}');
    expect(canonicalJson({ value: 78.35 })).toBe('{"value":78.35}');
    expect(canonicalJson({ value: -0 })).toBe('{"value":0}');
  });

  it("serializes dates as UTC ISO strings", () => {
    expect(canonicalJson({ at: new Date("2026-08-15T00:00:00.000Z") })).toBe(
      '{"at":"2026-08-15T00:00:00.000Z"}',
    );
  });

  it("handles nesting and empty containers", () => {
    expect(canonicalJson({ z: { c: true, a: null }, empty: {}, list: [] })).toBe(
      '{"empty":{},"list":[],"z":{"a":null,"c":true}}',
    );
  });

  it("escapes strings exactly like JSON", () => {
    expect(canonicalJson({ text: "a\"b\nc" })).toBe('{"text":"a\\"b\\nc"}');
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects non-finite numbers (%s)", (_label, value) => {
    expect(() => canonicalJson({ value })).toThrow(CanonicalizationError);
  });

  it("rejects symbols, bigints, and functions", () => {
    expect(() => canonicalJson({ value: Symbol("x") })).toThrow(CanonicalizationError);
    expect(() => canonicalJson({ value: 1n })).toThrow(CanonicalizationError);
    expect(() => canonicalJson({ value: () => 1 })).toThrow(CanonicalizationError);
  });

  it("rejects invalid dates", () => {
    expect(() => canonicalJson({ at: new Date("not a date") })).toThrow(CanonicalizationError);
  });
});

describe("canonicalHash", () => {
  it("is stable across repeated runs", () => {
    const value = { b: [1, 2, { y: "x" }], a: new Date("2026-01-01T00:00:00.000Z") };
    const first = canonicalHash(value);
    const second = canonicalHash(value);
    expect(first).toBe(second);
    expect(first).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("ignores key order and undefined keys", () => {
    const a = { x: 1, y: { b: 2, a: 3 }, skip: undefined };
    const b = { skip: undefined, y: { a: 3, b: 2 }, x: 1 };
    expect(canonicalHash(a)).toBe(canonicalHash(b));
  });

  it("distinguishes different array orders", () => {
    expect(canonicalHash([1, 2])).not.toBe(canonicalHash([2, 1]));
  });
});
