import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getDb().prepare(`SELECT j.id,j.status,j.attempts,j.error_message,j.created_at,j.started_at,j.finished_at,
    s.id source_id,s.customer_id,s.title source_title,c.name customer_name
    FROM processing_jobs j JOIN source_items s ON s.id=j.source_item_id
    LEFT JOIN customers c ON c.id=s.customer_id WHERE j.id=?`).get(id);
  return job ? Response.json(job) : Response.json({ error: "任务不存在" }, { status: 404 });
}
