import { AppError } from "@market-radar/domain";
import {
  createRegionalScenario,
  getScanRuns,
  runFixtureScan,
  runRecalculationScan,
  runResearchScan,
} from "@market-radar/infrastructure";

import { fail, ok } from "@/lib/api";
import { getDb, getWebConfig } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function GET(request: Request): Promise<Response> {
  return handle(request, "scan-runs:get", async () => {
  try {
    return ok({ scan_runs: await getScanRuns(getDb()) });
  } catch (error) {
    return fail(error);
  }
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(request, "scan-runs:post", async () => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const field of ["scenario_revision_id", "region_code", "mode", "data_as_of", "idempotency_key"] as const) {
      if (body[field] !== undefined && typeof body[field] !== "string") {
        return fail(new AppError({ code: "VALIDATION_ERROR", message: `${field} must be a string` }));
      }
    }
    if (
      body.mode !== undefined && body.mode !== "fixture" &&
      body.mode !== "research" && body.mode !== "recalculate"
    ) {
      return fail(new AppError({
        code: "VALIDATION_ERROR",
        message: "mode must be fixture, research, or recalculate",
      }));
    }
    if (body.scenario_revision_id !== undefined && body.region_code !== undefined) {
      return fail(new AppError({
        code: "VALIDATION_ERROR",
        message: "scenario_revision_id and region_code are mutually exclusive",
      }));
    }
    const db = getDb();
    const config = getWebConfig();
    const mode = body.mode ?? (config.search.provider === "pi-agent" ? "research" : "fixture");
    if (mode === "fixture" && config.search.provider === "pi-agent") {
      return fail(new AppError({
        code: "VALIDATION_ERROR",
        message: "Fixture scans are disabled while SEARCH_PROVIDER=pi-agent",
      }));
    }
    let scenario: Awaited<ReturnType<typeof createRegionalScenario>> | null = null;
    if (body.scenario_revision_id === undefined) {
      try {
        scenario = await createRegionalScenario(db, {
          ...(typeof body.region_code === "string" ? { regionCode: body.region_code } : {}),
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Unsupported region code:")) {
          return fail(new AppError({ code: "VALIDATION_ERROR", message: error.message }));
        }
        throw error;
      }
    }
    const revisionId = typeof body.scenario_revision_id === "string"
      ? body.scenario_revision_id
      : scenario!.revisionId;
    const commonInput = {
      scenarioRevisionId: revisionId,
      ...(typeof body.data_as_of === "string" ? { asOf: body.data_as_of } : {}),
      idempotencyKey: typeof body.idempotency_key === "string"
        ? body.idempotency_key
        : `web-${mode}-${Date.now()}`,
    };
    const run = mode === "research"
      ? await runResearchScan(db, {
          ...commonInput,
          researchProvider: config.search.provider,
        })
      : mode === "recalculate"
        ? await runRecalculationScan(db, {
            ...commonInput,
            researchProvider: config.search.provider,
          })
        : await runFixtureScan(db, commonInput);
    return ok({
      scan_run_id: run.scanRunId,
      status: run.status,
      result_status: run.resultStatus,
      input_hash: run.inputHash,
      replayed: run.replayed,
      ...(run.jobsCreated !== undefined ? { jobs_created: run.jobsCreated } : {}),
      region_code: scenario?.regionCode ?? null,
      country_scope: scenario?.countryScope ?? null,
      frozen_versions: {
        metric_definition_set_id: scenario?.metricDefinitionSetId ?? null,
        reference_set_id: scenario?.referenceSetId ?? null,
        scoring_model_id: scenario?.scoringModelId ?? null,
        benchmark_status: scenario?.benchmarkStatus ?? null,
        validator: "engine-1.4.0",
      },
    });
  } catch (error) {
    return fail(error);
  }
  });
}
