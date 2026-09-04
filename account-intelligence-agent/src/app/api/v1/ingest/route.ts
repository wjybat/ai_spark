import { getDb, transaction } from "@/lib/db";
import { ingest } from "@/lib/ingestion";
import { ingestSchema } from "@/lib/types";
import { apiError } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = ingestSchema.parse(await request.json());
    const result = transaction(getDb(), () => ingest(getDb(), input));
    return Response.json(result, { status: result.status === "already_exists" ? 200 : 202 });
  } catch (error) { return apiError(error); }
}
