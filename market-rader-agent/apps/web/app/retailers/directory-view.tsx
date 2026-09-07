import * as React from "react";

import type { RetailerDirectoryResult, RetailerStoreObservation } from "@market-radar/infrastructure";

interface DirectoryViewProps {
  readonly directory: RetailerDirectoryResult;
  readonly regions: readonly { code: string; name: string }[];
  readonly region: string;
  readonly country: string;
  readonly query: string;
  readonly asOf: string;
}

function safeWebUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

function methodLabel(observation: RetailerStoreObservation): string {
  if (observation.synthetic) return "合成测试数据，勿用于业务决策";
  if (observation.verification_method === "auto_low_precision") return "低精度自动验证 · 需谨慎使用";
  if (observation.verification_method === "manual") return "人工验证";
  if (observation.verification_method === "primary_source") return "一手来源验证";
  if (observation.verification_method === "corroborated") return "已验证 · 保留来源依据";
  return `已验证 · ${observation.verification_method}`;
}

function Observation({ observation }: { observation: RetailerStoreObservation }): React.JSX.Element {
  const url = safeWebUrl(observation.source_url);
  return (
    <article className="retailer-observation">
      <div className="retailer-observation-head">
        <strong>{BigInt(observation.value).toLocaleString("zh-CN")} 家门店</strong>
        <span>{observation.data_as_of ?? "统计日期缺失，不用于最新门店数"}</span>
      </div>
      <p>{methodLabel(observation)} · 证据质量 {observation.evidence_quality}%</p>
      <blockquote>{observation.quote}</blockquote>
      {url !== null
        ? <a href={url} target="_blank" rel="noopener noreferrer">{observation.publisher ?? "查看原始来源"} ↗</a>
        : <span>来源链接不可用</span>}
      <div className="retailer-provenance">
        <span>证据编号：{observation.claim_id} · 版本 {observation.claim_version}</span>
        <span>来源快照：{observation.snapshot_id}</span>
        <span>原文定位：{observation.locator}</span>
      </div>
    </article>
  );
}

export function RetailerDirectoryView({ directory, regions, region, country, query, asOf }: DirectoryViewProps): React.JSX.Element {
  const evidenced = directory.items.filter((item) => item.latest_store_count !== null).length;
  return (
    <div className="retailer-directory">
      <div className="page-head">
        <div><h1 className="page-title">Retailers · 零售商</h1>
          <p className="page-sub">已收录的零售商与实际门店观测。统计日期、原文和来源可逐条核对。</p></div>
        <span className="section-count" role="status">{directory.total} 个零售商</span>
      </div>
      <form method="get" action="/retailers" className="retailer-filters" aria-label="零售商筛选">
        <label htmlFor="retailer-region">区域
          <select id="retailer-region" name="region" defaultValue={region}>
            <option value="all">全部区域</option>
            {regions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        <label htmlFor="retailer-country">国家
          <select id="retailer-country" name="country" defaultValue={country}>
            <option value="">全部国家</option>
            {directory.countries.map((item) => <option key={item.country_id} value={item.country_id}>{item.name} ({item.iso2})</option>)}
          </select>
        </label>
        <label htmlFor="retailer-query">零售商名称
          <input id="retailer-query" name="q" type="search" defaultValue={query} placeholder="搜索名称，如 OXXO、7-Eleven" maxLength={200} />
        </label>
        <button type="submit" className="btn-scan">筛选</button>
        <a href="/retailers">重置筛选</a>
      </form>
      <div className="retailer-summary">
        <span><strong>{directory.total}</strong> 个匹配零售商</span>
        <span><strong>{evidenced}</strong> 个有最新门店证据</span>
        <span>观测截止日期：{asOf}</span>
      </div>
      <p className="retailer-disclosure">此目录展示已保存的有效观测，不代表客户准入排名或某次扫描的冻结结果；不自动应用“≥500 店”门槛，也不合并名称相似的企业。缺失值不按 0 处理。</p>
      {directory.items.length === 0 ? (
        <div className="card empty-state"><h2>未找到匹配的零售商</h2><p>请调整区域、国家或名称条件；该范围也可能尚未收录零售商资料。</p><a href="/retailers?region=all">查看全部区域</a></div>
      ) : (
        <div className="card table-scroll">
          <table className="retailer-table">
            <caption className="retailer-table-caption">零售商目录 · 点击“查看证据”展开历史门店数与来源</caption>
            <thead><tr><th scope="col">零售商</th><th scope="col">国家</th><th scope="col">最新实际门店数</th><th scope="col">统计日期</th><th scope="col">来源与证据</th></tr></thead>
            <tbody>{directory.items.map((item) => {
              const website = safeWebUrl(item.website);
              const latest = item.latest_store_count;
              return (
                <tr key={item.retailer_id} data-retailer-id={item.retailer_id}>
                  <th scope="row"><strong>{item.name}</strong>{website !== null && <a className="retailer-website" href={website} target="_blank" rel="noopener noreferrer">企业网站 ↗</a>}</th>
                  <td>{item.country_name}<small>{item.country_iso2}</small></td>
                  <td>{latest !== null ? <><strong>{BigInt(latest.value).toLocaleString("zh-CN")}</strong><small>{methodLabel(latest)}</small></> : <span>{item.has_conflicting_latest_counts ? "同日数据存在差异" : "暂无有效证据"}</span>}</td>
                  <td>{latest?.data_as_of ?? "—"}</td>
                  <td>{item.observations.length > 0 ? (
                    <details className="retailer-evidence"><summary aria-label={`查看 ${item.name} 的证据`}>查看证据 · {item.observations.length} 条</summary>
                      {item.has_conflicting_latest_counts && <p className="retailer-conflict">同一最新统计日期有不同数值，保留全部证据，不擅自选择或相加。</p>}
                      {item.observations.map((observation) => <Observation key={observation.observation_id} observation={observation} />)}
                    </details>
                  ) : <span>尚无有效实际门店观测</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
