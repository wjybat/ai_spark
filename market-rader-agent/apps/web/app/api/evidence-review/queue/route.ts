import { getReviewQueue } from "@market-radar/infrastructure";

import { fail, ok } from "@/lib/api";
import { getAppContext } from "@/lib/context";
import { getDb } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function GET(request: Request): Promise<Response> {
  return handle(request, "evidence-review:queue:get", async () => {
  try {
    const context = await getAppContext();
    return ok({ queue: await getReviewQueue(getDb(), { countryIds: context.countryIds }) });
  } catch (error) {
    return fail(error);
  }
  });
}
