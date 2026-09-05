import { getDb } from "@/lib/db";
import { buildRecentTimeline } from "@/lib/timeline";
import type { CustomerRow } from "@/lib/types";
import { safeJson } from "@/lib/utils";

export const runtime = "nodejs";
interface SummaryRow { current_state: string; key_requirements_json: string; key_blockers_json: string; success_factors_json: string; failure_reasons_json: string; reusable_playbook_json: string; next_actions_json: string; evidence_json: string; generated_at: string }
interface EventRow extends Record<string, unknown> { source_item_id: string; occurred_at: string; summary: string; importance: number; confidence: number; created_at: string; payload_json: string }

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(id) as CustomerRow | undefined;
  if (!customer) return Response.json({ error: "客户不存在" }, { status: 404 });
  const summary = db.prepare("SELECT * FROM customer_summaries WHERE customer_id=?").get(id) as SummaryRow | undefined;
  const recentEvents = db.prepare(`SELECT e.*,s.title source_title,s.source_type FROM customer_events e JOIN source_items s ON s.id=e.source_item_id
    WHERE e.customer_id=? ORDER BY e.occurred_at DESC,e.importance DESC,e.confidence DESC,e.created_at DESC LIMIT 100`).all(id) as unknown as EventRow[];
  const experienceRows = db.prepare("SELECT * FROM customer_experiences WHERE customer_id=? ORDER BY created_at DESC").all(id) as unknown as Array<Record<string, unknown> & { source_item_ids_json: string }>;
  const experiences = experienceRows.map(({ source_item_ids_json, ...experience }) => ({ ...experience, source_item_ids: safeJson(source_item_ids_json, []) }));
  const facts = db.prepare(`SELECT f.*,s.title source_title,s.source_type FROM customer_facts f
    JOIN source_items s ON s.id=f.source_item_id WHERE f.customer_id=? AND f.is_current=1 ORDER BY f.created_at DESC`).all(id);
  const sourceCount = (db.prepare("SELECT COUNT(*) count FROM source_items WHERE customer_id=?").get(id) as { count: number }).count;
  return Response.json({
    ...customer,
    profile: safeJson(customer.profile_json, {}),
    current_state: summary?.current_state || "尚未生成客户总结",
    key_requirements: safeJson(summary?.key_requirements_json, []),
    key_blockers: safeJson(summary?.key_blockers_json, []),
    success_factors: safeJson(summary?.success_factors_json, []),
    failure_reasons: safeJson(summary?.failure_reasons_json, []),
    reusable_playbook: safeJson(summary?.reusable_playbook_json, []),
    next_actions: safeJson(summary?.next_actions_json, []),
    evidence: safeJson(summary?.evidence_json, []),
    generated_at: summary?.generated_at || null,
    recent_events: buildRecentTimeline(recentEvents.map(({ payload_json, ...event }) => ({ ...event, payload: safeJson(payload_json, {}) })), 20),
    experiences, facts, source_count: sourceCount,
  });
}
