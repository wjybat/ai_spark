import { createAgentRuntime } from "@market-radar/agent";

import { fail, ok } from "@/lib/api";
import { getAppContext } from "@/lib/context";
import { getDb, getWebConfig } from "@/lib/db";
import { handle } from "@/lib/handler";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(request, "agent:sessions:id:messages:get", async () => {
  try {
    const { id } = await context.params;
    const runtime = createAgentRuntime();
    return ok({ messages: await runtime.getHistory(getDb(), id) });
  } catch (error) {
    return fail(error);
  }
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(request, "agent:sessions:id:messages:post", async () => {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      message?: string;
      active_scan_run_id?: string;
    };
    if (typeof body.message !== "string" || body.message.trim() === "") {
      return fail(new Error("message is required"));
    }
    const config = getWebConfig();
    const runtime = createAgentRuntime({
      piConversation: {
        enabled: config.search.provider === "pi-agent",
        timeoutMs: Math.min(config.piAgent.timeoutMs, 120_000),
        thinkingLevel: config.agentChat.thinkingLevel,
      },
    });
    const appContext = await getAppContext();
    const displayScanRunId = body.active_scan_run_id ?? appContext.scanRunId;
    const result = await runtime.sendMessage(getDb(), {
      sessionId: id,
      message: body.message,
      ...(displayScanRunId !== null && displayScanRunId !== undefined
        ? { activeScanRunId: displayScanRunId }
        : {}),
    });
    return ok({
      run_id: result.runId,
      answer: result.answer,
      facts: result.facts,
      events: result.events,
      tool_calls: result.toolCalls,
    });
  } catch (error) {
    return fail(error);
  }
  });
}
