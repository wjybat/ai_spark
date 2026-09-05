import { createHash } from "node:crypto";

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizationError";
  }
}

function compareCodePoints(a: string, b: string): number {
  const aPoints = [...a];
  const bPoints = [...b];
  const length = Math.min(aPoints.length, bPoints.length);
  for (let index = 0; index < length; index += 1) {
    const delta =
      (aPoints[index]!.codePointAt(0) ?? 0) - (bPoints[index]!.codePointAt(0) ?? 0);
    if (delta !== 0) return delta;
  }
  return aPoints.length - bPoints.length;
}

function canonicalValue(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "undefined":
      return "null";
    case "boolean":
      return value ? "true" : "false";
    case "number": {
      if (!Number.isFinite(value)) {
        throw new CanonicalizationError(`Cannot canonicalize non-finite number: ${value}`);
      }
      return Object.is(value, -0) ? "0" : String(value);
    }
    case "string":
      return JSON.stringify(value);
    case "bigint":
    case "symbol":
    case "function":
      throw new CanonicalizationError(`Cannot canonicalize value of type ${typeof value}.`);
    case "object":
      break;
    default:
      throw new CanonicalizationError(`Cannot canonicalize value of type ${typeof value}.`);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new CanonicalizationError("Cannot canonicalize an invalid Date.");
    }
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    return `[${value.map((element) => canonicalValue(element)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => compareCodePoints(a, b));
  if (entries.some(([key]) => key === "")) {
    throw new CanonicalizationError("Cannot canonicalize objects with empty string keys.");
  }
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalValue(entryValue)}`).join(",")}}`;
}

/**
 * Canonical JSON: undefined keys removed, keys sorted by Unicode code point,
 * Dates as UTC ISO strings, finite numbers only, arrays keep business order.
 */
export function canonicalJson(value: unknown): string {
  return canonicalValue(value);
}

/**
 * Canonical hash: UTF-8 encoded SHA-256 of the canonical JSON, as `sha256:<lowercase hex>`.
 */
export function hashCanonicalJson(canonical: string): string {
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

export function canonicalHash(value: unknown): string {
  return hashCanonicalJson(canonicalJson(value));
}
