import { getDb } from "@/lib/db";
import { buildRecentTimeline } from "@/lib/timeline";
import { safeJson } from "@/lib/utils";

export const runtime = "nodejs";
interface EventRow extends Record<string, unknown> { source_item_id: string; occurred_at: string; summary: string; importance: number; confidence: number; created_at: string; payload_json: string }
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = getDb().prepare(`SELECT e.*,s.title source_title,s.source_type,s.source_system FROM customer_events e
    JOIN source_items s ON s.id=e.source_item_id WHERE e.customer_id=? ORDER BY e.occurred_at DESC,e.created_at DESC`).all(id) as unknown as EventRow[];
  return Response.json(buildRecentTimeline(rows.map(({ payload_json, ...row }) => ({ ...row, payload: safeJson(payload_json, {}) })), rows.length));
}
