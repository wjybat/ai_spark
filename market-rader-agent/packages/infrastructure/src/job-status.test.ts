import { describe, expect, it } from "vitest";

import { displayJobStatus } from "./usecases/events.js";

describe("research job display status", () => {
  it("exposes technically successful empty jobs as insufficient evidence", () => {
    expect(displayJobStatus("succeeded", "insufficient_evidence")).toBe("insufficient_evidence");
    expect(displayJobStatus("succeeded", null)).toBe("succeeded");
    expect(displayJobStatus("failed", "insufficient_evidence")).toBe("failed");
  });
});
