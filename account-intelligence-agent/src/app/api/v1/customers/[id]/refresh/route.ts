import { getDb, transaction } from "@/lib/db";
import { recomputeState } from "@/lib/state-engine";
import { refreshSummary } from "@/lib/summary";
import { apiError } from "@/lib/utils";

export const runtime = "nodejs";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    transaction(getDb(), () => { recomputeState(getDb(), id); refreshSummary(getDb(), id); });
    return Response.json({ status: "refreshed" });
  } catch (error) { return apiError(error); }
}
