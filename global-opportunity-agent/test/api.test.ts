import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/http/app.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe("HTTP API", () => {
  it("generates a country brief from the server-selected three dossiers and streams the national result", async()=>{
    app=await buildApp({serveFrontend:false});
    const research=await app.inject({method:"GET",url:"/api/countries/uae/research"});
    expect(research.json().companies.map(c=>c.name)).toEqual(["Sigma Healthcare / Chemist Warehouse","LuLu Retail","Union Coop"]);
    const created=await app.inject({method:"POST",url:"/api/agent/runs",payload:{scope:"country",countryId:"uae",mode:"demo"}});
    expect(created.statusCode).toBe(202);
    const runId=created.json().runId;
    let result;
    for(let attempt=0;attempt<80;attempt++){
      result=(await app.inject({method:"GET",url:`/api/agent/runs/${runId}`})).json();
      if(["completed","failed"].includes(result.status))break;
      await new Promise(resolve=>setTimeout(resolve,30));
    }
    expect(result.status).toBe("completed");
    expect(result.scope).toBe("country");
    expect(result.output.analysis.companyAssessments).toHaveLength(3);
    expect(result.output.customerProfile).toBeUndefined();
    const stream=await app.inject({method:"GET",url:`/api/agent/runs/${runId}/events`});
    expect(stream.body).toContain("event: run_complete");
    expect(stream.body).toContain('"scope":"country"');
  });
  it("exposes health, catalog, creates and completes an agent run", async () => {
    app = await buildApp({ serveFrontend: false });
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().p0BackendFeatures).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const catalog = await app.inject({ method: "GET", url: "/api/catalog" });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().customers).toHaveLength(3);

    const invalidCountry = await app.inject({ method: "POST", url: "/api/agent/runs", payload: { regionId: "canada", customerId: "loblaw", countryId: "brazil", countryName: "巴西", mode: "demo" } });
    expect(invalidCountry.statusCode).toBe(400);

    const created = await app.inject({
      method: "POST",
      url: "/api/agent/runs",
      payload: { regionId: "canada", customerId: "loblaw", countryId: "canada", countryName: "加拿大", mode: "demo" },
    });
    expect(created.statusCode).toBe(202);
    const runId = created.json().runId as string;

    let result: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await app.inject({ method: "GET", url: `/api/agent/runs/${runId}` });
      result = response.json();
      if (result.status === "completed" || result.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(result?.status).toBe("completed");
    const output = result?.output as { customerId: string; countryId: string; countryName: string; finalNarrative: string; evidenceChain: { records: unknown[] } };
    expect(output.customerId).toBe("loblaw");
    expect(output.countryId).toBe("canada");
    expect(output.countryName).toBe("加拿大");
    expect(output.finalNarrative).toContain("客户作战分析（加拿大业务场景）");
    expect(output.evidenceChain.records.length).toBeGreaterThan(3);
  }, 20_000);
});
