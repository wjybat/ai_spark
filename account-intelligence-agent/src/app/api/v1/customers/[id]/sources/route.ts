import { getDb } from "@/lib/db";
import { safeJson } from "@/lib/utils";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = getDb().prepare("SELECT * FROM source_items WHERE customer_id=? ORDER BY COALESCE(occurred_at,received_at) DESC").all(id) as unknown as Array<Record<string, unknown> & { metadata_json: string }>;
  return Response.json(rows.map(({ metadata_json, ...row }) => ({ ...row, metadata: safeJson(metadata_json, {}) })));
}
