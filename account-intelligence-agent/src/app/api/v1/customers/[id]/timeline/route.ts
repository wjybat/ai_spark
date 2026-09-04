import { getDb } from "@/lib/db";
import { safeJson } from "@/lib/utils";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = getDb().prepare(`SELECT e.*,s.title source_title,s.source_type,s.source_system FROM customer_events e
    JOIN source_items s ON s.id=e.source_item_id WHERE e.customer_id=? ORDER BY e.occurred_at DESC,e.created_at DESC`).all(id) as unknown as Array<Record<string, unknown> & { payload_json: string }>;
  return Response.json(rows.map(({ payload_json, ...row }) => ({ ...row, payload: safeJson(payload_json, {}) })));
}
