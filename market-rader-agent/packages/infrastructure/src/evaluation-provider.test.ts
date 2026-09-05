import { describe, expect, it } from "vitest";

import { snapshotEvidenceProvider } from "./usecases/evaluation.js";

describe("evaluation evidence provider isolation", () => {
  it("identifies Pi and fixture snapshots", () => {
    expect(snapshotEvidenceProvider('{"provider":"pi-agent","fixture":false}')).toBe("pi-agent");
    expect(snapshotEvidenceProvider('{"provider":"fixture","fixture":true}')).toBe("fixture");
    expect(snapshotEvidenceProvider('{"fixture":true}')).toBe("fixture");
  });

  it("does not assign malformed or unproven snapshot metadata to a provider", () => {
    expect(snapshotEvidenceProvider("not-json")).toBeNull();
    expect(snapshotEvidenceProvider("{}")).toBeNull();
  });
});
