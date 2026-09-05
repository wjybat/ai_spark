import { getDb } from "@/lib/db";
import { continentForCountry } from "@/lib/geography";
import { safeJson } from "@/lib/utils";

export const runtime = "nodejs";

interface ExperienceRow {
  id: string;
  experience_type: string;
  stage: string | null;
  title: string;
  description: string;
  confidence: number;
  source_item_ids_json: string;
  created_at: string;
  customer_id: string;
  customer_name: string;
  country: string | null;
  industry: string | null;
}

export async function GET() {
  const rows = getDb().prepare(`SELECT e.id,e.experience_type,e.stage,e.title,e.description,e.confidence,e.source_item_ids_json,e.created_at,
    c.id customer_id,c.name customer_name,c.country,c.industry
    FROM customer_experiences e JOIN customers c ON c.id=e.customer_id
    ORDER BY c.country,c.name,e.created_at DESC`).all() as unknown as ExperienceRow[];

  return Response.json({
    items: rows.map(({ source_item_ids_json, ...row }) => ({
      ...row,
      continent: continentForCountry(row.country),
      source_item_ids: safeJson(source_item_ids_json, []),
    })),
    total: rows.length,
  });
}
