// Completed report views read one PipelineOutput; collected research remains available before a run.
function reportList(value) { return Array.isArray(value) ? value : []; }
function reportText(value) { return value == null || value === "" ? "未返回，待确认" : String(value); }
function reportLevel(value) { return ({ high: "高", medium: "中", low: "低", watch: "观察", positive: "积极", neutral: "中性", risk: "风险", unknown: "待确认" })[value] || reportText(value); }
function reportSourceUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function reportMode(report) {
  return report.mode === "live" ? "实时智能分析" : "演示分析";
}
function materialSourceLabel(generation) {
  if (generation?.source === "llm") return "智能生成";
  if (generation?.source === "rules") return "演示分析";
  return "历史结果 · 未记录生成来源";
}
function reportGenerationNote(report) {
  return report.productMatch?.generation?.source === "llm" && report.researchBrief?.outreachEmail?.generation?.source === "llm"
    ? "能力匹配和英文开发邮件由智能体结合证据生成；其余内容来自结构化分析。所有建议与邮件均需人工审核。"
    : "各模块生成方式以来源标记为准；建议与邮件均需人工审核。";
}
function reportScope(report, country) {
  return `报告国家：${country.name}；区域市场资料范围：${reportText(report.marketRadar?.regionName)}；当前潜在客户样本：${reportText(report.customerProfile?.name)}。国家报告可在后续客户发现阶段继续扩充企业名单。`;
}
function countryReportNarrative(content) {
  return reportText(content).replace(/^\s*#{1,3}\s+([^\n]+)\n?/, "**$1**\n\n");
}

function ReportText({ value, className = "" }) {
  return <MarkdownContent className={className} content={reportText(value)}></MarkdownContent>;
}
function ReportList({ items, ordered = false }) {
  const entries = reportList(items);
  if (!entries.length) return <p className="report-empty">本次结果未返回条目，待确认。</p>;
  const Tag = ordered ? "ol" : "ul";
  return <Tag className="report-list">{entries.map((item, index) => <li key={index}><ReportText value={item}></ReportText></li>)}</Tag>;
}
function ReportSection({ title, meta, children, className = "" }) {
  return <section className={`report-section ${className}`}><div className="section-heading"><span>{title}</span>{meta && <small>{meta}</small>}</div>{children}</section>;
}
function ReportEvidenceRefs({ ids, report }) {
  const records = reportList(report.evidenceChain?.records);
  return <div className="report-evidence-refs" aria-label="依据索引">{reportList(ids).map((id) => {
    const record = records.find(item => item.id === id);
    const url = reportSourceUrl(record?.sourceUrl);
    return url ? <a key={id} href={url} target="_blank" rel="noopener noreferrer" title={record.title}>{id} · {record.sourceLevel}级 ↗</a>
      : <span key={id} title="本客户证据链未返回此条详情">{id} · 详情未返回</span>;
  })}</div>;
}
function ReportEvidence({ report }) {
  const chain = report.evidenceChain || {};
  return <details className="report-disclosure"><summary>证据与信息缺口 · {reportList(chain.records).length} 条来源记录</summary>
    <div className="report-stack">{reportList(chain.records).map(record => <article className="report-card" key={record.id}>
      <div className="report-card-heading"><strong>{record.title}</strong><span className="report-badge">{record.sourceLevel}级 · {record.kind === "fact" ? "事实" : "推断"}</span></div>
      <ReportText value={record.excerpt}></ReportText>
      <small>{record.id} · 发布 {record.publishedAt} · 采集 {record.retrievedAt} · 置信度 {reportLevel(record.confidence)}</small>
      {reportSourceUrl(record.sourceUrl) && <a className="report-source-link" href={reportSourceUrl(record.sourceUrl)} target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a>}
    </article>)}</div>
    <ReportSection title="尚缺证据"><ReportList items={chain.missingEvidence}></ReportList></ReportSection>
  </details>;
}

function ReportMarket({ report }) {
  const market = report.marketRadar || {};
  return <>
    <ReportSection title={`${reportText(market.regionName)} · 市场研判`} meta={`区域热度：${reportLevel(market.heat)}`}>
      <div className="report-hero"><div><ReportText value={market.summary}></ReportText><p className="report-note">区域机会参考分，不是当前国家评分或成交概率。</p></div><div className="report-score">{reportText(market.opportunityScore)}<small>/ 100</small></div></div>
      <div className="report-grid">{reportList(market.dimensions).map((item, index) => <article className="report-card" key={index}><div className="report-card-heading"><strong>{item.name}</strong><span className="report-badge">{item.score} / 100</span></div><ReportText value={item.explanation}></ReportText></article>)}</div>
      <div className="report-field"><b>建议关注国家</b><ReportText value={reportList(market.recommendedCountries).join(" · ")}></ReportText></div>
      <div className="report-field"><b>区域客户池</b><span>{reportText(market.customerCount)} 家</span></div>
      <ReportText className="report-note" value={market.caveat}></ReportText>
      <ReportEvidenceRefs ids={market.evidenceIds} report={report}></ReportEvidenceRefs>
    </ReportSection>
    <ReportSection title="客户商机信号" meta="事实摘要与商机推断分层">
      <div className="report-stack">{reportList(report.opportunitySignals).map(signal => <article className="report-card" key={signal.id}>
        <div className="report-card-heading"><strong>{signal.title}</strong><span className="report-badge">信号强度 · {reportLevel(signal.strength)}</span></div>
        <div className="report-field"><b>信号摘要</b><ReportText value={signal.summary}></ReportText></div>
        <div className="report-field"><b>推断 / 待验证</b><ReportText value={signal.interpretation}></ReportText></div>
        <div className="report-field"><b>切入方向</b><ReportText value={signal.direction}></ReportText></div>
        <ReportEvidenceRefs ids={signal.evidenceIds} report={report}></ReportEvidenceRefs>
      </article>)}</div>
      {!reportList(report.opportunitySignals).length && <p className="report-empty">本次结果未返回商机信号，待确认。</p>}
    </ReportSection>
    <ReportEvidence report={report}></ReportEvidence>
  </>;
}

function ReportCustomers({ report, country, onSelectCustomer }) {
  const pool = report.customerPool || {};
  const profile = report.customerProfile || {};
  const analyzedCustomers = reportList(pool.customers).filter(customer => customer.customerId === report.customerId);
  const candidates = reportList(country?.customers).filter(customer => customer.selectable === false).slice(0, Math.max(0, 3 - analyzedCustomers.length));
  const enterProfile = (customer = {}) => onSelectCustomer?.({
    customerId: report.customerId, name: profile.name, type: reportList(profile.formats).join(" / "), stores: profile.storeCountLabel,
    sourceLevel: `${report.evidenceChain?.coverage?.sourceLevelA || 0} A级`, ...customer,
  });
  return <>
    <ReportSection title="客户池" meta={`${analyzedCustomers.length + candidates.length} 家客户资料`}>
      <ReportText className="report-note" value={`排序依据：${reportList(pool.rankingBasis).join(" · ") || "未返回，待确认"}`}></ReportText>
      <div className="report-stack">{analyzedCustomers.map((customer, index) => <button type="button" className="report-disclosure report-customer-entry" data-customer-entry={customer.customerId} key={customer.customerId} onClick={() => enterProfile(customer)}>
        <div className="report-customer-entry-head"><strong>{index + 1}. {customer.name} · 本次研究客户</strong><span className="report-badge">参考分 {customer.poolScore}</span></div>
        <div className="report-field"><b>总部 / 业态</b><ReportText value={`${customer.country} · ${reportList(customer.formats).join(" / ")}`}></ReportText></div>
        <div className="report-field"><b>集团规模</b><ReportText value={customer.storeCountLabel}></ReportText></div>
        <div className="report-field"><b>集团收入</b><ReportText value={customer.revenueLabel}></ReportText></div>
        <ReportText value={customer.reason}></ReportText><ReportList items={customer.digitalFoundation}></ReportList>
        <div className="customer-card-action"><span>进入客户作战视图</span><small>概览 · 系统 · 动态 · 建议</small><Icon name="arrow" size={15}></Icon></div>
      </button>)}{candidates.map((customer, index) => <CandidateCustomerCard key={customer.name} customer={customer} index={analyzedCustomers.length + index}></CandidateCustomerCard>)}</div>
      {!analyzedCustomers.length && <><p className="report-empty">本次结果未返回该国家的已分析客户，当前研究客户仍可单独查看。</p><button type="button" className="report-profile-entry" data-customer-entry={report.customerId} onClick={() => enterProfile()}><Icon name="users" size={17}></Icon><span><strong>{profile.name}</strong><small>查看本次研究客户的完整资料</small></span><Icon name="arrow" size={15}></Icon></button></>}
    </ReportSection>
  </>;
}

function ReportSales({ report }) {
  const brief = report.researchBrief || {};
  return <>
    <ReportSection title="销售跟进建议" meta="按本次结果排序，不预置时间表"><ReportList items={brief.nextActions} ordered></ReportList></ReportSection>
    <ReportSection title="建议切入点"><ReportList items={brief.recommendedEntryPoints}></ReportList></ReportSection>
    <ReportSection title="优先联系角色" meta="需核验具体联系人"><ReportList items={report.customerProfile?.decisionRoles}></ReportList></ReportSection>
    <ReportSection title="首次拜访问题"><ReportList items={brief.firstMeetingQuestions} ordered></ReportList></ReportSection>
    <ReportSection title="英文开发邮件" meta="待销售审核，未发送" className="report-email">
      <p className="report-note">{materialSourceLabel(brief.outreachEmail?.generation)}</p>
      <div className="report-field"><b>Subject</b><ReportText value={brief.outreachEmail?.subject}></ReportText></div>
      <ReportText value={brief.outreachEmail?.body}></ReportText>
      {brief.outreachEmail?.angle && <div className="report-field"><b>写作依据</b><ReportText value={brief.outreachEmail.angle}></ReportText></div>}
      <ReportEvidenceRefs ids={brief.outreachEmail?.evidenceIds} report={report}></ReportEvidenceRefs>
    </ReportSection>
    <ReportSection title="内部协同行动"><ReportList items={brief.internalActions}></ReportList></ReportSection>
    <ReportEvidenceRefs ids={brief.evidenceIds} report={report}></ReportEvidenceRefs>
  </>;
}

function ReportBattle({ report }) {
  const profile = report.customerProfile || {};
  const admission = report.admission || {};
  const match = report.productMatch || {};
  const risks = report.riskAssessment || {};
  return <>
    <div className="report-hero"><div><small>客户作战卡 · 集团口径</small><h2>{reportText(profile.name)}</h2><ReportText value={profile.storeCountLabel}></ReportText><ReportText value={profile.revenueLabel}></ReportText></div><span className="report-badge">{reportText(admission.label)} · {reportText(admission.referenceScore)} 分</span></div>
    <ReportSection title="准入评估" meta="参考判断，不是成交承诺">
      <ReportText value={admission.rationale}></ReportText>
      <div className="report-grid">{reportList(admission.dimensions).map((item, index) => <article className="report-card" key={index}><div className="report-card-heading"><b>{item.name}</b><span className="report-badge">{reportLevel(item.status)}</span></div><ReportText value={item.explanation}></ReportText><ReportEvidenceRefs ids={item.evidenceIds} report={report}></ReportEvidenceRefs></article>)}</div>
      <ReportSection title="准入前必须确认"><ReportList items={admission.mustConfirm}></ReportList></ReportSection><ReportText className="report-note" value={admission.disclaimer}></ReportText>
    </ReportSection>
    <ReportSection title="Dmall 能力匹配" meta="匹配理由 / 前置条件 / 禁止承诺">
      <p className="report-note">{materialSourceLabel(match.generation)} · 参考评分，需人工验证</p>
      <ReportText value={match.positioning}></ReportText>
      <div className="report-stack">{reportList(match.matches).map(item => <article className="report-card" key={item.capabilityId}>
        <div className="report-card-heading"><strong>{item.capabilityName}</strong><span className="report-badge">{reportLevel(item.fit)}匹配 · {item.fitScore} 分</span></div>
        <ReportList items={item.reasons}></ReportList><b>前置条件</b><ReportList items={item.prerequisites}></ReportList>
        {item.pilotScope && <div className="report-field"><b>建议验证范围</b><ReportText value={item.pilotScope}></ReportText></div>}
        <div className="report-field"><b>禁止直接宣称</b><ReportText value={item.caution}></ReportText></div><ReportEvidenceRefs ids={item.evidenceIds} report={report}></ReportEvidenceRefs>
      </article>)}</div>
      {!reportList(match.matches).length && <p className="report-empty">本次结果未返回能力匹配。</p>}
      <ReportSection title="不可承诺事项"><ReportList items={match.avoidClaims}></ReportList></ReportSection>
    </ReportSection>
    <ReportSection title="风险与应对" meta={`整体风险：${reportLevel(risks.overall)}`}>
      <div className="report-stack">{reportList(risks.risks).map(risk => <article className="report-card report-risk" key={risk.id}>
        <div className="report-card-heading"><strong>{risk.title}</strong><span className="report-badge">{reportLevel(risk.level)}风险{risk.requiresHumanConfirmation ? " · 人工确认" : ""}</span></div>
        <ReportText value={risk.reason}></ReportText><div className="report-field"><b>缓解建议</b><ReportText value={risk.mitigation}></ReportText></div><ReportEvidenceRefs ids={risk.evidenceIds} report={report}></ReportEvidenceRefs>
      </article>)}</div>
      {!reportList(risks.risks).length && <p className="report-empty">本次结果未返回风险条目，不代表无风险。</p>}
      <ReportSection title="待人工确认"><ReportList items={risks.pendingConfirmations}></ReportList></ReportSection>
    </ReportSection>
  </>;
}

// The management view, clipboard and download share this Markdown source.
function buildReportManagementBrief(report, country) {
  const brief = report.researchBrief || {};
  const bulletList = (items) => reportList(items).length ? items.map(item => `- ${item}`).join("\n") : "未返回，待确认。";
  const ids = reportList(brief.evidenceIds);
  const evidence = ids.map(id => {
    const record = reportList(report.evidenceChain?.records).find(item => item.id === id);
    if (!record) return `${id}：本客户证据链未返回详情。`;
    const url = reportSourceUrl(record.sourceUrl);
    return `${record.id} · ${record.sourceLevel}级 · ${record.kind === "fact" ? "事实" : "推断"} · ${record.publishedAt} · ${record.title}${url ? `\n  <${url}>` : ""}`;
  });
  return [
    `# ${country.name} · 管理层简报`,
    `${reportMode(report)}\n\n生成时间：${reportText(brief.generatedAt || report.completedAt)}\n\n报告编号：${reportText(report.runId)}`,
    reportScope(report, country),
    reportGenerationNote(report),
    "## 最终结论", countryReportNarrative(report.finalNarrative),
    "## 执行摘要", reportText(brief.executiveSummary),
    "## 准入建议", reportText(brief.admission), reportText(report.admission?.rationale), reportText(report.admission?.disclaimer),
    "## 重点商机", bulletList(brief.opportunitySignals),
    "## 建议切入点", bulletList(brief.recommendedEntryPoints),
    "## 风险与未知", bulletList(brief.risksAndUnknowns),
    "## 下一步行动", bulletList(brief.nextActions),
    "## 内部协同", bulletList(brief.internalActions),
    "## 证据索引", bulletList(evidence),
  ].join("\n\n");
}
function ReportManagement({ report, country, onCopy, onDownload }) {
  return <>
    <div className="brief-actions report-brief-actions"><button type="button" onClick={onCopy}><Icon name="copy" size={16}></Icon>复制简报</button><button type="button" className="primary" onClick={onDownload}><Icon name="download" size={16}></Icon>下载 Markdown</button></div>
    <MarkdownContent className="report-management" content={buildReportManagementBrief(report, country)}></MarkdownContent>
  </>;
}

function ReportTab({ tab, report, country, generating, onCopy, onDownload, onSelectCustomer }) {
  const View = { overview: ReportMarket, customers: ReportCustomers, sales: ReportSales, battle: ReportBattle, brief: ReportManagement }[tab];
  if (!View) return null;
  return <div className="tab-body report-tabs" data-report-tab={tab} data-report-run={report.runId} key={report.runId}>
    <div className="report-provenance"><div><strong>{generating ? "正在更新 · 当前显示上次结果" : "分析已完成 · 最新结果"}</strong><span>{reportMode(report)}</span></div><details className="report-meta-details"><summary>查看报告口径与生成信息</summary><small>完成于 {reportText(report.completedAt)} · 报告编号 {reportText(report.runId)}</small><p>{reportScope(report, country)}</p><small>{reportGenerationNote(report)}</small></details></div>
    <View report={report} country={country} onCopy={onCopy} onDownload={onDownload} onSelectCustomer={onSelectCustomer}></View>
  </div>;
}

Object.assign(window, { ReportTab, buildReportManagementBrief, materialSourceLabel, countryReportNarrative });
