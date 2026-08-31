// Replays an explicitly supplied saved report for UI QA; never loads a model or a credential.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import type { PipelineOutput } from "../../src/types/domain.js";

if (!process.argv[2]) throw new Error("Pass an absolute path to a saved PipelineOutput JSON");
const report: PipelineOutput = JSON.parse(await readFile(process.argv[2], "utf8"));
const app = Fastify({ logger: false });
app.get("/api/health", async () => ({ ok: true, effectiveMode: "已存结果回放" }));
app.post<{ Body: { customerId: string } }>("/api/agent/runs", async (request, reply) => {
  if (request.body.customerId !== report.customerId) return reply.code(400).send({ error: "此回放只提供已保存客户的结果" });
  return { runId: report.runId, eventsUrl: "/api/agent/runs/replay/events" };
});
app.get("/api/agent/runs/replay/events", async (_request, reply) => {
  reply.hijack();
  reply.raw.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" });
  reply.raw.end(`event: run_complete\ndata: ${JSON.stringify({ type: "run_complete", runId: report.runId, data: report })}\n\n`);
});
await app.register(fastifyStatic, { root: fileURLToPath(new URL("../../../global-opportunity-radar", import.meta.url)) });
console.log(await app.listen({ port: 0, host: "127.0.0.1" }));
