function countryBriefText(country, report) {
  if (!report?.analysis) return "";
  const a=report.analysis;
  const companies=report?.companies || country.research.companies;
  const name=id=>companies.find(c=>c.id===id)?.name || id;
  return [a.title,report.generation.source==="llm"?"智能体生成简报":"国家简报 · 示例",`覆盖：${companies.map(c=>c.name).join("、")}`,"",a.executiveSummary,"",
    "【区域优先级】",`${a.regionalPriority.level} · ${a.regionalPriority.score}/100（研判）`,a.regionalPriority.rationale,
    "","【核心机会逻辑】",a.opportunityLogic,"","【三家企业比较】",
    ...a.companyAssessments.flatMap(c=>[name(c.companyId),`定位：${c.role}`,`机会：${c.opportunity}`,`风险：${c.risk}`,`下一步：${c.recommendedAction}`,""]),
    "【关键信号】",...a.keySignals.map(s=>`· ${s.title}（${s.basis}）：${s.detail}`),
    "","【主要风险与应对】",...a.risks.map(r=>`· ${r.title}：${r.detail} 应对：${r.mitigation}`),
    "","【下一步行动】",...a.nextActions.map(n=>`· ${n.horizon}｜${n.owner}｜${n.action}｜交付：${n.deliverable}`),
    "","【判断置信度】",a.confidence.level,a.confidence.rationale,...a.confidence.gaps.map(g=>`· 待确认：${g}`),
    "","【国家指标依据】",...(report?.evidence || []).filter(e=>e.companyId==="country").map(e=>`· [${e.kind==="fact"?"事实":"研判"}] ${e.text}${e.source?` 来源：${e.source.title} ${e.source.url}`:""}`),
    "","【资料与假设】",...companies.flatMap(c=>[c.name,...c.evidence.map(e=>`· [${e.kind==="fact"?"事实":"研判"} / ${e.scope}] ${e.text}${e.source?` 来源：${e.source.title} ${e.source.url}`:""}`)])].join("\n");
}

