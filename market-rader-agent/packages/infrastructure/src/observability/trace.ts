import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

export interface TraceContext {
  readonly traceId: string;
  readonly requestId: string;
  readonly component?: string;
}

const storage = new AsyncLocalStorage<TraceContext>();

export function newTraceId(): string {
  return `trc_${randomUUID()}`;
}

export function newRequestId(): string {
  return `req_${randomUUID()}`;
}

/** Runs fn with a trace context propagated through async chains. */
export function withTrace<T>(context: TraceContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** Current trace context, if the call chain entered withTrace. */
export function getTraceContext(): TraceContext | undefined {
  return storage.getStore();
}

/** Ensures a context exists; returns the active one or a fresh root context. */
export function ensureTraceContext(component?: string): TraceContext {
  const existing = storage.getStore();
  if (existing !== undefined) return existing;
  return component !== undefined
    ? { traceId: newTraceId(), requestId: newRequestId(), component }
    : { traceId: newTraceId(), requestId: newRequestId() };
}
