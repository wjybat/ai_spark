import {
  METRIC_NAMES,
  metrics,
  newRequestId,
  newTraceId,
  withTrace,
} from "@market-radar/infrastructure";

/**
 * Wraps a route handler with a request-scoped trace context (honoring
 * incoming X-Request-Id / X-Trace-Id), HTTP metrics and response headers.
 */
export async function handle(
  request: Request,
  route: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? newRequestId();
  const traceId = request.headers.get("x-trace-id") ?? newTraceId();
  const startedAt = Date.now();

  try {
    const response = await withTrace({ traceId, requestId, component: "web" }, handler);
    const duration = Date.now() - startedAt;
    metrics.increment(METRIC_NAMES.httpRequestsTotal, {
      route,
      status: String(response.status),
    });
    metrics.increment(METRIC_NAMES.httpRequestDurationMsSum, { route }, duration);
    metrics.increment(METRIC_NAMES.httpRequestDurationMsCount, { route });
    response.headers.set("x-request-id", requestId);
    response.headers.set("x-trace-id", traceId);
    return response;
  } catch (error) {
    metrics.increment(METRIC_NAMES.httpRequestsTotal, { route, status: "500" });
    throw error;
  }
}
