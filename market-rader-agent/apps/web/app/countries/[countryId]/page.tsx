import { explainMetric, getCountryDetail } from "@market-radar/infrastructure";

import { getDb } from "@/lib/db";
import { getAppContext } from "@/lib/context";
import { priorityLabel } from "@/lib/labels";
import { DetailBars } from "../../ui/charts";
import { COUNTRY_META, Flag } from "../../ui/flags";
import { Icon } from "../../ui/icons";

const PRIORITY_CLASS: Record<string, string> = {
  p1: "badge badge-p1",
  p2: "badge badge-p2",
  p3: "badge badge-p3",
};

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  published: "badge-status badge-published",
  provisional: "badge-status badge-provisional",
  blocked: "badge-status badge-blocked",
  insufficient_evidence: "badge-status badge-insufficient_evidence",
};

const DIMENSION_LABEL: Record<string, string> = {
  market_size: "市场规模",
  growth: "市场增长",
  expansion: "连锁扩张",
  digital: "数字化水平",
  customer_value: "潜在客户密度",
  entry_ease: "进入容易度",
};

export default async function CountryDetailPage({
  params,
}: {
  params: Promise<{ countryId: string }>;
}): Promise<React.JSX.Element> {
  const { countryId } = await params;
  const context = await getAppContext();
  if (!context.scanRunId) {
    return (
      <>
        <a className="back-link" href="/">← Overview</a>
        <h1 className="page-title">Country Detail</h1>
        <p className="page-sub">尚未运行扫描。</p>
      </>
    );
  }

  const db = getDb();
  const detail = await getCountryDetail(db, context.scanRunId, countryId);
  const explanations = await Promise.all(
    detail.metrics.map((metric) => explainMetric(db, metric.metric_value_id).catch(() => null)),
  );
  const explanationByMetric = new Map(
    explanations.filter((entry) => entry !== null).map((entry) => [entry.metric_value_id, entry]),
  );
  const meta = COUNTRY_META[detail.country.id];

  return (
    <>
      <a className="back-link" href="/">
        ← Overview
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Flag code={detail.country.iso2} />
        <h1 className="page-title" style={{ margin: 0 }}>
          {meta?.name ?? detail.country.name}
        </h1>
        <span className={STATUS_CLASS[detail.result_status] ?? "badge-status"}>{detail.result_status}</span>
        <span className={PRIORITY_CLASS[detail.priority] ?? "badge badge-p3"}>{priorityLabel(detail.priority)}</span>
      </div>
      <p className="page-sub">
        Rank {detail.rank ?? "—"} · 稳定性 {detail.rank_stability} · 数据截至 {detail.data_as_of ?? "—"} ·
        <span className="muted">
          {context.resultProvider === "pi-agent" ? " 正式研究数据" : " 合成数据"}
        </span>
      </p>

      {detail.blockers.length > 0 && (
        <div
          className="card"
          style={{ borderColor: "#f5b9b9", background: "#fdf3f3", marginBottom: 14, color: "#c53030" }}
        >
          <strong>
            <Icon name="shield" size={14} /> Hard Blocker
          </strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {detail.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid-kpi">
        {[
          { label: "综合机会", value: detail.opportunity_score ?? "—" },
          { label: "市场吸引力", value: detail.market_attractiveness ?? "—" },
          { label: "进入难度", value: detail.entry_difficulty ?? "—" },
          { label: "证据覆盖率", value: `${detail.coverage}%` },
          { label: "证据质量 EQI", value: `${detail.evidence_quality_index}%` },
        ].map((kpi) => (
          <div className="card" key={kpi.label}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="card" id="score-breakdown" style={{ marginBottom: 14 }}>
        <div className="card-title">六维度评分拆解</div>
        <div style={{ marginTop: 10 }}>
          <DetailBars
            bars={detail.dimensions.map((dimension) => {
              const entry = {
                label: DIMENSION_LABEL[dimension.dimension_code] ?? dimension.dimension_code,
                value: dimension.score,
              };
              return dimension.dimension_code === "entry_ease"
                ? { ...entry, color: "#f2a93b" }
                : entry;
            })}
          />
        </div>
        <table className="score-breakdown-table">
          <thead>
            <tr>
              <th>维度</th>
              <th>维度分</th>
              <th>综合权重</th>
              <th>分数贡献</th>
              <th>证据覆盖率</th>
            </tr>
          </thead>
          <tbody>
            {detail.dimensions.map((dimension) => (
              <tr key={dimension.dimension_code}>
                <td>{DIMENSION_LABEL[dimension.dimension_code] ?? dimension.dimension_code}</td>
                <td>{dimension.score ?? "—"}</td>
                <td>{dimension.weight}%</td>
                <td>{dimension.contribution ?? "—"}</td>
                <td>{dimension.coverage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-note">
          综合机会分 = 各维度“分数贡献”之和。维度分来自可用原始指标归一化后的加权结果；100 分表示达到归一化上限，不代表原始值为 100。
        </div>
      </div>

      <div className="card" id="raw-indicators">
        <div className="card-title">Raw Indicators（{detail.metrics.length}）</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>指标</th>
              <th>维度</th>
              <th>原始值</th>
              <th>归一化</th>
              <th>覆盖率</th>
              <th>EQI</th>
              <th>状态</th>
              <th>证据（Why）</th>
            </tr>
          </thead>
          <tbody>
            {detail.metrics.map((metric) => {
              const explanation = explanationByMetric.get(metric.metric_value_id);
              const rawValue = metric.raw_value as { value?: number | string; level?: string } | null;
              return (
                <tr key={metric.metric_value_id}>
                  <td style={{ fontWeight: 600 }}>{metric.metric_name}</td>
                  <td className="muted small">{DIMENSION_LABEL[metric.dimension_code] ?? metric.dimension_code}</td>
                  <td>{rawValue?.value ?? rawValue?.level ?? "—"}</td>
                  <td>{metric.normalized_value ?? "—"}</td>
                  <td>{metric.coverage}%</td>
                  <td>{metric.evidence_quality_index}%</td>
                  <td className="muted small">{metric.status}</td>
                  <td>
                    {metric.claim_ids.length > 0 ? (
                      <details className="why">
                        <summary>Why（{metric.claim_ids.length} 条 Claim）</summary>
                        <div className="small">
                          <p className="muted" style={{ margin: "8px 0 4px" }}>
                            聚合：{explanation?.aggregation_method ?? "—"} · 计算版本：
                            {explanation?.calculation_version ?? "—"} · 归一化：
                            {explanation?.normalization_method ?? "—"} · 来源质量 {metric.source_quality}% ·
                            新鲜度 {metric.freshness}% · 一致性 {metric.consistency}% · 独立性 {metric.independence}%
                          </p>
                          {(explanation?.claims ?? []).map((claim) => (
                            <div key={claim.claim_id} className="quote">
                              <div>&ldquo;{claim.quote_text}&rdquo;</div>
                              <div className="small muted">
                                {claim.publisher} · {claim.source_type} · {claim.observed_at ?? "—"} · {claim.claim_id}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <span className="muted">无证据</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="card-note">
          所有数字读取已保存的 Metric/Score 记录；缺失数据显示为 —，不会静默补零。
        </div>
      </div>
    </>
  );
}
