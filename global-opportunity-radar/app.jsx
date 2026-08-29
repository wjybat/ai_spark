const { useEffect: useAppEffect, useMemo: useAppMemo, useState: useAppState } = React;

function Icon({ name, size = 18 }) {
  const shapes = {
    globe: <><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path></>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"></path><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"></path></>,
    scan: <><path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"></path><circle cx="12" cy="12" r="3"></circle></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"></path></>,
    chevron: <><path d="m9 18 6-6-6-6"></path></>,
    back: <><path d="m15 18-6-6 6-6"></path></>,
    signal: <><path d="M5 19V9M12 19V5M19 19v-7"></path></>,
    target: <><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"></path></>,
    shield: <><path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-4"></path></>,
    users: <><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6"></path><path d="M16 6.3a3 3 0 0 1 0 5.4M16.5 14c2.4.4 3.7 2.1 4 5"></path></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"></path><path d="M5 21h14"></path></>,
    check: <><path d="m5 12 4 4L19 6"></path></>,
    close: <><path d="m6 6 12 12M18 6 6 18"></path></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"></path><path d="m3 12 9 5 9-5M3 16l9 5 9-5"></path></>
  };
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes[name]}
    </svg>
  );
}

function ScoreRing({ value, size = "large" }) {
  return (
    <div className={`score-ring ${size}`} style={{ "--score": `${value * 3.6}deg` }} aria-label={`机会评分 ${value}`}>
      <span>{value}</span><small>/100</small>
    </div>
  );
}

function Header({ onScan, scanning, agentStatus }) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark"><Icon name="globe" size={22}></Icon><span></span></div>
        <div>
          <div className="brand-line"><b>ATLAS</b><em>海外商机决策 Agent</em></div>
          <p>从全球信号到销售行动，一次完成</p>
        </div>
      </div>
      <div className="header-actions">
        <div className="source-pill"><span></span>演示数据 · 2026 Q3</div>
        <div className={`live-pill ${agentStatus?.ok ? "is-connected" : "is-offline"}`}><i></i>{agentStatus?.ok ? `pi Agent Core · ${agentStatus.effectiveMode}` : "Agent Core 连接中"}</div>
        <button type="button" className="scan-button" onClick={onScan} disabled={scanning}>
          <Icon name="scan" size={17}></Icon>{scanning ? "扫描中" : "重新扫描市场"}
        </button>
      </div>
    </header>
  );
}

