import Link from "next/link";

import { getRanking } from "@market-radar/infrastructure";

import { getDb } from "@/lib/db";
import { getAppContext } from "@/lib/context";
import { priorityLabel } from "@/lib/labels";
import { COUNTRY_META, Flag } from "../ui/flags";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  published: "badge-status badge-published",
  provisional: "badge-status badge-provisional",
  blocked: "badge-status badge-blocked",
  insufficient_evidence: "badge-status badge-insufficient_evidence",
};

const PRIORITY_CLASS: Record<string, string> = {
  p1: "badge badge-p1",
  p2: "badge badge-p2",
  p3: "badge badge-p3",
};

export default async function CountriesPage(): Promise<React.JSX.Element> {
  const context = await getAppContext();
  if (!context.scanRunId) {
    return (
      <>
        <h1 className="page-title">Countries</h1>
        <p className="page-sub">尚未运行扫描，请先在 Overview 点击「开始扫描」。</p>
        <div className="empty-state">等待扫描数据…</div>
      </>
    );
  }
  const ranking = await getRanking(getDb(), context.scanRunId);
  return (
    <>
      <h1 className="page-title">Countries</h1>
      <p className="page-sub">
        当前区域五国机会概览 · {context.scenarioName ?? context.regionCode}（数据截至 {context.dataAsOf ?? "—"}，
        {context.resultProvider === "pi-agent" ? "正式研究数据" : "合成数据"}）
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>国家</th>
            <th>机会指数</th>
            <th>进入难度</th>
            <th>覆盖率</th>
            <th>EQI</th>
            <th>建议</th>
            <th>稳定性</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {ranking.items
            .slice()
            .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
            .map((item) => (
              <tr key={item.country.id}>
                <td>{item.rank ?? "—"}</td>
                <td>
                  <div className="cell-country">
                    <Flag code={item.country.iso2} />
                    <Link href={`/countries/${item.country.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                      {COUNTRY_META[item.country.id]?.name ?? item.country.name}
                    </Link>
                  </div>
                </td>
                <td className="num num-opp">{item.opportunity_score ?? "—"}</td>
                <td className="num num-diff">{item.entry_difficulty ?? "—"}</td>
                <td>{item.coverage}%</td>
                <td>{item.evidence_quality_index}%</td>
                <td>
                  <span className={PRIORITY_CLASS[item.priority] ?? "badge badge-p3"}>
                    {priorityLabel(item.priority)}
                  </span>
                </td>
                <td className="muted small">{item.rank_stability}</td>
                <td>
                  <span className={STATUS_CLASS[item.result_status] ?? "badge-status"}>
                    {item.result_status}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
