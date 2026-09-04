import { createCustomer } from "@/lib/customers";
import { getDb, transaction } from "@/lib/db";
import { customerCreateSchema, type CustomerRow } from "@/lib/types";
import { apiError } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = customerCreateSchema.parse(await request.json());
    const customer = transaction(getDb(), () => createCustomer(getDb(), input));
    return Response.json(customer, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const where: string[] = [];
  const args: (string | number)[] = [];
  for (const key of ["category", "stage", "status", "country", "industry"] as const) {
    const value = url.searchParams.get(key);
    if (value) { where.push(`c.${key}=?`); args.push(value); }
  }
  const q = url.searchParams.get("q");
  if (q) { where.push("c.name LIKE ?"); args.push(`%${q}%`); }
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") || 20)));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDb();
  const total = (db.prepare(`SELECT COUNT(*) count FROM customers c ${clause}`).get(...args) as { count: number }).count;
  const items = db.prepare(`SELECT c.*,s.current_state card_summary FROM customers c LEFT JOIN customer_summaries s ON s.customer_id=c.id ${clause} ORDER BY c.last_activity_at IS NULL, c.last_activity_at DESC, c.created_at DESC LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize) as unknown as CustomerRow[];
  const stats = db.prepare("SELECT category,COUNT(*) count FROM customers GROUP BY category").all() as unknown as Array<{ category: string; count: number }>;
  return Response.json({ items, total, page, page_size: pageSize, stats: Object.fromEntries(stats.map((row) => [row.category, row.count])) });
}