function AgentRail({ steps, activeStep }) {
  return (
    <div className="agent-rail" aria-label="Agent 编排链路">
      <div className="agent-rail-title"><Icon name="layers" size={16}></Icon><span>水滴引擎 · Orchestrator</span></div>
      <div className="agent-steps">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className={`agent-step ${activeStep === index ? "is-running" : ""} ${activeStep > index ? "is-done" : ""}`}>
              <i>{activeStep > index ? <Icon name="check" size={12}></Icon> : index + 1}</i><span>{step}</span>
            </div>
            {index < steps.length - 1 && <b></b>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, meta }) {
  return (
    <div className="metric-cell">
      <span>{label}</span><strong>{value}</strong>{meta && <small>{meta}</small>}
    </div>
  );
}

function RegionPanel({ region, countries, onSelectCountry, pinned }) {
  return (
    <div className="panel-content region-panel-content">
      <div className="panel-kicker">
        <span style={{ background: region.color }}></span>{region.en} MARKET RADAR
        <em className={`lock-tag ${pinned ? "is-locked" : ""}`}>{pinned ? "已锁定" : "实时预览 · 点击地球区域锁定"}</em>
      </div>
      <div className="region-title-row">
        <div><h1>{region.name}商机雷达</h1><p>{region.headline}</p></div>
        <ScoreRing value={region.score}></ScoreRing>
      </div>
      <p className="region-summary">{region.summary}</p>

      <div className="metrics-grid">
        <Metric label="潜在线索池" value={region.pipeline} meta="模拟 Pipeline"></Metric>
        <Metric label="商机信号" value={region.signalCount} meta="近 12 个月"></Metric>
        <Metric label="数字化需求" value={region.demand} meta="Agent 判断"></Metric>
        <Metric label="进入难度" value={region.entry} meta="含合规评估"></Metric>
      </div>

      <section className="panel-section">
        <div className="section-heading"><span>高潜国家</span><small>按综合机会评分排序</small></div>
        <div className="country-ranking">
          {region.countryIds.map((id, index) => {
            const country = countries[id];
            return (
              <button type="button" className="country-row" key={id} onClick={() => onSelectCountry(id)}>
                <span className="rank-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="country-row-main"><strong>{country.name}</strong><small>{country.tagline}</small></div>
                <div className="country-row-tags"><em>{country.priority}</em><b>{country.score}</b><Icon name="chevron" size={16}></Icon></div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-section opportunity-strip">
        <div className="section-heading"><span>Agent 发现的共性机会</span><small>证据链已聚合</small></div>
        <div className="opportunity-list">
          {region.opportunities.map((item, index) => (
            <div key={item}><i>{index + 1}</i><p>{item}</p></div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OpportunityOverview({ country }) {
  return (
    <div className="tab-body">
      <div className="insight-hero">
        <div><span>市场简述</span><p>{country.marketBrief}</p></div>
        <div className="confidence"><small>置信度</small><strong>92%</strong><i><b style={{ width: "92%" }}></b></i></div>
      </div>
      <div className="two-column-block">
        <section>
          <div className="section-heading"><span>具体潜在商机</span><small>{country.signalCount} 条信号归因</small></div>
          <div className="evidence-list">
            {country.opportunities.map((item, index) => (
              <div className="evidence-item" key={item}><span><Icon name="signal" size={16}></Icon></span><div><b>信号 {String(index + 1).padStart(2, "0")}</b><p>{item}</p></div></div>
            ))}
          </div>
        </section>
        <section>
          <div className="section-heading"><span>评分解释</span><small>可解释模型</small></div>
          <div className="score-breakdown">
            {[["市场吸引力", 84], ["信号强度", country.score + 4], ["方案匹配度", country.score + 1], ["可触达性", Math.max(62, country.score - 8)]].map(([label, value]) => (
              <div key={label}><p><span>{label}</span><b>{Math.min(96, value)}</b></p><i><em style={{ width: `${Math.min(96, value)}%` }}></em></i></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CustomerRadar({ country, activeCustomer, setActiveCustomer }) {
  return (
    <div className="tab-body">
      <div className="customer-summary"><span><Icon name="users" size={18}></Icon></span><p>已识别 <strong>{country.customers.length} 家</strong>路演重点客户；下方按信号强度、方案匹配度和风险扣分排序。</p></div>
      <div className="customer-list">
        {country.customers.map((customer, index) => {
          const open = activeCustomer === index;
          return (
            <button type="button" className={`customer-card ${open ? "is-open" : ""}`} key={customer.name} onClick={() => setActiveCustomer(open ? -1 : index)}>
              <div className="customer-card-head">
                <span className="customer-index">{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{customer.name}</strong><small>{customer.type} · {customer.stores} 门店</small></div>
                <div className="customer-score"><span>机会分</span><b>{customer.score}</b></div>
                <Icon name="chevron" size={17}></Icon>
              </div>
              {open && (
                <div className="customer-card-detail">
                  <div><span>最近信号</span><p>{customer.signal}</p></div>
                  <div><span>推荐切入</span><p>{customer.modules.join(" · ")}</p></div>
                  <div><span>风险等级</span><p>{customer.risk}</p></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SalesAdvice({ country }) {
  const roles = ["COO", "CIO", "Head of Digital", "Supply Chain Director"];
  return (
    <div className="tab-body">
      <div className="section-heading"><span>销售跟进建议</span><small>建议 7 天内启动</small></div>
      <div className="sales-timeline">
        {country.recommendations.map((item, index) => (
          <div key={item}><i>{index === 0 ? "D1" : index === 1 ? "D3" : "D7"}</i><span></span><p>{item}</p></div>
        ))}
      </div>
      <div className="role-card">
        <span>优先联系角色</span><div>{roles.map((role) => <b key={role}>{role}</b>)}</div>
      </div>
      <div className="email-preview">
        <div><span><Icon name="mail" size={16}></Icon>首封 BD 邮件预览</span><small>Agent 生成</small></div>
        <strong>Subject: Improving store efficiency across {country.en}</strong>
        <p>Hi [Name], we noticed your recent expansion and the growing focus on store productivity. Dmall has helped large retail networks improve replenishment accuracy and in-store execution. Would a focused 30-minute exchange next week be useful?</p>
      </div>
    </div>
  );
}

function BattleCard({ country }) {
  const lead = country.customers[0];
  return (
    <div className="tab-body battle-card-grid">
      <div className="battle-lead">
        <span>首攻客户</span><strong>{lead.name}</strong><p>{lead.type} · {lead.stores} 门店</p><em>机会评分 {lead.score}</em>
      </div>
      <div className="battle-block"><span>推荐切入模块</span><div className="module-chips">{lead.modules.map((module) => <b key={module}>{module}</b>)}</div></div>
      <div className="battle-block"><span>关键痛点判断</span><p>{country.opportunities[1]}</p></div>
      <div className="battle-block"><span>推荐联系人</span><p>COO / CIO / Head of Digital / Supply Chain Director</p></div>
      <div className="battle-block"><span>90 天试点</span><p>{country.pilot}，以库存准确率、缺货率、门店执行效率作为核心指标。</p></div>
      <div className="battle-block risk"><span><Icon name="shield" size={16}></Icon>风险与应对</span><p>{country.entry === "高" ? "决策链与系统集成复杂，需先锁定高层赞助人与本地实施边界。" : "本地化和既有供应商是主要风险，建议用轻量试点降低替换阻力。"}</p></div>
    </div>
  );
}

function ManagementBrief({ country, onCopy, onDownload }) {
  return (
    <div className="tab-body brief-page">
      <div className="brief-stamp">MANAGEMENT BRIEF · {country.en.toUpperCase()}</div>
      <h2>建议将{country.name}列为 {country.priority} 市场，优先启动首批客户验证</h2>
      <p className="brief-lead">基于 {country.signalCount} 条模拟公开信号，Agent 判断该市场兼具增长窗口、明确痛点与可落地的产品切口。当前机会评分为 {country.score}/100，潜在线索池约 {country.pipeline}。</p>
      <div className="brief-grid">
        <div><span>Why now</span><p>{country.opportunities[0]}；{country.opportunities[1]}。</p></div>
        <div><span>How to win</span><p>{country.recommendations[0]}</p></div>
        <div><span>Decision ask</span><p>批准 1 名 BD + 1 名售前投入 4 周，完成 3 家客户触达与 1 个试点方案。</p></div>
        <div><span>90-day outcome</span><p>形成 {country.pilot} 试点，沉淀可复制的行业话术、ROI 框架与本地交付清单。</p></div>
      </div>
      <div className="brief-actions">
        <button type="button" onClick={onCopy}><Icon name="copy" size={16}></Icon>复制简报</button>
        <button type="button" className="primary" onClick={onDownload}><Icon name="download" size={16}></Icon>下载文本版</button>
      </div>
    </div>
  );
}

function LiveAgentResult({ report }) {
  const brief = report.researchBrief;
  return (
    <div className="tab-body live-agent-result">
      <div className="live-result-hero">
        <div><span>PI AGENT CORE · {report.modelRun?.model || report.mode.toUpperCase()} · {report.modelRun?.thinkingEffort || "low"}</span><h2>{report.customerProfile.name}</h2><p>{report.finalNarrative}</p></div>
        <ScoreRing value={report.admission.referenceScore} size="compact"></ScoreRing>
      </div>
      <div className="live-result-stats">
        <Metric label="准入建议" value={report.admission.label} meta="非成交结论"></Metric>
        <Metric label="真实证据" value={report.evidenceChain.coverage.facts} meta={`A级 ${report.evidenceChain.coverage.sourceLevelA}`}></Metric>
        <Metric label="商机信号" value={report.opportunitySignals.length} meta="事实与推断分层"></Metric>
        <Metric label="风险项" value={report.riskAssessment.risks.length} meta={`${report.riskAssessment.overall} risk`}></Metric>
      </div>
      <div className="live-result-grid">
        <section>
          <div className="section-heading"><span>证据链</span><small>来源 · 时间 · 置信度</small></div>
          <div className="live-evidence-list">
            {report.evidenceChain.records.slice(0, 6).map((record) => (
              <a key={record.id} href={record.sourceUrl} target="_blank" rel="noreferrer">
                <i>{record.sourceLevel}</i><div><b>{record.title}</b><p>{record.excerpt}</p><small>{record.publishedAt} · {record.kind === "fact" ? "已核验事实" : "Agent 推断"}</small></div>
              </a>
            ))}
          </div>
        </section>
        <section>
          <div className="section-heading"><span>Dmall 能力匹配</span><small>含前置条件</small></div>
          <div className="live-match-list">
            {report.productMatch.matches.slice(0, 4).map((match) => (
              <div key={match.capabilityId}><span><b>{match.capabilityName}</b><em>{match.fitScore}</em></span><i><u style={{ width: `${match.fitScore}%` }}></u></i><p>禁止直接宣称：{match.caution}</p></div>
            ))}
          </div>
          <div className="section-heading live-risk-heading"><span>风险与待确认项</span><small>人工确认门禁</small></div>
          <div className="live-risk-list">
            {report.riskAssessment.risks.slice(0, 4).map((risk) => <div key={risk.id}><Icon name="shield" size={14}></Icon><p><b>{risk.title}</b><span>{risk.reason}</span></p></div>)}
          </div>
        </section>
      </div>
      <section className="live-brief-card">
        <div className="section-heading"><span>客户研究 Brief</span><small>{brief.generatedAt.slice(0, 10)} 生成</small></div>
        <p>{brief.executiveSummary}</p>
        <div><b>建议切入</b><span>{brief.recommendedEntryPoints.join(" · ")}</span></div>
        <div><b>下一步</b><span>{brief.nextActions.join("；")}</span></div>
      </section>
    </div>
  );
}

function CountryPanel({ country, region, onBack, onGenerate, generating, notify, packageReady, onViewPackage, liveReport }) {
  const tabs = [
    ...(liveReport ? [["live", "Agent 实时结果"]] : []),
    ["overview", "市场与商机"], ["customers", "客户雷达"], ["sales", "销售建议"], ["battle", "作战卡"], ["brief", "管理层简报"]
  ];
  const [tab, setTab] = useAppState("overview");
  const [activeCustomer, setActiveCustomer] = useAppState(0);

  useAppEffect(() => { setTab(liveReport ? "live" : "overview"); setActiveCustomer(0); }, [country.id, liveReport]);

  const briefText = `${country.name}管理层简报\n机会评分：${country.score}/100（${country.priority}）\n市场判断：${country.marketBrief}\n建议动作：${country.recommendations.join("；")}\n试点建议：${country.pilot}`;
  const copyBrief = () => {
    navigator.clipboard?.writeText(briefText);
    notify("管理层简报已复制");
  };
  const downloadBrief = () => {
    const url = URL.createObjectURL(new Blob([briefText], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${country.en}-management-brief.txt`; link.click();
    URL.revokeObjectURL(url);
    notify("文本版简报已下载");
  };

  return (
    <div className="country-panel-shell">
      <div className="country-panel-head">
        <button type="button" className="back-link" onClick={onBack}><Icon name="back" size={16}></Icon>{region.name}雷达</button>
        <div className="country-head-main">
          <div><div className="panel-kicker"><span style={{ background: region.color }}></span>{liveReport ? "LIVE EVIDENCE REPORT" : `${country.en.toUpperCase()} OPPORTUNITY`}</div><h1>{country.name}</h1><p>{liveReport ? liveReport.customerProfile.name : country.tagline}</p></div>
          <ScoreRing value={liveReport?.admission.referenceScore ?? country.score} size="compact"></ScoreRing>
        </div>
        <div className="country-quick-metrics">
          <Metric label="准入建议" value={liveReport?.admission.label ?? country.priority}></Metric><Metric label="客户体量" value={liveReport ? liveReport.customerProfile.storeCountLabel.split("（")[0] : country.pipeline}></Metric><Metric label="信号" value={liveReport?.opportunitySignals.length ?? country.signalCount}></Metric><Metric label="证据" value={liveReport ? `${liveReport.evidenceChain.coverage.sourceLevelA} A级` : country.entry}></Metric>
        </div>
      </div>
      <nav className="detail-tabs" aria-label="国家详情">
        {tabs.map(([id, label]) => <button type="button" key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      <div className="country-tab-scroll">
        {tab === "live" && liveReport && <LiveAgentResult report={liveReport}></LiveAgentResult>}
        {tab === "overview" && <OpportunityOverview country={country}></OpportunityOverview>}
        {tab === "customers" && <CustomerRadar country={country} activeCustomer={activeCustomer} setActiveCustomer={setActiveCustomer}></CustomerRadar>}
        {tab === "sales" && <SalesAdvice country={country}></SalesAdvice>}
        {tab === "battle" && <BattleCard country={country}></BattleCard>}
        {tab === "brief" && <ManagementBrief country={country} onCopy={copyBrief} onDownload={downloadBrief}></ManagementBrief>}
      </div>
      <div className="panel-footer-action">
        <div><Icon name="spark" size={18}></Icon><span><b>{liveReport ? "pi-agent-core 实时结果" : "决策建议 Agent"}</b><small>{packageReady ? "真实证据作战包已就绪" : "运行 P0 2–10 完整链路"}</small></span></div>
        <div className="footer-buttons">
          {packageReady && !generating && (
            <button type="button" className="ghost" onClick={onViewPackage}>查看作战包</button>
          )}
          <button type="button" onClick={onGenerate} disabled={generating}>{generating ? "生成中" : packageReady ? "重新生成" : "生成 BD 作战包"}<Icon name="arrow" size={16}></Icon></button>
        </div>
      </div>
    </div>
  );
}

function AgentRunOverlay({ steps, active, mode, onClose, onViewPackage, statusMessage, error }) {
  const done = active >= steps.length;
  return (
    <div className="agent-run-backdrop" role="dialog" aria-modal="true" aria-label="Agent 运行状态">
      <div className="agent-run-card">
        {done && <button type="button" className="overlay-close" onClick={onClose}><Icon name="close" size={18}></Icon></button>}
        <div className={`agent-orb ${done && !error ? "is-done" : ""} ${error ? "is-error" : ""}`}>{done && !error ? <Icon name="check" size={27}></Icon> : <Icon name={error ? "close" : "spark"} size={25}></Icon>}</div>
        <span className="run-eyebrow">PI AGENT CORE · EVIDENCE-FIRST ORCHESTRATOR</span>
        <h2>{error ? "Agent 运行未完成" : done ? (mode === "scan" ? "真实市场扫描已完成" : "真实客户作战包已生成") : (mode === "scan" ? "正在运行市场与客户扫描" : "正在运行 P0 2–10 完整链路")}</h2>
        <p>{error || statusMessage || (done ? "证据链、准入评估、能力匹配、风险和客户 Brief 均已生成。" : `正在运行：${steps[Math.min(active, steps.length - 1)]} Agent`)}</p>
        <div className="run-steps">
          {steps.map((step, index) => <i key={step} className={active > index ? "done" : active === index ? "active" : ""}><span>{active > index ? <Icon name="check" size={11}></Icon> : index + 1}</span><b>{step}</b></i>)}
        </div>
        <div className="run-progress"><i style={{ width: `${Math.min(100, (active / steps.length) * 100)}%` }}></i></div>
        {done && (
          <div className="run-actions">
            {mode === "package" && !error && (
              <button type="button" className="run-complete-button ghost" onClick={onClose}>返回商机地图</button>
            )}
            <button type="button" className="run-complete-button" onClick={mode === "package" && !error ? onViewPackage : onClose}>
              {mode === "package" && !error ? "查看真实 Agent 结果" : "返回商机地图"}
              <Icon name="arrow" size={15}></Icon>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SignalTicker({ signals, onPick, motion }) {
  const doubled = [...signals, ...signals];
  return (
    <div className={`signal-ticker ${motion ? "" : "is-static"}`} aria-label="实时商机信号流">
      <div className="ticker-label"><Icon name="signal" size={14}></Icon>实时商机信号</div>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${signals.length * 2.4}s` }}>
          {doubled.map((signal, index) => (
            <button type="button" className="ticker-item" key={`${signal.countryId}-${signal.customer}-${index}`} onClick={() => onPick(signal.countryId)} title={`查看${signal.country} · ${signal.customer}`}>
              <em>{signal.country}</em><span>{signal.customer}</span><b>{signal.signal}</b>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildLiveBattlePackage(report) {
  const brief = report.researchBrief;
  const profile = report.customerProfile;
  const artifacts = [
    { id: "research", title: "客户研究 Brief", en: "LIVE CUSTOMER RESEARCH", sections: [
      { h: "执行摘要", paras: [brief.executiveSummary] },
      { h: "客户画像", list: [`总部：${profile.headquarters}`, `覆盖：${profile.countries.join("、")}`, `业态：${profile.formats.join("、")}`, `规模：${profile.storeCountLabel}；${profile.revenueLabel}`] },
      { h: "准入建议", paras: [`${report.admission.label}（参考分 ${report.admission.referenceScore}）`, report.admission.rationale, report.admission.disclaimer] }
    ]},
    { id: "evidence", title: "证据链", en: "EVIDENCE CHAIN", sections: [
      { h: "证据覆盖", list: [`已核验事实 ${report.evidenceChain.coverage.facts} 条`, `推断 ${report.evidenceChain.coverage.inferences} 条`, `A级来源 ${report.evidenceChain.coverage.sourceLevelA} 条`, `最新证据 ${report.evidenceChain.coverage.latestPublishedAt}`] },
      { h: "来源摘要", list: report.evidenceChain.records.map((record) => `[${record.sourceLevel}] ${record.title}｜${record.publishedAt}｜${record.excerpt}`) },
      { h: "信息缺口", list: report.evidenceChain.missingEvidence }
    ]},
    { id: "signals", title: "商机信号", en: "OPPORTUNITY SIGNALS", sections: [
      { h: "识别结果", list: report.opportunitySignals.map((signal) => `${signal.title}（${signal.strength}）｜${signal.summary}`) },
      { h: "解释边界", list: report.opportunitySignals.map((signal) => signal.interpretation) }
    ]},
    { id: "match", title: "Dmall 能力匹配", en: "CAPABILITY MATCH", sections: [
      { h: "推荐切入", list: report.productMatch.matches.slice(0, 5).map((match) => `${match.capabilityName}｜匹配参考 ${match.fitScore}｜${match.reasons[0]}`) },
      { h: "前置条件", list: report.productMatch.matches.slice(0, 3).flatMap((match) => match.prerequisites.map((item) => `${match.capabilityName}：${item}`)) },
      { h: "禁止宣称", list: report.productMatch.avoidClaims }
    ]},
    { id: "risk", title: "风险与待确认项", en: "RISKS & GAPS", sections: [
      { h: `整体风险：${report.riskAssessment.overall}`, list: report.riskAssessment.risks.map((risk) => `${risk.title}｜${risk.reason}｜应对：${risk.mitigation}`) },
      { h: "需人工确认", list: report.riskAssessment.pendingConfirmations }
    ]},
    { id: "email", title: "英文开发邮件", en: "OUTREACH EMAIL", sections: [
      { h: "Subject", paras: [brief.outreachEmail.subject] },
      { h: "Body", paras: [brief.outreachEmail.body] },
      { h: "首次拜访问题", list: brief.firstMeetingQuestions }
    ]},
    { id: "actions", title: "销售行动计划", en: "SALES ACTIONS", sections: [
      { h: "内部协同", list: brief.internalActions },
      { h: "下一步", list: brief.nextActions },
      { h: "最终结论", paras: [report.finalNarrative] }
    ]}
  ];
  return artifacts.map((artifact) => ({
    ...artifact,
    text: [`${artifact.title}（${artifact.en}）— ${profile.name}`, "", ...artifact.sections.flatMap((section) => [`【${section.h}】`, ...(section.paras || []), ...(section.list || []).map((item) => `· ${item}`), ""])].join("\n")
  }));
}

function buildBattlePackage(country, region, liveReport) {
  if (liveReport) return buildLiveBattlePackage(liveReport);
  const lead = country.customers[0];
  const modules = lead.modules.join("、");
  const artifacts = [
    {
      id: "research", title: "客户研究 Brief", en: "CUSTOMER RESEARCH",
      sections: [
        { h: "客户概览", list: [
          `${lead.name} — ${lead.type}，${country.name}市场，门店规模 ${lead.stores}`,
          `数字化成熟度：${country.demand === "强" ? "中高" : "中"}（基于扩店、招聘与财报信号综合判断）`,
          "关键决策角色：COO / CIO / Head of Digital / Supply Chain Director"
        ]},
        { h: "近期关键信号", list: country.customers.map((item) => `${item.name}：${item.signal}`) },
        { h: "痛点假设", list: [country.opportunities[0], country.opportunities[1]] },
        { h: "竞品与本地风险", paras: [country.entry === "高" ? "决策链长、既有系统集成深，需提前确认数据合规与本地部署要求，并锁定高层赞助人。" : "本地供应商替换阻力是主要风险，建议以可量化 ROI 的轻量试点降低进入门槛。"] }
      ]
    },
    {
      id: "email", title: "首封 BD 邮件", en: "FIRST-TOUCH EMAIL",
      sections: [
        { h: "Subject", paras: [`Improving store efficiency across ${country.en} — a 30-minute exchange?`] },
        { h: "Body", paras: [
          "Hi [Name],",
          `We noticed ${lead.name}'s recent momentum — ${lead.signal} — and the growing focus on store productivity and inventory accuracy in ${country.en}. Dmall has helped large retail networks improve replenishment accuracy and in-store execution with measurable ROI within 90 days.`,
          `Would a focused 30-minute exchange next week be useful? Happy to share a short benchmark from similar retailers in ${region.en}.`,
          "Best regards,\nDmall International BD Team"
        ]}
      ]
    },
    {
      id: "talk", title: "会议邀约话术", en: "MEETING TALK TRACK",
      sections: [
        { h: "开场（30 秒）", paras: [`“我们注意到${lead.name}近期的${lead.signal}，这类动作通常意味着门店系统和库存协同会成为下一阶段的瓶颈。我们用 90 天帮助同业态零售商把补货准确率提升了 8-12 个百分点。”`] },
        { h: "三个 discovery 问题", list: [
          "目前门店扩张中，库存准确率与补货效率最大的瓶颈在哪里？",
          "现有 POS / 门店系统在新店复制时，部署周期和人力成本是多少？",
          `如果 90 天内在${country.pilot.split(" / ")[0]}验证 ROI，您最关注哪个指标？`
        ]},
        { h: "收尾", paras: ["“不需要现在就谈采购。我们建议先做一次 45 分钟的现状诊断，输出一份对标报告，您再决定是否进入试点。”"] }
      ]
    },
    {
      id: "pitch", title: "Pitch Deck 大纲", en: "PITCH OUTLINE",
      sections: [
        { h: "8 页结构", list: [
          `01 市场窗口：${country.name}零售数字化趋势与关键信号`,
          `02 客户现状：${lead.name}业务画像与痛点拆解`,
          `03 切入方案：${modules}`,
          "04 同业证据：相似业态的 ROI 与落地周期",
          `05 试点设计：${country.pilot}，指标、里程碑与双方投入`,
          "06 商务框架：许可模式、实施路径与本地伙伴",
          "07 风险与合规：数据部署、本地化与安全保障",
          "08 下一步：决策流程、时间表与成功标准"
        ]}
      ]
    },
    {
      id: "roi", title: "ROI 测算框架", en: "ROI FRAMEWORK",
      sections: [
        { h: "基线指标", list: ["库存准确率", "缺货率 / 有货率", "门店人效（盘点、补货工时）", "生鲜 / 临期损耗率"] },
        { h: "价值杠杆（行业基准）", list: ["补货准确率 +8-12pt", "缺货率 -15% ~ -30%", "门店盘点工时 -40%", "出清损耗 -10% ~ -18%"] },
        { h: "投入项", list: ["软件许可（按门店 / 按模块）", "实施与培训", "系统集成与数据迁移"] },
        { h: "回收模型", paras: [`以${country.name} ${country.pipeline} 的潜在线索池估算，单客户 12-18 个月回本为保守假设；试点期以库存准确率、缺货率、门店执行效率作为核心验证指标。`] }
      ]
    },
    {
      id: "crm", title: "CRM 跟进任务", en: "CRM TASKS",
      sections: [
        { h: "跟进节奏（7 天内启动）", list: [
          `D1｜向 ${lead.name} COO / CIO 发送首封 BD 邮件（负责人：BD）`,
          "D3｜LinkedIn 触达 Head of Digital，附同业案例（负责人：BD）",
          "D7｜完成 30 分钟需求确认电话，记录痛点、预算窗口与决策链（负责人：BD + 售前）",
          `D14｜提交 ${country.pilot} 试点方案与 ROI 测算，约定 POC 评审会（负责人：售前）`,
          "D21｜管理层简报内部同步，申请试点资源与高层赞助（负责人：BD Lead）"
        ]}
      ]
    },
    {
      id: "brief", title: "管理层简报", en: "MANAGEMENT BRIEF",
      sections: [
        { h: "核心建议", paras: [`建议将${country.name}列为 ${country.priority} 市场，机会评分 ${country.score}/100，潜在线索池约 ${country.pipeline}，优先启动首批客户验证。`] },
        { h: "Why now", paras: [`${country.opportunities[0]}；${country.opportunities[1]}。`] },
        { h: "How to win", paras: [country.recommendations[0]] },
        { h: "Decision ask", paras: ["批准 1 名 BD + 1 名售前投入 4 周，完成 3 家客户触达与 1 个试点方案。"] }
      ]
    }
  ];
  return artifacts.map((artifact) => ({
    ...artifact,
    text: [
      `${artifact.title}（${artifact.en}）— ${country.name}`,
      "",
      ...artifact.sections.flatMap((section) => [
        `【${section.h}】`,
        ...(section.paras || []),
        ...(section.list || []).map((item) => `· ${item}`),
        ""
      ])
    ].join("\n")
  }));
}

function BattlePackageDrawer({ country, region, onClose, notify, liveReport }) {
  const artifacts = useAppMemo(() => buildBattlePackage(country, region, liveReport), [country, region, liveReport]);
  const [active, setActive] = useAppState(artifacts[0].id);
  const current = artifacts.find((artifact) => artifact.id === active) || artifacts[0];

  const copyCurrent = () => {
    navigator.clipboard?.writeText(current.text);
    notify(`「${current.title}」已复制`);
  };
  const downloadAll = () => {
    const full = artifacts.map((artifact) => artifact.text).join("\n\n────────────────────\n\n");
    const url = URL.createObjectURL(new Blob([full], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${country.en}-bd-battle-package.txt`;
    link.click();
    URL.revokeObjectURL(url);
    notify("完整作战包已下载");
  };

  return (
    <div className="package-backdrop" role="dialog" aria-modal="true" aria-label={`${country.name} BD 作战包`} onClick={onClose}>
      <div className="package-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="package-head">
          <div>
            <div className="panel-kicker"><span style={{ background: region.color }}></span>BD BATTLE PACKAGE · {country.en.toUpperCase()}</div>
            <h2>{country.name}作战包</h2>
            <p>7 项材料 · 由 pi-agent-core 9 个工具阶段生成 · 目标客户 {liveReport?.customerProfile.name ?? country.customers[0].name}</p>
          </div>
          <div className="package-head-actions">
            <button type="button" className="package-download" onClick={downloadAll}><Icon name="download" size={15}></Icon>下载全部</button>
            <button type="button" className="package-close" onClick={onClose} aria-label="关闭作战包"><Icon name="close" size={17}></Icon></button>
          </div>
        </header>
        <div className="package-body">
          <nav className="package-nav" aria-label="作战包材料">
            {artifacts.map((artifact, index) => (
              <button type="button" key={artifact.id} className={active === artifact.id ? "is-active" : ""} onClick={() => setActive(artifact.id)}>
                <i>{String(index + 1).padStart(2, "0")}</i><span>{artifact.title}</span>
              </button>
            ))}
          </nav>
          <article className="package-content">
            <div className="package-content-head">
              <div>
                <div className="panel-kicker">{current.en}</div>
                <h3>{current.title}</h3>
              </div>
              <button type="button" className="package-copy" onClick={copyCurrent}><Icon name="copy" size={14}></Icon>复制本页</button>
            </div>
            {current.sections.map((section) => (
              <section key={section.h} className="package-section">
                <h4>{section.h}</h4>
                {(section.paras || []).map((para) => <p key={para}>{para}</p>)}
                {section.list && <ul>{section.list.map((item) => <li key={item}>{item}</li>)}</ul>}
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { regions, countries, continentFeatures, agentSteps } = window.OPPORTUNITY_DATA;
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [selectedRegion, setSelectedRegion] = useAppState(null);
  const [selectedCountry, setSelectedCountry] = useAppState(null);
  const [hoverRegion, setHoverRegion] = useAppState(null);
  const [run, setRun] = useAppState(null);
  const [toast, setToast] = useAppState("");
  const [pkgCountry, setPkgCountry] = useAppState(null);
  const [pkgReady, setPkgReady] = useAppState(() => new Set());
  const [agentStatus, setAgentStatus] = useAppState(null);
  const [liveReports, setLiveReports] = useAppState({});

  const signals = useAppMemo(() => Object.values(countries).flatMap((item) =>
    item.customers.slice(0, 2).map((customer) => ({
      countryId: item.id,
      country: item.name,
      customer: customer.name,
      signal: customer.signal
    }))
  ), [countries]);

  const regionId = selectedRegion || hoverRegion || "asia";
  const region = regions[regionId];
  const country = selectedCountry ? countries[selectedCountry] : null;
  const activeStep = run && !run.done ? run.step : -1;

  useAppEffect(() => {
    window.AgentApi.health().then(setAgentStatus).catch(() => setAgentStatus({ ok: false }));
  }, []);

  useAppEffect(() => {
    if (!run || run.done || run.source === "backend") return undefined;
    const timer = setTimeout(() => {
      if (run.step >= agentSteps.length - 1) {
        setRun({ ...run, step: agentSteps.length, done: true });
        if (run.mode === "package" && selectedCountry) {
          setPkgReady((prev) => new Set(prev).add(selectedCountry));
        }
      } else {
        setRun({ ...run, step: run.step + 1 });
      }
    }, run.mode === "scan" ? 520 : 650);
    return () => clearTimeout(timer);
  }, [run, agentSteps.length, selectedCountry]);

  useAppEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectRegion = (id) => {
    setSelectedRegion(id); setSelectedCountry(null); setHoverRegion(null);
  };
  const selectCountry = (id) => {
    const target = countries[id];
    setSelectedRegion(target.region); setSelectedCountry(id); setHoverRegion(null);
  };
  const backToGlobal = () => { setSelectedRegion(null); setSelectedCountry(null); setHoverRegion(null); };
  const backToRegion = () => setSelectedCountry(null);
  const notify = (message) => setToast(message);

  const startBackendRun = async ({ mode, targetCountryId, regionId, customerId }) => {
    setRun({ source: "backend", mode, step: 0, done: false, targetCountryId, statusMessage: "正在连接 pi-agent-core…" });
    try {
      const output = await window.AgentApi.startRun({
        regionId,
        customerId,
        mode: "auto",
        onEvent: (event) => {
          if (event.type === "tool_start") {
            setRun((current) => current?.source === "backend" ? { ...current, step: Math.max(0, (event.stage || 1) - 1), statusMessage: `正在运行：${event.label || event.toolName}` } : current);
          }
          if (event.type === "tool_progress") {
            const progress = event.data?.progress || 50;
            setRun((current) => current?.source === "backend" ? { ...current, statusMessage: `${event.label || event.toolName} · ${progress}%` } : current);
          }
        }
      });
      setLiveReports((current) => ({ ...current, [targetCountryId]: output }));
      setPkgReady((current) => new Set(current).add(targetCountryId));
      if (mode === "scan") {
        const target = countries[targetCountryId];
        setSelectedRegion(target.region);
        setSelectedCountry(targetCountryId);
        setHoverRegion(null);
      }
      setRun((current) => current?.source === "backend" ? { ...current, step: agentSteps.length, done: true, statusMessage: output.finalNarrative } : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRun((current) => current?.source === "backend" ? { ...current, step: agentSteps.length, done: true, error: message, statusMessage: "" } : current);
    }
  };

  const startMarketScan = () => startBackendRun({ mode: "scan", targetCountryId: "brazil", regionId: "global", customerId: "cencosud" });
  const startCountryPackage = () => {
    const target = window.AgentApi.targetForCountry(selectedCountry);
    if (target) {
      return startBackendRun({ mode: "package", targetCountryId: selectedCountry, regionId: target.regionId, customerId: target.customerId });
    }
    setRun({ source: "local", mode: "package", step: 0, done: false, targetCountryId: selectedCountry });
    return undefined;
  };

  // Esc 逐级退出：作战包 → 运行浮层 → 国家 → 区域
  useAppEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (pkgCountry) { setPkgCountry(null); return; }
      if (run) { setRun(null); return; }
      if (selectedCountry) backToRegion();
      else if (selectedRegion) backToGlobal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pkgCountry, run, selectedCountry, selectedRegion]);

  const palette = t.palette;
  const themeStyle = {
    "--accent": palette[0], "--mint": palette[1], "--canvas": palette[2], "--ink": palette[3], "--muted": palette[4]
  };

  return (
    <main className={`app density-${t.density}`} style={themeStyle} data-screen-label="海外商机决策 Agent">
      <Header onScan={startMarketScan} scanning={run?.mode === "scan" && !run.done} agentStatus={agentStatus}></Header>
      <div className="app-stage">
        <section className="map-stage">
          <div className="map-stage-copy">
            <span>GLOBAL OPPORTUNITY ATLAS</span>
            <h2>{selectedRegion ? `${regions[selectedRegion].name} · 重点国家` : "让全球商机变得可见"}</h2>
            <p>{selectedRegion ? "点击国家，查看客户、打法与下一步行动" : "拖动地球，悬停预览区域机会，点击锁定后下钻国家"}</p>
          </div>
          <Globe
            regions={regions}
            countries={countries}
            continentFeatures={continentFeatures}
            selectedRegion={selectedRegion}
            selectedCountry={selectedCountry}
            hoverRegion={hoverRegion}
            onHoverRegion={setHoverRegion}
            onSelectRegion={selectRegion}
            onSelectCountry={selectCountry}
            onBack={backToGlobal}
            motion={t.motion}
          ></Globe>
          <SignalTicker signals={signals} onPick={selectCountry} motion={t.motion}></SignalTicker>
          <AgentRail steps={agentSteps} activeStep={activeStep}></AgentRail>
        </section>

        <aside className="intelligence-panel" data-screen-label="Agent 情报面板">
          {country ? (
            <CountryPanel country={country} region={regions[country.region]} onBack={backToRegion} onGenerate={startCountryPackage} generating={run?.mode === "package" && !run.done} notify={notify} packageReady={pkgReady.has(country.id)} onViewPackage={() => setPkgCountry(country.id)} liveReport={liveReports[country.id]}></CountryPanel>
          ) : (
            <RegionPanel region={region} countries={countries} onSelectCountry={selectCountry} pinned={Boolean(selectedRegion)}></RegionPanel>
          )}
        </aside>
      </div>

      {run && (
        <AgentRunOverlay
          steps={agentSteps}
          active={run.done ? agentSteps.length : run.step}
          mode={run.mode}
          onClose={() => setRun(null)}
          onViewPackage={() => { setPkgCountry(run.targetCountryId || selectedCountry); setRun(null); }}
          statusMessage={run.statusMessage}
          error={run.error}
        ></AgentRunOverlay>
      )}
      {pkgCountry && countries[pkgCountry] && (
        <BattlePackageDrawer
          country={countries[pkgCountry]}
          region={regions[countries[pkgCountry].region]}
          onClose={() => setPkgCountry(null)}
          notify={notify}
          liveReport={liveReports[pkgCountry]}
        ></BattlePackageDrawer>
      )}
      {toast && <div className="toast"><Icon name="check" size={16}></Icon>{toast}</div>}

      <TweaksPanel title="风格">
        <TweakSection label="视觉主题"></TweakSection>
        <TweakColor label="主题色板" value={t.palette} options={[
          ["#F47C61", "#DDF2EC", "#F7F3E8", "#24443D", "#6E8F87"],
          ["#E7984C", "#E5F0E4", "#FAF6E9", "#30443A", "#788B7F"],
          ["#5F91B5", "#E1F1F4", "#F8F3E9", "#283F4A", "#718A94"]
        ]} onChange={(value) => setTweak("palette", value)}></TweakColor>
        <TweakSection label="展示节奏"></TweakSection>
        <TweakRadio label="信息密度" value={t.density} options={[{ value: "stage", label: "路演" }, { value: "dense", label: "详览" }]} onChange={(value) => setTweak("density", value)}></TweakRadio>
        <TweakToggle label="环境动效" value={t.motion} onChange={(value) => setTweak("motion", value)}></TweakToggle>
      </TweaksPanel>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App></App>);
