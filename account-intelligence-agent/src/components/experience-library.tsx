"use client";

import { ArrowUpRight, BookOpenText, BrainCircuit, Building2, Globe2, Loader2, MapPin, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface ExperienceItem {
  id: string;
  title: string;
  description: string;
  continent: string;
  country: string | null;
  customer_id: string;
  customer_name: string;
  industry: string | null;
  source_item_ids: string[];
}

interface ExperienceResponse { items: ExperienceItem[]; total: number }
interface MerchantGroup { merchant: string; customerId: string; industry: string | null; items: ExperienceItem[] }
interface CountryGroup { country: string; merchants: MerchantGroup[]; count: number }
interface ContinentGroup { continent: string; countries: CountryGroup[]; count: number }

const uniqueSorted = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));

export function ExperienceLibrary() {
  const [items, setItems] = useState<ExperienceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [continent, setContinent] = useState("ALL");
  const [country, setCountry] = useState("ALL");
  const [merchant, setMerchant] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/experiences").then((response) => {
      if (!response.ok) throw new Error("经验库加载失败");
      return response.json() as Promise<ExperienceResponse>;
    }).then((data) => { if (!cancelled) setItems(data.items); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "经验库加载失败"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const continents = useMemo(() => uniqueSorted(items.map((item) => item.continent)), [items]);
  const countries = useMemo(() => uniqueSorted(items.filter((item) => continent === "ALL" || item.continent === continent).map((item) => item.country || "地区待补充")), [items, continent]);
  const merchants = useMemo(() => uniqueSorted(items.filter((item) => (continent === "ALL" || item.continent === continent) && (country === "ALL" || (item.country || "地区待补充") === country)).map((item) => item.customer_name)), [items, continent, country]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (continent !== "ALL" && item.continent !== continent) return false;
      if (country !== "ALL" && (item.country || "地区待补充") !== country) return false;
      if (merchant !== "ALL" && item.customer_name !== merchant) return false;
      return !keyword || [item.title, item.description, item.continent, item.country, item.customer_name, item.industry].some((value) => value?.toLocaleLowerCase().includes(keyword));
    });
  }, [items, query, continent, country, merchant]);

  const groups = useMemo<ContinentGroup[]>(() => {
    const continentMap = new Map<string, Map<string, Map<string, ExperienceItem[]>>>();
    for (const item of filtered) {
      const countryName = item.country || "地区待补充";
      const countryMap = continentMap.get(item.continent) || new Map<string, Map<string, ExperienceItem[]>>();
      const merchantMap = countryMap.get(countryName) || new Map<string, ExperienceItem[]>();
      merchantMap.set(item.customer_name, [...(merchantMap.get(item.customer_name) || []), item]);
      countryMap.set(countryName, merchantMap);
      continentMap.set(item.continent, countryMap);
    }
    return [...continentMap.entries()].map(([continentName, countryMap]) => {
      const countryGroups = [...countryMap.entries()].map(([countryName, merchantMap]) => {
        const merchantGroups = [...merchantMap.entries()].map(([merchantName, experiences]) => ({ merchant: merchantName, customerId: experiences[0].customer_id, industry: experiences[0].industry, items: experiences }));
        return { country: countryName, merchants: merchantGroups, count: merchantGroups.reduce((sum, group) => sum + group.items.length, 0) };
      });
      return { continent: continentName, countries: countryGroups, count: countryGroups.reduce((sum, group) => sum + group.count, 0) };
    });
  }, [filtered]);

  const clearFilters = () => { setQuery(""); setContinent("ALL"); setCountry("ALL"); setMerchant("ALL"); };
  const filtersActive = Boolean(query || continent !== "ALL" || country !== "ALL" || merchant !== "ALL");
  const totalCountries = uniqueSorted(items.map((item) => item.country || "地区待补充")).length;
  const totalMerchants = uniqueSorted(items.map((item) => item.customer_name)).length;

  return <section className="experience-library-page">
    <header className="library-hero">
      <div><span className="library-hero-icon"><BrainCircuit /></span><div><small>EXPERIENCE INTELLIGENCE</small><h1>经验库</h1><p>汇总所有客户项目经验，按大洲、国家和商家沉淀可复用方法。</p></div></div>
      <div className="library-stats"><article><BookOpenText /><span><b>{items.length}</b><small>经验条目</small></span></article><article><Globe2 /><span><b>{continents.length}</b><small>覆盖大洲</small></span></article><article><MapPin /><span><b>{totalCountries}</b><small>覆盖国家</small></span></article><article><Building2 /><span><b>{totalMerchants}</b><small>沉淀商家</small></span></article></div>
    </header>

    <div className="library-toolbar">
      <label className="library-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索关键词、经验或商家…" aria-label="搜索经验" /></label>
      <label><span>大洲</span><select value={continent} onChange={(event) => { setContinent(event.target.value); setCountry("ALL"); setMerchant("ALL"); }}><option value="ALL">全部大洲</option>{continents.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>国家</span><select value={country} onChange={(event) => { setCountry(event.target.value); setMerchant("ALL"); }}><option value="ALL">全部国家</option>{countries.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>商家</span><select value={merchant} onChange={(event) => setMerchant(event.target.value)}><option value="ALL">全部商家</option>{merchants.map((item) => <option key={item}>{item}</option>)}</select></label>
      {filtersActive && <button type="button" onClick={clearFilters}><X />清除</button>}
    </div>

    <div className="library-body">
      {loading ? <div className="library-empty"><Loader2 className="spin" /><b>正在汇总经验库…</b></div> : error ? <div className="library-empty"><BrainCircuit /><b>{error}</b></div> : groups.length ? groups.map((continentGroup) => <section className="continent-group" key={continentGroup.continent}>
        <header><span><Globe2 /><b>{continentGroup.continent}</b></span><small>{continentGroup.count} 条经验 · {continentGroup.countries.length} 个国家/地区</small></header>
        {continentGroup.countries.map((countryGroup) => <div className="country-group" key={countryGroup.country}>
          <div className="country-heading"><span><MapPin />{countryGroup.country}</span><small>{countryGroup.count} 条</small></div>
          <div className="merchant-groups">{countryGroup.merchants.map((merchantGroup) => <section className="merchant-group" key={merchantGroup.merchant}>
            <header><span><Building2 /><b>{merchantGroup.merchant}</b><small>{merchantGroup.industry || "行业待补充"}</small></span><Link href={`/customers/${merchantGroup.customerId}`}>查看商家<ArrowUpRight /></Link></header>
            <div className="library-experience-grid">{merchantGroup.items.map((item) => <article key={item.id}><h3>{item.title}</h3><p>{item.description}</p><footer><span>{item.source_item_ids.length ? `${item.source_item_ids.length} 项来源证据` : "综合客户事实"}</span></footer></article>)}</div>
          </section>)}</div>
        </div>)}
      </section>) : <div className="library-empty"><BrainCircuit /><b>没有匹配的经验</b><span>请调整大洲、国家、商家或搜索条件</span></div>}
    </div>
  </section>;
}
