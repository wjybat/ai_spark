import { rejectCandidate } from "@market-radar/infrastructure";

import { fail, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(request, "evidence-candidates:id:reject:post", async () => {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      expected_candidate_hash?: string;
      reason?: string;
    };
    if (typeof body.expected_candidate_hash !== "string") {
      return fail(new Error("expected_candidate_hash is required"));
    }
    return ok(
      await rejectCandidate(getDb(), {
        candidateId: id,
        expectedCandidateHash: body.expected_candidate_hash,
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
      }),
    );
  } catch (error) {
    return fail(error);
  }
  });
}
