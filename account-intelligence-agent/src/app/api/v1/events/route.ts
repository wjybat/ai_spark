import { getDb, transaction } from "@/lib/db";
import { recomputeState } from "@/lib/state-engine";
import { refreshSummary } from "@/lib/summary";
import { structuredEventSchema } from "@/lib/types";
import { contentHash, makeId, nowIso, apiError } from "@/lib/utils";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = structuredEventSchema.parse(await request.json());
    const db = getDb();
    const result = transaction(db, () => {
      if (!db.prepare("SELECT id FROM customers WHERE id=?").get(input.customer_id)) throw new Error("客户不存在");
      const existing = db.prepare("SELECT id FROM source_items WHERE source_system=? AND external_id=?").get(input.source.system, input.source.external_id) as { id: string } | undefined;
      if (existing) {
        const event = db.prepare("SELECT id FROM customer_events WHERE source_item_id=? AND event_type=?").get(existing.id, input.event_type);
        if (event) return { status: "already_exists", source_id: existing.id };
      }
      const now = nowIso();
      const sourceId = existing?.id || makeId("src");
      if (!existing) db.prepare(`INSERT INTO source_items (id,customer_id,source_type,source_system,external_id,title,content,content_hash,occurred_at,received_at,metadata_json,processing_status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(sourceId, input.customer_id, "CRM_FOLLOWUP", input.source.system, input.source.external_id, input.summary, input.summary, contentHash(input.summary), input.occurred_at, now, "{}", "DONE", now, now);
      db.prepare("INSERT INTO customer_events (id,customer_id,source_item_id,event_type,occurred_at,summary,importance,confidence,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(makeId("evt"), input.customer_id, sourceId, input.event_type, input.occurred_at, input.summary, input.importance, 1, "{}", now);
      recomputeState(db, input.customer_id); refreshSummary(db, input.customer_id);
      return { status: "created", source_id: sourceId };
    });
    return Response.json(result, { status: result.status === "created" ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
