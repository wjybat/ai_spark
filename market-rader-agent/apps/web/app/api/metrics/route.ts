import { metrics, renderBusinessMetrics } from "@market-radar/infrastructure";

import { getDb } from "@/lib/db";

/** In-process technical metrics + database-backed business metrics. */
export async function GET(): Promise<Response> {
  const technical = metrics.render();
  const business = await renderBusinessMetrics(getDb());
  return new Response(technical + business, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
