import { getRanking } from "@market-radar/infrastructure";

import { fail, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(request, "scan-runs:id:ranking:get", async () => {
  try {
    const { id } = await context.params;
    return ok(await getRanking(getDb(), id));
  } catch (error) {
    return fail(error);
  }
  });
}
