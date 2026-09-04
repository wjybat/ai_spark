import path from "node:path";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { buildEvidenceChain } from "../analysis/index.js";
import { config, hasLiveCredential, resolveMode } from "../config.js";
import { capabilities, customers, regions } from "../data/knowledge.js";
import { RunStore } from "./run-store.js";
import { countryBriefCatalog, getCountryContext } from "../data/country-research.js";

interface CreateRunBody {
  scope?: "country" | "customer";
  regionId?: string;
  customerId?: string;
  countryId?: string;
  countryName?: string;
  mode?: "auto" | "demo" | "live";
}

function serializeRun(run: ReturnType<RunStore["create"]>) {
  return {
    id: run.id,
    scope: run.scope,
    regionId: run.regionId,
    customerId: run.customerId,
    countryId: run.countryId,
    countryName: run.countryName,
    requestedMode: run.requestedMode,
    status: run.status,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    eventCount: run.events.length,
    output: run.output,
    error: run.error,
  };
}

export async function buildApp(options: { serveFrontend?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const store = new RunStore();
  await app.register(cors, { origin: true });

  app.get("/api/health", async () => {
    let effectiveMode: string;
    try { effectiveMode = resolveMode(); } catch { effectiveMode = "unavailable"; }
    return {
      ok: true,
      service: "global-opportunity-agent",
      agentCore: "@earendil-works/pi-agent-core@0.84.4",
      requestedMode: config.mode,
      effectiveMode,
      liveProvider: config.provider,
      liveCredentialAvailable: hasLiveCredential(),
      p0BackendFeatures: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    };
  });

  app.get("/api/catalog", async () => ({
    countryBriefs: countryBriefCatalog,
    regions: regions.map((region) => ({
      id: region.id,
      name: region.name,
      countries: region.countries,
      customerIds: region.customerIds,
      summary: region.marketSummary,
    })),
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      aliases: customer.aliases,
      regionId: customer.regionId,
      headquarters: customer.headquarters,
      countries: customer.countries,
      formats: customer.formats,
      storeCountLabel: customer.storeCountLabel,
      revenueLabel: customer.revenueLabel,
    })),
    capabilities: capabilities.map((capability) => ({
      id: capability.id,
      name: capability.name,
      layer: capability.layer,
      description: capability.description,
    })),
  }));

  app.get<{ Params: { customerId: string } }>("/api/evidence/:customerId", async (request, reply) => {
    try {
      return buildEvidenceChain(request.params.customerId);
    } catch (error) {
      return reply.code(404).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post<{ Body: CreateRunBody }>("/api/agent/runs", async (request, reply) => {
    const body = request.body ?? {};
    if (body.scope !== "country" && (!body.regionId || !body.customerId)) {
      return reply.code(400).send({ error: "regionId and customerId are required" });
    }
    try {
      const run = store.create({
        ...(body.scope ? { scope: body.scope } : {}),
        ...(body.regionId ? {regionId: body.regionId} : {}),
        ...(body.customerId ? {customerId: body.customerId} : {}),
        ...(body.countryId ? { countryId: body.countryId } : {}),
        ...(body.countryName ? { countryName: body.countryName } : {}),
        ...(body.mode ? { mode: body.mode } : {}),
      });
      setImmediate(() => store.start(run.id));
      return reply.code(202).send({ runId: run.id, status: run.status, eventsUrl: `/api/agent/runs/${run.id}/events` });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get<{Params:{countryId:string}}>("/api/countries/:countryId/research",async(request,reply)=>{
    try {const {draft,...context}=getCountryContext(request.params.countryId);return context;}
    catch(error){return reply.code(404).send({error:error instanceof Error?error.message:String(error)});}
  });

  app.get<{ Params: { runId: string } }>("/api/agent/runs/:runId", async (request, reply) => {
    const run = store.get(request.params.runId);
    if (!run) return reply.code(404).send({ error: "run not found" });
    return serializeRun(run);
  });

  app.get<{ Params: { runId: string } }>("/api/agent/runs/:runId/events", async (request, reply) => {
    const run = store.get(request.params.runId);
    if (!run) return reply.code(404).send({ error: "run not found" });

    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const write = (event: { id: number; type: string }) => {
      response.write(`id: ${event.id}\n`);
      response.write(`event: ${event.type}\n`);
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const unsubscribe = store.subscribe(run.id, (event) => {
      write(event);
      if (event.type === "run_complete" || event.type === "run_error") response.end();
    });
    request.raw.on("close", unsubscribe);
  });

  if (options.serveFrontend !== false) {
    await app.register(fastifyStatic, { root: config.frontendDir });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/")) return reply.code(404).send({ error: "not found" });
      if (path.extname(request.url)) return reply.code(404).send({ error: "asset not found" });
      return reply.sendFile("index.html");
    });
  }

  return app;
}
