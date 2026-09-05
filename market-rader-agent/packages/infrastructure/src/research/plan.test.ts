import { describe, expect, it } from "vitest";

import { hasObservationSpan } from "./plan.js";

describe("research plan period coverage", () => {
  it("does not reuse adjacent annual observations for a three-year foundation", () => {
    expect(hasObservationSpan(["2024-12-31", "2025-12-31"], 2.5, 3.5)).toBe(false);
  });

  it("recognizes an actual three-year observation pair even with intermediate dates", () => {
    expect(
      hasObservationSpan(
        ["2022-12-31", "2023-12-31", "2024-12-31", "2025-12-31"],
        2.5,
        3.5,
      ),
    ).toBe(true);
  });
});
