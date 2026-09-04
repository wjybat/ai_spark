import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export async function GET() {
  try { getDb().prepare("SELECT 1").get(); return Response.json({ status: "ok" }); }
  catch { return Response.json({ status: "error" }, { status: 503 }); }
}
