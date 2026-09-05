import { describe, expect, it } from "vitest";

import type { ScanRunSummary } from "@market-radar/infrastructure";

import { selectDisplayRun } from "../lib/display-runs.js";

function run(overrides: Partial<ScanRunSummary>): ScanRunSummary {
  return {
    scan_run_id: "scan_default",
    scenario_revision_id: "revision",
    status: "completed",
    result_status: "completed",
    data_as_of: "2026-09-01",
    input_hash: "hash",
    model_provider: "fixture",
    model_name: "fixture",
    cancel_requested_at: null,
    created_at: 1,
    finished_at: 2,
    ...overrides,
  };
}

describe("selectDisplayRun", () => {
  it("prefers the configured provider over a later-created fixture run", () => {
    const pi = run({
      scan_run_id: "pi",
      model_provider: "pi-agent",
      created_at: 10,
      finished_at: 30,
    });
    const fixture = run({ scan_run_id: "fixture", created_at: 20, finished_at: 21 });

    expect(selectDisplayRun([fixture, pi], "pi-agent")?.scan_run_id).toBe("pi");
  });

  it("never falls back to fixture data in Pi mode", () => {
    const fixture = run({ scan_run_id: "fixture" });

    expect(selectDisplayRun([fixture], "pi-agent")).toBeUndefined();
  });

  it("uses completion time and ignores a newer cancelled attempt", () => {
    const olderCompletion = run({ scan_run_id: "older", finished_at: 20 });
    const newerCompletion = run({ scan_run_id: "newer", created_at: 5, finished_at: 30 });
    const cancelled = run({
      scan_run_id: "cancelled",
      status: "cancelled",
      result_status: "cancelled",
      created_at: 40,
      finished_at: 41,
    });

    expect(selectDisplayRun([cancelled, olderCompletion, newerCompletion], "fixture")?.scan_run_id)
      .toBe("newer");
  });

  it("does not display a completed scan from another regional scenario", () => {
    const middleEast = run({
      scan_run_id: "middle-east",
      scenario_revision_id: "revision_middle_east",
      model_provider: "pi-agent",
      finished_at: 20,
    });
    const newerSea = run({
      scan_run_id: "sea",
      scenario_revision_id: "revision_sea",
      model_provider: "pi-agent",
      finished_at: 30,
    });

    expect(
      // Regression: the third argument scopes completed results to the selected region.
      selectDisplayRun([newerSea, middleEast], "pi-agent", ["revision_middle_east"])
        ?.scan_run_id,
    ).toBe("middle-east");
  });
});
