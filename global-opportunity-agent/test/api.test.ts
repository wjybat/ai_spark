import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/http/app.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe("HTTP API", () => {
  it("exposes health, catalog, creates and completes an agent run", async () => {
    app = await buildApp({ serveFrontend: false });
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().p0BackendFeatures).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const catalog = await app.inject({ method: "GET", url: "/api/catalog" });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().customers).toHaveLength(3);

    const created = await app.inject({
      method: "POST",
      url: "/api/agent/runs",
      payload: { regionId: "canada", customerId: "loblaw", mode: "demo" },
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
    const output = result?.output as { customerId: string; evidenceChain: { records: unknown[] } };
    expect(output.customerId).toBe("loblaw");
    expect(output.evidenceChain.records.length).toBeGreaterThan(3);
  }, 20_000);
});
