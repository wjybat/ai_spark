import { getDb, transaction } from "@/lib/db";
import { retryFailedJob } from "@/lib/ingestion";
import { apiError } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = transaction(getDb(), () => retryFailedJob(getDb(), id));
    return Response.json(result, { status: 202 });
  } catch (error) { return apiError(error); }
}
