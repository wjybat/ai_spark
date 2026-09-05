import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export async function GET() {
  const db = getDb();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const week = new Date(Date.now() - 7 * 86400_000).toISOString();
  const counts = db.prepare(`SELECT COUNT(*) total,
    SUM(CASE WHEN received_at >= ? THEN 1 ELSE 0 END) today,
    SUM(CASE WHEN received_at >= ? THEN 1 ELSE 0 END) week
    FROM source_items`).get(today, week) as { total: number; today: number | null; week: number | null };
  const stalled = db.prepare("SELECT id,name,stage,last_activity_at FROM customers WHERE status='STALLED' ORDER BY last_activity_at DESC LIMIT 8").all();
  const recent = db.prepare("SELECT id,name,category,stage,status,last_activity_at FROM customers WHERE last_activity_at IS NOT NULL ORDER BY last_activity_at DESC LIMIT 8").all();
  return Response.json({ ingestion: { total: counts.total, today: counts.today || 0, week: counts.week || 0 }, stalled, recent });
}
