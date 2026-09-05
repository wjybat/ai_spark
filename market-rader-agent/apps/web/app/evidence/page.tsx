import { getReviewQueue, queryVerifiedClaims } from "@market-radar/infrastructure";

import { getAppContext } from "@/lib/context";
import { getDb } from "@/lib/db";
import { COUNTRY_META, Flag } from "../ui/flags";
import { Icon, type IconName } from "../ui/icons";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

function displayValue(item: { numeric_value: string | null; text_value: string | null; unit?: string | null }): string {
  const value = item.numeric_value ?? item.text_value ?? "—";
  return item.unit !== null && item.unit !== undefined && item.unit !== "dimensionless"
    ? `${value} ${item.unit}`
    : value;
}

export default async function EvidencePage(): Promise<React.JSX.Element> {
  const db = getDb();
  const context = await getAppContext();
  const [queue, claims] = await Promise.all([
    getReviewQueue(db, { countryIds: context.countryIds }),
    queryVerifiedClaims(db, { countryIds: context.countryIds, limit: 500 }),
  ]);
  const countries = new Set(claims.map((claim) => claim.country_id)).size;
  const publishers = new Set(claims.map((claim) => claim.publisher).filter(Boolean)).size;
  const reviewCountries = new Set(queue.map((item) => item.country_id)).size;

  const stats: ReadonlyArray<{
    label: string;
    value: string;
    note: string;
    icon: IconName;
    iconClass: string;
  }> = [
    {
      label: "Verified Claims",
      value: String(claims.length),
      note: "当前有效可信声明",
      icon: "shield",
      iconClass: "task-stat-green",
    },
    {
      label: "待人工审核",
      value: String(queue.length),
      note: queue.length > 0 ? `涉及 ${reviewCountries} 个国家` : "审核队列已清空",
      icon: "task",
      iconClass: queue.length > 0 ? "task-stat-orange" : "task-stat-green",
    },
    {
      label: "国家覆盖",
      value: `${countries}/5`,
      note: context.scenarioName ?? "当前区域目标市场",
      icon: "globe",
      iconClass: "task-stat-blue",
    },
    {
      label: "发布机构",
      value: String(publishers),
      note: "去重后的证据发布方",
      icon: "database",
      iconClass: "task-stat-purple",
    },
  ];

  return (
    <div className="evidence-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Sources &amp; Evidence</h1>
          <p className="page-sub">
            查看 Verified Claim 血缘与候选证据；当前采用高召回低精度策略，语义警告会自动准入并保留审计标记。
          </p>
        </div>
        <span className={queue.length > 0 ? "run-state run-state-active" : "run-state run-state-idle"}>
          <i /> {queue.length > 0 ? `${queue.length} 项待审核` : "证据队列正常"}
        </span>
      </div>

      <section className="task-stats">
        {stats.map((stat) => (
          <div className="task-stat" key={stat.label}>
            <span className={`task-stat-icon ${stat.iconClass}`}>
              <Icon name={stat.icon} size={18} />
            </span>
            <div>
              <div className="task-stat-label">{stat.label}</div>
              <div className="task-stat-value">{stat.value}</div>
              <div className="task-stat-note">{stat.note}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card evidence-review-card">
        <div className="task-section-head">
          <div>
            <div className="card-title">人工审核队列</div>
            <div className="task-section-sub">review_required · 审核决定采用 Candidate Hash 乐观锁</div>
          </div>
          <span className={queue.length > 0 ? "section-count section-count-warn" : "section-count"}>
            {queue.length} Pending
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="review-empty">
            <span className="review-empty-icon"><Icon name="shield" size={25} /></span>
            <div>
              <strong>审核队列已清空</strong>
              <p>当前没有遗留的人工审核项。新扫描默认自动准入带语义警告的 Candidate，不再要求人工处理。</p>
            </div>
          </div>
        ) : (
          <div className="review-list">
            {queue.map((item) => {
              const iso2 = item.country_id.replace("cty_", "").toUpperCase();
              return (
                <article className="review-item" key={item.candidate_id}>
                  <div className="review-item-main">
                    <div className="review-item-head">
                      <span className="cell-country">
                        <Flag code={iso2} />
                        {COUNTRY_META[item.country_id]?.name ?? iso2}
                      </span>
                      <code className="topic-code">{item.predicate_code}</code>
                      <span className="badge-status badge-researching">manual review</span>
                    </div>
                    <blockquote>&ldquo;{item.quote_text}&rdquo;</blockquote>
                    <div className="review-meta">
                      <span><Icon name="database" size={12} /> {item.publisher ?? "未知发布方"}</span>
                      <span>{item.source_type ?? "unknown source"}</span>
                      <span>Observed {item.observed_at ?? "—"}</span>
                    </div>
                  </div>
                  <div className="review-value">
                    <span>候选值</span>
                    <strong>{displayValue(item)}</strong>
                  </div>
                  <div className="review-validation">
                    <span>触发原因</span>
                    <p>{item.validation_errors.join(" · ") || "requires manual review"}</p>
                  </div>
                  <ReviewActions candidateId={item.candidate_id} candidateHash={item.candidate_hash} />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card task-section">
        <div className="task-section-head">
          <div>
            <div className="card-title">Verified Claims</div>
            <div className="task-section-sub">最新可信声明、来源机构与原文引用（展示最近 30 条）</div>
          </div>
          <span className="section-count">{claims.length} Active</span>
        </div>
        <div className="table-scroll">
          <table className="data-table evidence-table">
            <thead>
              <tr>
                <th>国家</th>
                <th>Predicate</th>
                <th>值</th>
                <th>原文与来源</th>
                <th>观测日期</th>
                <th>验证状态</th>
              </tr>
            </thead>
            <tbody>
              {claims.slice(0, 30).map((claim) => {
                const iso2 = claim.country_id.replace("cty_", "").toUpperCase();
                return (
                  <tr key={claim.claim_id}>
                    <td>
                      <div className="cell-country">
                        <Flag code={iso2} />
                        <span>{COUNTRY_META[claim.country_id]?.name ?? iso2}</span>
                      </div>
                    </td>
                    <td><code className="predicate-code">{claim.predicate_code}</code></td>
                    <td className="evidence-value">{displayValue(claim)}</td>
                    <td>
                      <div className="evidence-quote">&ldquo;{claim.quote_text}&rdquo;</div>
                      <div className="evidence-source">{claim.publisher ?? "未知发布方"} · {claim.source_type ?? "unknown"}</div>
                    </td>
                    <td className="muted task-nowrap">{claim.observed_at ?? "—"}</td>
                    <td>
                      <span className={claim.verification_method === "auto_low_precision"
                        ? "badge-status badge-provisional"
                        : "badge-status badge-published"}>
                        {claim.verification_method === "auto_low_precision" ? "low_precision" : claim.verification_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {claims.length === 0 && (
                <tr><td colSpan={6} className="empty-table-cell">暂无 Verified Claim</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {claims.length > 30 && <div className="evidence-table-note">已展示最近 30 / {claims.length} 条，完整血缘可在国家详情的 Why 面板查看。</div>}
      </section>
    </div>
  );
}
