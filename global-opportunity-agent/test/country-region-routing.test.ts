import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { scanMarket } from "../src/analysis/market.js";
import { RunStore } from "../src/http/run-store.js";

const frontendClient = new URL("../../global-opportunity-radar/agent-client.js", import.meta.url);
const sandbox = { window: {} as { AgentApi?: { targetForCountry(countryId: string): { regionId: string; customerId: string } | null } } };
runInNewContext(readFileSync(frontendClient, "utf8"), sandbox);

const countryRoutes = [
  { countryId: "uae", countryName: "阿联酋", regionId: "uae", customerId: "sigma-chemist" },
  { countryId: "ireland", countryName: "爱尔兰", regionId: "ireland", customerId: "sigma-chemist" },
  { countryId: "usa", countryName: "美国", regionId: "usa", customerId: "cencosud" },
] as const;

describe("country-to-market routing", () => {
  it.each(countryRoutes)("routes $countryName to its own market scope", ({ countryId, countryName, regionId, customerId }) => {
    const target = sandbox.window.AgentApi?.targetForCountry(countryId);
    expect(target).toMatchObject({ regionId, customerId });

    const market = scanMarket(target!.regionId);
    expect(market.regionId).toBe(regionId);
    expect(market.regionName).toBe(countryName);
    expect(market.recommendedCountries).toEqual([countryName]);
    expect(market.evidenceIds.length).toBeGreaterThan(0);

    const run = new RunStore().create({ regionId, customerId, countryId, countryName, mode: "demo" });
    expect(run.regionId).toBe(regionId);
    expect(run.countryName).toBe(countryName);
  });
});
