import { AppError } from "@market-radar/domain";
import { createRegionalScenario, getScenarios } from "@market-radar/infrastructure";

import { fail, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function GET(request: Request): Promise<Response> {
  return handle(request, "scenarios:get", async () => {
  try {
    return ok({ scenarios: await getScenarios(getDb()) });
  } catch (error) {
    return fail(error);
  }
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(request, "scenarios:post", async () => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (
      (body.name !== undefined && typeof body.name !== "string") ||
      (body.strategy_code !== undefined && typeof body.strategy_code !== "string") ||
      (body.region_code !== undefined && typeof body.region_code !== "string")
    ) {
      return fail(new AppError({ code: "VALIDATION_ERROR", message: "Scenario fields must be strings" }));
    }
    try {
      const scenario = await createRegionalScenario(getDb(), {
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(typeof body.strategy_code === "string" ? { strategyCode: body.strategy_code } : {}),
        ...(typeof body.region_code === "string" ? { regionCode: body.region_code } : {}),
      });
      return ok({ scenario });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Unsupported region code:")) {
        return fail(new AppError({ code: "VALIDATION_ERROR", message: error.message }));
      }
      throw error;
    }
  } catch (error) {
    return fail(error);
  }
  });
}
