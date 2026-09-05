import { getCountryDetail } from "@market-radar/infrastructure";

import { fail, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; countryId: string }> },
): Promise<Response> {
  return handle(request, "scan-runs:id:countries:countryId:get", async () => {
  try {
    const { id, countryId } = await context.params;
    return ok(await getCountryDetail(getDb(), id, countryId));
  } catch (error) {
    return fail(error);
  }
  });
}
