// UI-only fixture: no Agent or model is loaded. Unexpected run requests are counted and rejected.
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";

const app = Fastify({ logger: false });
let agentRunRequests = 0;
app.get("/api/health", async () => ({ ok: true, effectiveMode: "前端测试" }));
app.post("/api/agent/runs", async (_request, reply) => {
  agentRunRequests += 1;
  return reply.code(503).send({ error: "此测试服务不运行 Agent" });
});
app.get("/__test__/requests", async () => ({ agentRunRequests }));
await app.register(fastifyStatic, { root: fileURLToPath(new URL("../../../global-opportunity-radar", import.meta.url)) });
console.log(await app.listen({ port: 0, host: "127.0.0.1" }));
