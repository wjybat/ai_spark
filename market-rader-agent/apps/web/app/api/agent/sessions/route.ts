import { createAgentRuntime } from "@market-radar/agent";

import { fail, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function POST(request: Request): Promise<Response> {
  return handle(request, "agent:sessions:post", async () => {
  try {
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const runtime = createAgentRuntime();
    const sessionId = await runtime.createSession(getDb(), body.title);
    return ok({ session_id: sessionId });
  } catch (error) {
    return fail(error);
  }
  });
}
