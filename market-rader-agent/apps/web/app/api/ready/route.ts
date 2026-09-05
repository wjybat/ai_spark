import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export function GET(): NextResponse {
  try {
    const db = getDb();
    const result = db.$client.prepare("select 1 as ok").get();
    if (result === undefined) {
      throw new Error("database query returned no result");
    }
    return NextResponse.json({
      data: { status: "ready", database: "up" },
      meta: { request_id: "ready", trace_id: "ready" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_BUSY",
          message: error instanceof Error ? error.message : "database unavailable",
          retryable: true,
          details: {},
          request_id: "ready",
          trace_id: "ready",
        },
      },
      { status: 503 },
    );
  }
}
