import { getMarketRegions, getRetailerDirectory } from "@market-radar/infrastructure";
import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import { DEFAULT_REGION_CODE, parseRegionCode, REGION_COOKIE } from "@/lib/regions";
import { RetailerDirectoryView } from "./directory-view";
import "./retailers.css";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
function single(value: SearchParams[string]): string {
  return typeof value === "string" ? value : "";
}

export default async function RetailersPage({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<React.JSX.Element> {
  const params = await searchParams;
  const cookieStore = await cookies();
  const requestedRegion = single(params.region);
  const region = requestedRegion === "all" ? "all" : parseRegionCode(requestedRegion)
    ?? parseRegionCode(cookieStore.get(REGION_COOKIE)?.value) ?? DEFAULT_REGION_CODE;
  const regions = await getMarketRegions();
  const countryIds = regions.filter((item) => region === "all" || item.code === region)
    .flatMap((item) => item.country_scope.map((iso2) => `cty_${iso2.toLowerCase()}`));
  // Region changes must not keep a country from the previous region selected.
  const requestedCountry = single(params.country);
  const country = countryIds.includes(requestedCountry) ? requestedCountry : "";
  const query = single(params.q).trim().slice(0, 200);
  const asOf = new Date().toISOString().slice(0, 10);
  const directory = await getRetailerDirectory(getDb(), { countryIds, countryId: country, query, asOf });
  return <RetailerDirectoryView directory={directory} regions={regions.map((item) => ({ code: item.code, name: item.name_zh }))}
    region={region} country={country} query={query} asOf={asOf} />;
}
