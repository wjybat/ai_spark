import { NextResponse } from "next/server";

export function GET(): NextResponse {
  return NextResponse.json({ data: { status: "ok" }, meta: { request_id: "health", trace_id: "health" } });
}