function CountryManagementBrief({country,report,generating,run,onCopy}) {
  const a=report?.analysis;
  const companies=report?.companies || country.research.companies;
  const evidence=report?.evidence || companies.flatMap(c=>c.evidence);
  const isLlm = report?.generation.source === "llm";
  const state = run?.error ? "error" : generating ? "running" : a ? "ready" : "empty";
  const completedAt = report?.completedAt ? new Date(report.completedAt).toLocaleString("zh-CN", {hour12:false}) : null;
  const elapsed = report ? Math.round((Date.parse(report.completedAt) - Date.parse(report.startedAt)) / 1000) : NaN;
  const stateTitle = state === "error" ? "简报生成未完成" : generating ? "正在生成国家简报" : isLlm ? "国家简报已更新" : a ? "国家简报 · 示例" : "国家简报待生成";
  const name=id=>id === "country" ? `${country.name}市场` : companies.find(c=>c.id===id)?.name || "本国样本";
  const proof=ids=><div className="brief-proof">{ids.map(id=>{const e=evidence.find(x=>x.id===id);return e?<span key={id} title={`${e.scope}：${e.text}`}>{e.source?<a href={e.source.url} target="_blank" rel="noopener noreferrer">{name(e.companyId)} · 资料 ↗</a>:`${name(e.companyId)} · 研判`}</span>:null;})}</div>;
  return <div className="tab-body national-page country-management" data-country-brief={country.id} data-brief-source={report?.generation.source || "empty"} data-brief-run={report?.runId || "empty"}>
    <section className={`brief-generation-status is-${state}`} aria-label="国家简报生成状态" role="status" aria-live="polite" aria-atomic="true">
      <h2 className="brief-result-heading" tabIndex={-1}><span className="brief-status-dot" />{stateTitle}</h2>
      {state === "error" && <p>请稍后重新生成。</p>}
      {generating && run && <div className="brief-inline-progress"><span>步骤 {Math.min(run.step + 1, run.steps.length)} / {run.steps.length} · {run.statusMessage}</span><div role="progressbar" aria-label="国家简报分析进度" aria-valuemin={0} aria-valuemax={run.steps.length} aria-valuenow={Math.min(run.step, run.steps.length)}><i style={{width:`${Math.min(100, run.step / run.steps.length * 100)}%`}} /></div></div>}
      {a && <div className="brief-generation-meta"><span>{generating || state === "error" ? "上次更新" : "更新时间"}：{completedAt}</span>{Number.isFinite(elapsed) && elapsed >= 0 && <span>生成耗时：{elapsed >= 60 ? `${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒` : `${elapsed} 秒`}</span>}</div>}
    </section>
    {!a ? <div className="brief-empty-sections" aria-label="管理层简报待生成章节" aria-busy={generating}>
      {["区域优先级", "核心机会逻辑", "关键信号", "风险与应对", "行动计划", "判断置信度"].map(title=><section className="brief-placeholder" key={title}><h3>{title}</h3><div className="brief-placeholder-lines" aria-hidden="true"><i /><i /></div></section>)}
    </div> : <>
    <div className="brief-analysis-content" data-brief-analysis={report.runId}>
    <div className="brief-content-label"><b>{isLlm ? "智能体生成简报" : "国家简报 · 示例"}</b><button type="button" onClick={onCopy}>复制国家简报</button></div>
    <section className="brief-executive">
      <h2>{a.title}</h2><MarkdownContent content={a.executiveSummary} />
      <div className="brief-covered">{companies.map((c,i)=><span key={c.id}><b>0{i+1}</b>{c.name}</span>)}</div>
    </section>
    <section className="national-section brief-priority"><div><span className="brief-question">01 / 在区域里的优先级</span><h3>{a.regionalPriority.level}</h3><MarkdownContent content={a.regionalPriority.rationale} /></div><div className="brief-priority-score"><strong>{a.regionalPriority.score}<small>/100</small></strong><span>综合研判 · 非成交概率</span></div></section>
    <section className="national-section"><div className="national-section-title"><h3>02 / 核心机会逻辑</h3><span>从三家样本归纳</span></div><MarkdownContent className="brief-logic" content={a.opportunityLogic} /></section>
    <section className="national-section"><div className="national-section-title"><h3>三家企业怎么比较</h3><span>共性与差异一起看</span></div><div className="brief-company-comparison">{a.companyAssessments.map((c,i)=><article key={c.companyId} data-brief-company={c.companyId}><div className="brief-company-heading"><span>0{i+1}</span><h4>{name(c.companyId)}</h4></div><MarkdownContent className="brief-company-role" content={c.role} /><dl><dt>机会</dt><dd><MarkdownContent content={c.opportunity} /></dd><dt>风险</dt><dd><MarkdownContent content={c.risk} /></dd><dt>行动</dt><dd><MarkdownContent content={c.recommendedAction} /></dd></dl>{proof(c.evidenceIds)}</article>)}</div></section>
    <section className="national-section"><div className="national-section-title"><h3>03 / 最重要的机会信号</h3><span>{a.keySignals.length} 项</span></div><div className="brief-signals">{a.keySignals.map((s,i)=><article key={i}><div><span>{s.basis}</span><h4>{s.title}</h4></div><MarkdownContent content={s.detail} />{proof(s.evidenceIds)}</article>)}</div></section>
    <section className="national-section"><div className="national-section-title"><h3>04 / 主要风险与应对</h3><span>{a.risks.length} 项</span></div><div className="brief-risks">{a.risks.map((r,i)=><article key={i}><h4>{r.title}</h4><MarkdownContent content={r.detail} /><div className="brief-mitigation"><b>应对</b><MarkdownContent content={r.mitigation} /></div>{proof(r.evidenceIds)}</article>)}</div></section>
    <section className="national-section"><div className="national-section-title"><h3>05 / 下一步怎么做</h3><span>建议行动计划</span></div><ol className="brief-action-plan">{a.nextActions.map((n,i)=><li key={i}><div><b>{n.horizon}</b><span>{n.owner}</span></div><MarkdownContent content={n.action} /><p className="brief-deliverable"><b>交付</b>{n.deliverable}</p></li>)}</ol></section>
    <section className="national-section brief-confidence"><div className="national-section-title"><h3>06 / 判断置信度</h3><b>{a.confidence.level}</b></div><MarkdownContent content={a.confidence.rationale} /><ul>{a.confidence.gaps.map((g,i)=><li key={i}><MarkdownContent inline content={g} /></li>)}</ul></section>
    </div>
    <section className="national-section brief-source-section"><div className="national-section-title"><h3>企业资料与来源</h3><span>{companies.length} 家企业</span></div>{companies.map(c=><details className="brief-dossier" key={c.id}><summary>{c.name}<span>{c.evidence.length} 条资料</span></summary><p>{c.summary}</p><dl>{[["门店 / 范围",`${c.footprint}；${c.footprintScope}`],["财务边界",c.financial],["业务布局",c.business.join("；")],["数字化场景",c.digital.join("；")],["系统与边界",c.systems.join("；")],["组织与角色",`${c.organization} ${c.roles.join(" / ")}`],["动态与观察",c.signals.join("；")]].map(([label,value])=><React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>)}</dl><ul>{c.evidence.map(e=><li key={e.id}><b>{e.kind==="fact"?"事实":"研判"} · {e.scope}</b><p>{e.text}</p><CountrySourceLink source={e.source} /></li>)}</ul></details>)}</section>
    </>}
  </div>;
}
window.countryBriefText=countryBriefText;
window.CountryManagementBrief=CountryManagementBrief;
