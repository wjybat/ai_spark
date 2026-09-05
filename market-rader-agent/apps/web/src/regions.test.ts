import { describe, expect, it } from "vitest";

import { buildScanRequest, parseRegionCode } from "../lib/regions.js";

describe("regional scan request", () => {
  it("includes the selected region in the command payload and idempotency key", () => {
    expect(buildScanRequest("research", "middle-east", 123)).toEqual({
      mode: "research",
      region_code: "middle-east",
      idempotency_key: "web-research-middle-east-123",
    });
  });

  it("rejects unsupported region codes", () => {
    expect(parseRegionCode("north-africa")).toBe("north-africa");
    expect(parseRegionCode("europe")).toBeNull();
    expect(parseRegionCode(undefined)).toBeNull();
  });
});
