// UI-only regression fixture; never registered by the production server and never calls an LLM.
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { runOpportunityPipeline } from "../../src/agent/orchestrator.js";

const report = await runOpportunityPipeline(
  { runId: "markdown-render-fixture", regionId: "global", customerId: "cencosud", mode: "demo" },
  () => undefined,
);
const markdown = [
  "## Markdown 渲染验收", "", "**高潜客户**，但不是已确认采购项目。", "",
  "### 下一步行动", "", "1. 核验预算", "2. 确认系统边界", "",
  "- 保留 SAP", "  - **外围集成** `OMS`", "  - 核验 WMS 接口", "",
  "> 所有商机判断需要人工确认。", "",
  "| 维度 | 状态 |", "| --- | --- |", "| 预算 | **待确认** |", "| 系统 | SAP / OMS |", "",
  "[查看证据](https://example.com/report)", "",
  "```json", '{ "customer": "Cencosud", "verified": true }', "```",
].join("\n");
report.finalNarrative = markdown;
report.researchBrief.executiveSummary = markdown;
report.researchBrief.firstMeetingQuestions = ["**预算**由谁负责？", "请确认 `OMS` / `WMS` 的边界。"];
report.researchBrief.outreachEmail.body = "Hi [Name],\n\nWe propose **one focused pilot**.\n\n1. Confirm scope\n2. Review evidence";
report.modelRun.model = "markdown-render-test";

const app = Fastify({ logger: false });
app.get("/api/health", async () => ({ ok: true, effectiveMode: "UI 测试" }));
app.post("/api/agent/runs", async () => ({ runId: report.runId, eventsUrl: "/api/agent/runs/render-fixture/events" }));
app.get("/api/agent/runs/render-fixture/events", async (_request, reply) => {
  reply.hijack();
  reply.raw.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" });
  reply.raw.end(`event: run_complete\ndata: ${JSON.stringify({ type: "run_complete", runId: report.runId, data: report })}\n\n`);
});
await app.register(fastifyStatic, { root: fileURLToPath(new URL("../../../global-opportunity-radar", import.meta.url)) });
console.log(await app.listen({ port: 0, host: "127.0.0.1" }));
