import { getCountryDetail, getRanking } from "@market-radar/infrastructure";
import type { RankingItem } from "@market-radar/infrastructure";

import { getDb } from "@/lib/db";
import { getAppContext } from "@/lib/context";
import { priorityLabel } from "@/lib/labels";
import { OverviewFilters } from "./overview-filters";
import { AskChip, AutoRefresh } from "./scan-actions";
import { BubbleChart, DetailBars, Sparkline, type BubbleCountry } from "./ui/charts";
import { COUNTRY_META, Flag } from "./ui/flags";
import { Icon, type IconName } from "./ui/icons";

export const dynamic = "force-dynamic";

const DIMENSION_LABEL: Record<string, string> = {
  market_size: "市场规模",
  growth: "市场增长",
  expansion: "连锁扩张",
  digital: "数字化水平",
  customer_value: "潜在客户密度",
  entry_ease: "进入容易度",
};

interface CountryRow extends RankingItem {
  readonly growth: number | null;
  readonly digital: number | null;
  readonly customerValue: number | null;
  readonly dimensionScores: Record<string, number | null>;
}

function priorityBadge(priority: string): string {
  if (priority === "p1") return "badge badge-p1";
  if (priority === "p2") return "badge badge-p2";
  return "badge badge-p3";
}

export default async function OverviewPage(): Promise<React.JSX.Element> {
  const context = await getAppContext();
  const db = getDb();
  const ranking =
    context.scanRunId !== null ? await getRanking(db, context.scanRunId).catch(() => null) : null;

  if (context.scanRunId === null || ranking === null || ranking.items.length === 0) {
    return (
      <>
        <OverviewFilters initialRegion={context.regionCode} />
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">
          {context.scanStatus !== null && context.scanStatus !== "completed"
            ? `扫描进行中（${context.scanStatus}），正在展示等待状态 —— Worker 处理完成后自动更新。`
            : "尚未运行扫描。点击右上角「开始扫描」生成五国机会数据。"}
        </p>
        <div className="empty-state">
          {context.scanStatus !== null && context.scanStatus !== "completed" ? (
            <>
              <Icon name="refresh" size={28} />
              <div style={{ marginTop: 8 }}>研究扫描进行中，Job 由后台 Worker 处理…</div>
              <AutoRefresh />
            </>
          ) : (
            "等待第一次扫描…"
          )}
        </div>
      </>
    );
  }

  const details = await Promise.all(
    ranking.items.map(async (item) => {
      try {
        return await getCountryDetail(db, context.scanRunId!, item.country.id);
      } catch {
        return null;
      }
    }),
  );

  const rows: CountryRow[] = ranking.items.map((item, index) => {
    const detail = details[index];
    const dimensionScores: Record<string, number | null> = {};
    for (const dimension of detail?.dimensions ?? []) {
      dimensionScores[dimension.dimension_code] = dimension.score;
    }
    return {
      ...item,
      growth: dimensionScores["growth"] ?? null,
      digital: dimensionScores["digital"] ?? null,
      customerValue: dimensionScores["customer_value"] ?? null,
      dimensionScores,
    };
  });

  const ranked = rows.filter((row) => row.rank !== null);
  const top = ranked[0];

  const bubbles: BubbleCountry[] = rows.map((row) => ({
    code: row.country.iso2,
    name: COUNTRY_META[row.country.id]?.name ?? row.country.name,
    opportunity: row.opportunity_score,
    x: row.entry_difficulty ?? 50,
    y: row.market_attractiveness ?? 50,
    color: COUNTRY_META[row.country.id]?.color ?? "#3b82f6",
    provisional: row.result_status !== "published",
    href: `/countries/${row.country.id}`,
  }));

  const highPotential = rows.filter((row) => row.result_status === "published").length;
  const avgOpp = ranked.length > 0
    ? Math.round((ranked.reduce((sum, row) => sum + (row.opportunity_score ?? 0), 0) / ranked.length) * 100) / 100
    : null;
  const maximumCoverage = rows.length > 0
    ? Math.max(...rows.map((row) => row.coverage))
    : 0;
  const avgEqi = rows.length > 0
    ? Math.round((rows.reduce((sum, row) => sum + row.evidence_quality_index, 0) / rows.length) * 100) / 100
    : 0;

  const kpis: Array<{
    id: string;
    label: string;
    value: string;
    valueColor?: string;
    delta: string;
    icon: IconName;
    iconBg: string;
    iconColor: string;
    spark: { type: "bars" | "area" | "line"; values: number[]; color: string } | null;
  }> = [
    {
      id: "countries",
      label: "高潜国家",
      value: String(highPotential),
      delta: `共 ${rows.length} 个国家在扫描范围`,
      icon: "globe",
      iconBg: "#e8f1fe",
      iconColor: "#3b82f6",
      spark: {
        type: "bars",
        color: "#5b8def",
        values: rows.flatMap((row) => row.opportunity_score === null ? [] : [row.opportunity_score]),
      },
    },
    {
      id: "opportunity",
      label: "综合机会指数",
      value: top !== undefined ? String(top.opportunity_score ?? "—") : "—",
      delta: `五国平均 ${avgOpp ?? "—"}`,
      icon: "radar",
      iconBg: "#e7f8f0",
      iconColor: "#10b981",
      spark: {
        type: "area",
        color: "#22c38e",
        values: ranked.flatMap((row) => row.opportunity_score === null ? [] : [row.opportunity_score]).reverse(),
      },
    },
    {
      id: "confidence",
      label: "数据可信度",
      value: `${avgEqi}%`,
      delta: `五国平均 EQI（${context.resultProvider === "pi-agent" ? "正式研究数据" : "合成数据"}）`,
      icon: "shield",
      iconBg: "#f0ebfe",
      iconColor: "#8b5cf6",
      spark: { type: "line", color: "#8b5cf6", values: rows.map((row) => row.evidence_quality_index).reverse() },
    },
    {
      id: "priority",
      label: "建议优先级",
      value: priorityLabel(top?.priority),
      valueColor: "#f59e0b",
      delta: `${top !== undefined ? COUNTRY_META[top.country.id]?.name ?? top.country.name : "—"} 为当前 Top 1`,
      icon: "target",
      iconBg: "#f2f4f8",
      iconColor: "#8a94a6",
      spark: null,
    },
  ];

  const insightBullets =
    top !== undefined
      ? [
          `市场吸引力 ${top.market_attractiveness ?? "—"} / 进入难度 ${top.entry_difficulty ?? "—"}`,
          `证据覆盖率 ${top.coverage}%，证据质量 EQI ${top.evidence_quality_index}%`,
          `排名稳定性 ${top.rank_stability}，建议优先级 ${priorityLabel(top.priority)}`,
          `共 ${top.addressable_store_base ?? "—"} 家可触达门店（基于 Verified Claim）`,
        ]
      : [];

  const topBars =
    top !== undefined
      ? Object.entries(DIMENSION_LABEL).map(([code, label]) => {
          const value = top.dimensionScores[code] ?? null;
          return code === "entry_ease"
            ? { label, value, color: "#f2a93b" }
            : { label, value };
        })
      : [];

  return (
    <>
      <OverviewFilters initialRegion={context.regionCode} />

      {ranked.length === 0 && context.resultProvider === "pi-agent" && (
        <div className="quality-gate-notice" role="status">
          <Icon name="info" size={16} />
          <span>
            暂不生成机会评分：真实证据最高覆盖率仅 {maximumCoverage}%，低于当前总体评分门槛 60%。
            缺失值不会按 0 计算；请继续运行 Pi 扫描补充证据。
          </span>
        </div>
      )}

      {/* KPI */}
      <section className="kpis">
        {kpis.map((kpi) => (
          <div className="kpi" key={kpi.id}>
            <span className="kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              <Icon name={kpi.icon} size={19} />
            </span>
            <div className="kpi-main">
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value" style={kpi.valueColor !== undefined ? { color: kpi.valueColor } : undefined}>
                {kpi.value}
              </div>
              <div className="kpi-delta delta-flat">{kpi.delta}</div>
            </div>
            {kpi.spark !== null && (
              <span className="kpi-spark">
                <Sparkline spec={kpi.spark} uid={kpi.id} />
              </span>
            )}
          </div>
        ))}
      </section>

      <div className="grid-main">
        {/* 气泡图 */}
        <section className="card bubble-card">
          <div className="card-title">
            市场吸引力 × 进入难度 <Icon name="info" size={14} className="ic-muted" />
          </div>
          <div className="bubble-wrap">
            <BubbleChart countries={bubbles} />
          </div>
          <div className="card-note center">气泡大小代表机会指数 · 虚线半透明 = 非正式结果</div>
        </section>

        {/* 排行表 */}
        <section className="card ranking-card">
          <div className="card-title">国家机会排行</div>
          <table className="rank-table">
            <thead>
              <tr>
                <th>国家</th>
                <th>机会指数</th>
                <th>增长</th>
                <th>数字化</th>
                <th>客户价值</th>
                <th>进入难度</th>
                <th>建议</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                .map((row) => (
                  <tr key={row.country.id}>
                    <td>
                      <div className="cell-country">
                        <Flag code={row.country.iso2} />
                        <a href={`/countries/${row.country.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {COUNTRY_META[row.country.id]?.name ?? row.country.name}
                        </a>
                      </div>
                    </td>
                    <td className="num num-opp">{row.opportunity_score ?? "—"}</td>
                    <td className="num num-growth">{row.growth ?? "—"}</td>
                    <td className="num num-digital">{row.digital ?? "—"}</td>
                    <td className="num num-customer">{row.customerValue ?? "—"}</td>
                    <td className="num num-diff">{row.entry_difficulty ?? "—"}</td>
                    <td>
                      <span className={priorityBadge(row.priority)}>{priorityLabel(row.priority)}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="card-note">
            * 指数范围 0-100，分数越高代表机会越大；Blocked / Insufficient 国家不参与正式排名 · 数据截至{" "}
            {context.dataAsOf ?? "—"}（{context.resultProvider === "pi-agent" ? "正式研究数据" : "合成数据"}）
          </div>
        </section>

        {/* AI Agent 洞察 */}
        <section className="card agent-card">
          <div className="card-title">
            <span className="agent-title">
              <Icon name="sparkles" size={16} className="ic-primary" />
              AI Agent 洞察
            </span>
          </div>
          <div className="chat">
            <div className="msg-user-row">
              <span className="msg-user">{top !== undefined ? `为什么${COUNTRY_META[top.country.id]?.name ?? top.country.name}排名第一?` : "暂无数据"}</span>
            </div>
            <div className="msg-ai">
              <span className="ai-avatar">
                <Icon name="robot" size={13} />
              </span>
              <div className="ai-card">
                <ul>
                  {insightBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="chips">
              <AskChip message="查看排名">查看完整排名</AskChip>
              {top !== undefined && (
                <AskChip message={`比较${COUNTRY_META[top.country.id]?.name ?? top.country.name}和泰国`}>
                  比较第一名与泰国
                </AskChip>
              )}
              <AskChip message="越南的证据">查看证据链</AskChip>
            </div>
          </div>

          {top !== undefined && (
            <div className="detail">
              <div className="detail-head">
                <span className="detail-title">
                  <i className="dot" />
                  {COUNTRY_META[top.country.id]?.name ?? top.country.name}详情
                </span>
                <a className="detail-link" href={`/countries/${top.country.id}`}>
                  查看报告 <Icon name="external" size={11} />
                </a>
              </div>
              <div className="detail-bars">
                <DetailBars bars={topBars} />
              </div>
              <div className="detail-banner">
                综合机会 {top.opportunity_score ?? "—"} / 100，建议优先级 {priorityLabel(top.priority)}（
                {top.result_status}）
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
