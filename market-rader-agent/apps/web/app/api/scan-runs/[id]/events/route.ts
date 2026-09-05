import { getScanEvents, isScanTerminal } from "@market-radar/infrastructure";

import { handle } from "@/lib/handler";

import { getDb } from "@/lib/db";

const TERMINAL_EVENTS = new Set(["scan.completed", "scan.partial", "scan.failed", "scan.cancelled"]);

/** SSE stream over scan_events with Last-Event-ID resume and heartbeats. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(request, "scan-runs:id:events:sse", async () => {
  const { id } = await context.params;
  const db = getDb();
  const lastEventId = Number(request.headers.get("last-event-id") ?? 0) || 0;

  const encoder = new TextEncoder();
  let cursor = lastEventId;
  let closed = false;
  let lastHeartbeat = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const poll = async (): Promise<void> => {
        if (closed) return;
        try {
          const events = await getScanEvents(db, id, cursor);
          for (const event of events) {
            cursor = event.id;
            send(
              `id: ${event.id}\nevent: ${event.event_type}\ndata: ${JSON.stringify({
                scan_run_id: id,
                country_id: event.country_id,
                topic_code: event.topic_code,
                message_code: event.message_code,
                payload: event.payload,
                created_at: new Date(event.created_at).toISOString(),
              })}\n\n`,
            );
            if (TERMINAL_EVENTS.has(event.event_type)) {
              closed = true;
              clearInterval(timer);
              send("event: stream.end\ndata: {}\n\n");
              controller.close();
              return;
            }
          }

          if (Date.now() - lastHeartbeat > 15_000) {
            lastHeartbeat = Date.now();
            send(`: heartbeat ${Date.now()}\n\n`);
          }

          if (await isScanTerminal(db, id)) {
            // Give late events one final read before closing.
            const tail = await getScanEvents(db, id, cursor);
            if (tail.length === 0) {
              closed = true;
              clearInterval(timer);
              send("event: stream.end\ndata: {}\n\n");
              controller.close();
            }
          }
        } catch {
          // Database hiccups must not kill the stream; next poll retries.
        }
      };

      const timer = setInterval(() => {
        void poll();
      }, 1_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      await poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
  });
}
