import { readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { config } from "../config.js";
import type { CountryContext, CountryCompany, CountryBriefAnalysis, CountryEvidence } from "../types/country.js";

// Only bundled, trusted project scripts are evaluated. Request bodies never provide code or file paths.
interface PresentationData {
  countryMeta: Record<string, string>;
  regions: Record<string, { name: string }>;
  countries: Record<string, { id: string; name: string; region: string; research: Record<string, unknown> & { companies: CountryCompany[]; managementDraft: CountryBriefAnalysis } }>;
}
const sandbox = { window: {} as { OPPORTUNITY_DATA: PresentationData } };
for (const file of ["data.js", "country-data.js", "country-brief-data.js"]) {
  runInNewContext(readFileSync(path.join(config.frontendDir, file), "utf8"), sandbox, { timeout: 3000 });
}
const presentation = sandbox.window.OPPORTUNITY_DATA;
export function getCountryContext(countryId: string): CountryContext {
  if (!Object.hasOwn(presentation.countries, countryId)) throw new Error(`Unknown country: ${countryId}`);
  const country = presentation.countries[countryId]!;
  const { companies, managementDraft, ...market } = country.research;
  const metrics=market.metrics as Array<{label:string;value:string;scope:string;period:string;basis:string;source?:{title:string;url:string}}>;
  const evidence:CountryEvidence[]=metrics.map((m,i)=>({id:`M${i+1}`,companyId:"country",kind:m.source?"fact":"inference",scope:`本国指标 · ${m.basis}`,text:`${m.label}：${m.value}；${m.period}；${m.scope}。${m.basis}。`,...(m.source?{source:m.source}:{})}));
  evidence.push({id:"M4",companyId:"country",kind:"inference",scope:"国家演示口径",text:JSON.stringify({counts:market.counts,dimensions:market.dimensions,method: presentation.countryMeta.countMethod})});
  if (companies.length !== 3 || new Set(companies.map(c => c.id)).size !== 3) throw new Error("Country brief requires exactly three distinct company dossiers");
  return structuredClone({ countryId, countryName: country.name, regionId: country.region,
    regionName: presentation.regions[country.region]!.name, asOf: presentation.countryMeta.asOf!,
    market, methodology: presentation.countryMeta, companies, evidence, draft: managementDraft });
}
export const countryBriefCatalog = Object.keys(presentation.countries).map(id => {
  const c = getCountryContext(id);
  return { id, name: c.countryName, regionId: c.regionId, companyIds: c.companies.map(x => x.id) };
});
