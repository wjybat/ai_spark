import { describe, expect, it } from "vitest";

import type { ScanRunSummary } from "@market-radar/infrastructure";

import { selectJobRun } from "../lib/task-runs.js";

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
    finished_at: 1,
    ...overrides,
  };
}

describe("selectJobRun", () => {
  it("shows an active Pi scan even when a newer fixture scan exists", () => {
    const newestFixture = run({ scan_run_id: "fixture_new", created_at: 3 });
    const activePi = run({
      scan_run_id: "pi_active",
      status: "researching",
      result_status: "running",
      model_provider: "pi-agent",
      model_name: "local-pi-default",
      created_at: 2,
    });

    expect(selectJobRun([newestFixture, activePi])?.scan_run_id).toBe("pi_active");
  });

  it("falls back to the newest research run when no scan is active", () => {
    const newestFixture = run({ scan_run_id: "fixture_new", created_at: 3 });
    const completedPi = run({
      scan_run_id: "pi_completed",
      model_provider: "pi-agent",
      model_name: "local-pi-default",
      created_at: 2,
    });

    expect(selectJobRun([newestFixture, completedPi])?.scan_run_id).toBe("pi_completed");
  });
});
