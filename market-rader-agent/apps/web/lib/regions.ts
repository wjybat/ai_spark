export const REGION_CODES = ["sea", "middle-east", "latam", "north-africa"] as const;
export type RegionCode = (typeof REGION_CODES)[number];

export const DEFAULT_REGION_CODE: RegionCode = "sea";
export const REGION_COOKIE = "market-radar-region";
export const REGION_STORAGE_KEY = "market-radar:overview-filters";
export const REGION_CHANGE_EVENT = "market-radar:region-change";

export function parseRegionCode(value: unknown): RegionCode | null {
  return typeof value === "string" && (REGION_CODES as readonly string[]).includes(value)
    ? value as RegionCode
    : null;
}

export function buildScanRequest(
  mode: "fixture" | "research",
  regionCode: RegionCode,
  timestamp: number,
): {
  readonly mode: "fixture" | "research";
  readonly region_code: RegionCode;
  readonly idempotency_key: string;
} {
  return {
    mode,
    region_code: regionCode,
    idempotency_key: `web-${mode}-${regionCode}-${timestamp}`,
  };
}
