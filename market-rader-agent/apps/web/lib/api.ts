import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { AppError } from "@market-radar/domain";

export function requestId(): string {
  return `req_${randomUUID()}`;
}

export function ok<T>(data: T): NextResponse {
  const id = requestId();
  return NextResponse.json({ data, meta: { request_id: id, trace_id: id } });
}

export function fail(error: unknown): NextResponse {
  const id = requestId();
  if (AppError.isAppError(error)) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "VALIDATION_ERROR" ? 400 : 409;
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          details: error.details,
          request_id: id,
          trace_id: id,
        },
      },
      { status },
    );
  }
  const message = error instanceof Error ? error.message : "Internal error";
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message,
        retryable: false,
        details: {},
        request_id: id,
        trace_id: id,
      },
    },
    { status: 500 },
  );
}
