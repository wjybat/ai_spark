const { useEffect: useAppEffect, useMemo: useAppMemo, useState: useAppState } = React;
const MARKET_RADAR_URL = window.MARKET_RADAR_URL || "http://localhost:3000";

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

function VerifiedBadge({ count, label = "A级来源" }) {
  return <div className="verified-badge"><Icon name="check" size={18}></Icon><strong>{count}</strong><small>{label}</small></div>;
}

function Header({ onScan, scanning, scanDisabled, agentStatus }) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark"><Icon name="globe" size={22}></Icon><span></span></div>
        <div>
          <div className="brand-line"><strong>海外商机洞察与决策智能体</strong></div>
          <p>从全球信号到销售行动，一次完成</p>
        </div>
      </div>
      <div className="header-actions">
        <div className={`live-pill ${agentStatus?.ok ? "is-connected" : "is-offline"}`}><i></i>{agentStatus?.ok ? "智能分析服务 · 已就绪" : "智能分析服务连接中"}</div>
        <a className="market-radar-header-link" data-market-radar-link href={MARKET_RADAR_URL} target="_blank" rel="noopener noreferrer"><Icon name="target" size={16}></Icon>市场雷达</a>
        <button type="button" className="scan-button" onClick={onScan} disabled={scanning || scanDisabled} title="整理现有市场与客户资料">
          <Icon name="scan" size={17}></Icon>{scanning ? "扫描中" : "重新扫描市场"}
        </button>
      </div>
    </header>
  );
}

function AgentRail({ steps, activeStep, minimized, onExpand }) {
  return (
    <div className="agent-rail" aria-label="智能分析流程" aria-live="polite">
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
      {minimized && <button type="button" className="rail-progress-button" onClick={onExpand}>查看进度</button>}
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
  const market = region.market;
  const meta = window.OPPORTUNITY_DATA.continentMeta;
  const [tab, setTab] = useAppState("overview");
  const scrollRef = React.useRef(null);
  const tabs = [{ id: "overview", label: "市场全景" }, { id: "events", label: "展会日历" }, { id: "signals", label: "信号与风险" }];
  useAppEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [region.id, tab]);
  const moveTab = (event, index) => {
    const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = tabs[keys[event.key]].id;
    setTab(next);
    document.getElementById(`continent-${region.id}-${next}`)?.focus();
  };
  const sourceLink = (item) => <a className="continent-source-link" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<Icon name="arrow" size={12}></Icon></a>;
  const sources = [...new Map([market.snapshot.source, ...market.signals.map(item => item.source).filter(Boolean), ...market.events.map(item => item.source)].map(item => [item.url, item])).values()];
  const dimensionCards = (compact = false) => <div className={`continent-dimensions ${compact ? "is-compact" : ""}`}>
    {market.dimensions.map(item => <article className={`continent-dimension ${item.key === "risk" ? "is-risk" : ""}`} key={item.key}>
      <div><span>{item.label}</span><strong>{item.score}<small>/100</small></strong></div>
      <div className="continent-meter" role="meter" aria-label={`${item.label} · ${item.verdict}${item.key === "risk" ? "，越高风险越大" : ""}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={item.score}><i style={{ width: `${item.score}%` }}></i></div>
      <b>{item.verdict}</b>{!compact && <p>{item.detail}</p>}
    </article>)}
  </div>;
  return (
    <div className="continent-panel" data-continent={region.id} style={{ "--continent-color": region.color }}>
      <header className="continent-head">
        <div className="panel-kicker"><span style={{ background: region.color }}></span>{region.en}<em className={`lock-tag ${pinned ? "is-locked" : ""}`}>{pinned ? "已锁定" : "悬停预览 · 点击区域锁定"}</em></div>
        <div className="continent-title"><h1>{region.name}<span>零售市场简报</span></h1><span className="continent-edition">SEP<br/><b>2026</b></span></div>
        <p className="continent-thesis">{market.thesis}</p>
        <div className="continent-metrics">
          <Metric label="零售公司 · 演示估算" value={market.companies} meta="家经营主体"></Metric>
          <Metric label="连锁品牌 · 演示估算" value={market.brands} meta="个品牌网络"></Metric>
          <Metric label="近 12 个月展会" value={`${market.events.length} 场`} meta="已收录代表性活动"></Metric>
        </div>
        <div className="continent-tabs" role="tablist" aria-label={`${region.name}市场简报章节`}>
          {tabs.map((item, index) => <button key={item.id} type="button" role="tab" id={`continent-${region.id}-${item.id}`} aria-selected={tab === item.id} aria-controls={`continent-content-${region.id}`} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)} onKeyDown={event => moveTab(event, index)}>{item.label}{item.id === "events" && <small>{market.events.length}</small>}</button>)}
        </div>
      </header>
      <div className="continent-body" ref={scrollRef} role="tabpanel" id={`continent-content-${region.id}`} aria-labelledby={`continent-${region.id}-${tab}`} tabIndex="0" data-continent-tab={tab}>
        {tab === "overview" && <>
          <section className="continent-section">
            <div className="section-heading"><span>市场整体情况</span><small>区域研判</small></div>
            <p className="continent-copy">{market.summary}</p><p className="continent-copy">{market.structure}</p>
            <div className="continent-formats">{market.formats.map(item => <span key={item}>{item}</span>)}</div>
          </section>
          <div className="continent-fact"><span className="continent-fact-caption">公开资料 · 市场切片</span><div><strong>{market.snapshot.value}</strong><span>{market.snapshot.label}</span></div><p>{market.snapshot.scope}</p>{sourceLink(market.snapshot.source)}</div>
          <section className="continent-section">
            <div className="section-heading"><span>市场温度</span><small>演示研判 · 风险分越高风险越大</small></div>
            {dimensionCards(true)}
            <button className="continent-text-button" type="button" onClick={() => setTab("signals")}>查看信号依据与风险应对<Icon name="arrow" size={14}></Icon></button>
          </section>
          <section className="continent-section">
            <div className="section-heading"><span>重点市场与零售版图</span><small>{market.posture}</small></div>
            <div className="continent-focus">{market.focus.map(item => <div key={item.name}><strong>{item.name}</strong><span>{item.reason}</span></div>)}</div>
            <p className="continent-retailers"><b>代表零售集团 / 品牌</b>{market.retailers.join(" · ")}</p>
          </section>
          <section className="continent-section">
            <div className="section-heading"><span>已收录国家资料</span><small>{region.countryIds.length} 国 · 可进入客户详情</small></div>
            <div className="country-ranking">{region.countryIds.map((id, index) => {
              const country = countries[id];
              return <button type="button" className="country-row" key={id} onClick={() => onSelectCountry(id)}><span className="rank-index">{String(index + 1).padStart(2, "0")}</span><div className="country-row-main"><strong>{country.name}</strong><small>{country.tagline}</small></div><div className="country-row-tags"><em>{country.priority}</em><Icon name="chevron" size={16}></Icon></div></button>;
            })}</div>
          </section>
        </>}
        {tab === "events" && <>
          <section className="continent-section">
            <div className="section-heading"><span>近 12 个月零售相关展会</span><small>按举办地归洲</small></div>
            <div className="continent-date-window"><Icon name="globe" size={15}></Icon><span>{meta.windowStart} — {meta.windowEnd}</span><b>{market.events.length} 场</b></div>
            <p className="continent-copy">从已收录展会的议程、展商和案例回看市场动向，为下一轮客户拜访准备线索。</p>
            <div className="continent-events">{market.events.map(item => <article className="continent-event" key={item.name}>
              <div className="continent-event-month"><strong>{item.start.slice(5, 7)}<small>月</small></strong><span>{item.start.slice(0, 4)}</span></div>
              <div className="continent-event-detail"><div className="continent-event-date"><time dateTime={item.start}>{item.start}</time><span>—</span><time dateTime={item.end}>{item.end}</time></div><h2>{item.name}</h2><span className="continent-event-city">{item.city}</span><p>{item.theme}</p><div className="continent-event-action"><b>跟进方向</b>{item.followUp}</div>{sourceLink(item.source)}</div>
            </article>)}</div>
            <p className="continent-footnote">日期取对应届次官方公告。仅列窗口内代表性活动；展会线索不代表参展企业正在采购。</p>
          </section>
        </>}
        {tab === "signals" && <>
          <section className="continent-section"><div className="section-heading"><span>四维市场判断</span><small>演示评分 · 0–100</small></div>{dimensionCards()}<p className="continent-footnote">活跃度、数字化和扩张分越高表示程度越高；风险分越高表示进入风险越大。</p></section>
          <section className="continent-section"><div className="section-heading"><span>值得跟进的信号</span><small>公开事实 + 场景研判</small></div><div className="continent-signals">{market.signals.map(item => <article key={item.title}>
            <div className="continent-signal-tags"><span>{item.type}</span><small>{item.source ? "有来源依据" : "场景研判"}</small></div><h2>{item.title}</h2><p>{item.detail}</p><div className="continent-signal-action"><Icon name="arrow" size={14}></Icon><span>{item.action}</span></div>{item.source && sourceLink(item.source)}
          </article>)}</div></section>
          <section className="continent-section"><div className="section-heading"><span>主要风险与应对</span><small>区域研判</small></div><div className="continent-risks">{market.risks.map(item => <article key={item.title}><Icon name="shield" size={18}></Icon><div><h2>{item.title}</h2><p>{item.detail}</p><span><b>应对</b>{item.response}</span></div></article>)}</div></section>
          <div className="continent-next-step"><span>下一步建议</span><p>{market.nextStep}</p></div>
        </>}
        <details className="continent-method" key={`${region.id}-${tab}`}><summary>数据口径与来源<span>截至 {meta.asOf}</span></summary><p>{meta.countMethod}</p><p>{meta.scoreMethod}</p><p>{meta.scopeNote}</p><div>{sources.map(item => <React.Fragment key={item.url}>{sourceLink(item)}</React.Fragment>)}</div></details>
      </div>
    </div>
  );
}

function OpportunityOverview({ country }) {
  return (
    <div className="tab-body">
      <div className="insight-hero">
        <div><span>已核验市场资料</span><p>{country.marketBrief}</p></div>
        <div className="confidence"><small>证据等级</small><strong>A</strong><i><b style={{ width: "100%" }}></b></i></div>
      </div>
      <div className="two-column-block">
        <section>
          <div className="section-heading"><span>已确认事实与动态</span><small>{country.signalCount} 条调研摘要</small></div>
          <div className="evidence-list">
            {country.opportunities.map((item, index) => (
              <div className="evidence-item" key={item}><span><Icon name="signal" size={16}></Icon></span><div><b>事实 {String(index + 1).padStart(2, "0")}</b><p>{item}</p></div></div>
            ))}
          </div>
        </section>
        <section>
          <div className="section-heading"><span>来源索引</span><small>点击查看原始依据</small></div>
          <div className="source-index-list">
            {country.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><i>{source.level}</i><span>{source.title}</span><Icon name="arrow" size={13}></Icon></a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CandidateCustomerCard({ customer, index }) {
  return (
    <article className="customer-card candidate-customer-card" data-candidate-customer={customer.name} aria-label={`${customer.name}，客户资料卡，未开放作战视图`}>
      <div className="customer-card-head">
        <span className="customer-index">{String(index + 1).padStart(2, "0")}</span>
        <div><strong>{customer.name}</strong><small>{customer.type} · {customer.stores}</small></div>
        <div className="customer-score"><span>来源</span><b>{customer.sourceLevel}</b></div>
        <Icon name="check" size={15}></Icon>
      </div>
      <div className="customer-card-detail">
        <div><span>业务观察</span><p>{customer.signal}</p></div>
        <div><span>潜在切入</span><p>{customer.modules.join(" · ")}</p></div>
        <div><span>关注事项</span><p>{customer.risk}</p></div>
      </div>
      <div className="customer-card-action candidate-card-source"><span>进入客户作战视图</span><small>销售建议 · 作战卡</small><Icon name="arrow" size={15}></Icon></div>
    </article>
  );
}

function CustomerRadar({ country, onSelectCustomer }) {
  return (
    <div className="tab-body">
      <div className="customer-summary"><span><Icon name="users" size={18}></Icon></span><p>当前客户池展示 <strong>{country.customers.length} 家零售企业</strong>。</p></div>
      <div className="customer-list">
        {country.customers.map((customer, index) => customer.selectable === false
          ? <CandidateCustomerCard key={customer.name} customer={customer} index={index}></CandidateCustomerCard>
          : <button type="button" className="customer-card customer-entry-card" data-customer-entry={country.companyId} key={customer.name} onClick={() => onSelectCustomer({ ...customer, customerId: country.companyId, countryId: country.id })}>
              <div className="customer-card-head">
                <span className="customer-index">{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{customer.name}</strong><small>{customer.type} · {customer.stores}</small></div>
                <div className="customer-score"><span>来源</span><b>{customer.sourceLevel}</b></div>
                <Icon name="chevron" size={17}></Icon>
              </div>
              <div className="customer-card-detail">
                  <div><span>已确认信号</span><p>{customer.signal}</p></div>
                  <div><span>文档建议切入</span><p>{customer.modules.join(" · ")}</p></div>
                  <div><span>风险与未知</span><p>{customer.risk}</p></div>
              </div>
              <div className="customer-card-action"><span>进入客户作战视图</span><small>概览 · 系统 · 动态 · 建议</small><Icon name="arrow" size={15}></Icon></div>
            </button>
        )}
      </div>
    </div>
  );
}

function CustomerResearchView({ tab, country, customer, sourceProfile, liveReport }) {
  const hasLiveProfile = liveReport?.customerProfile?.customerId === customer.customerId;
  const liveProfile = hasLiveProfile ? liveReport.customerProfile : null;
  const profile = liveProfile || {
    name: sourceProfile.name,
    headquarters: sourceProfile.headquarters,
    countries: sourceProfile.countries,
    formats: sourceProfile.formats,
    storeCountLabel: sourceProfile.groupStores,
    revenueLabel: sourceProfile.revenue,
    revenuePeriod: "最新已收录公开口径",
    businessAreas: sourceProfile.businessAreas,
    digitalFoundation: sourceProfile.digitalFoundation,
    knownSystems: sourceProfile.knownSystems,
    organization: sourceProfile.organization,
    recentDynamics: sourceProfile.recentDynamics,
    decisionRoles: sourceProfile.decisionRoles,
    unknowns: sourceProfile.unknowns,
  };
  const evidence = hasLiveProfile
    ? reportList(liveReport.evidenceChain?.records)
    : reportList(sourceProfile.sources).map((source, index) => ({ ...source, id: `source-${index + 1}`, sourceLevel: source.level, sourceUrl: source.url, kind: "fact" }));
  const positioning = hasLiveProfile ? liveReport.productMatch?.positioning : sourceProfile.strategicSummary;
  const pageContent = {
    profile: <>
      <div className="customer-research-hero">
        <div><small>前置资料搜集 · 客户概览</small><h2>{profile.name}</h2><p>{sourceProfile.type}</p></div>
        <span><b>{evidence.filter(item => (item.sourceLevel || item.level) === "A").length}</b> 项 A 级来源</span>
      </div>
      <div className="report-grid customer-profile-grid">
        {[
          ["当前市场", country.name], ["集团总部", profile.headquarters], ["集团规模", profile.storeCountLabel],
          ["收入规模", `${profile.revenueLabel}${profile.revenuePeriod ? ` · ${profile.revenuePeriod}` : ""}`],
          ["覆盖国家", reportList(profile.countries).join(" · ")], ["零售业态", reportList(profile.formats).join(" · ")]
        ].map(([label, value]) => <article className="report-card" key={label}><b>{label}</b><ReportText value={value}></ReportText></article>)}
      </div>
    </>,
    business: <>
      <ReportSection title="业务版图" meta="公开资料归纳的主要经营板块">
        <div className="customer-research-chips">{reportList(profile.businessAreas).map(item => <span key={item}>{item}</span>)}</div>
      </ReportSection>
      <ReportSection title="客户经营特征" meta="用于确定后续研究方向">
        <div className="customer-research-callout"><Icon name="signal" size={17}></Icon><ReportText value={positioning}></ReportText></div>
      </ReportSection>
      <ReportSection title="业态组合"><ReportList items={profile.formats}></ReportList></ReportSection>
    </>,
    digital: <>
      <div className="report-grid customer-research-columns">
        <ReportSection title="数字化基础"><ReportList items={profile.digitalFoundation}></ReportList></ReportSection>
        <ReportSection title="已知系统"><ReportList items={profile.knownSystems}></ReportList></ReportSection>
      </div>
      <ReportSection title="组织与技术能力"><div className="customer-research-callout"><Icon name="users" size={17}></Icon><ReportText value={profile.organization}></ReportText></div></ReportSection>
      <p className="customer-research-note">系统名称来自公开资料，仅表示已发现的技术基础，不代表当前版本、部署范围或采购意向。</p>
    </>,
    dynamics: <>
      <ReportSection title="近期经营与管理动态" meta={`${reportList(profile.recentDynamics).length} 条已收录线索`}><ReportList items={profile.recentDynamics}></ReportList></ReportSection>
      <ReportSection title="优先关注角色" meta="角色线索，不代表已确认联系人"><div className="customer-role-chips">{reportList(profile.decisionRoles).map(role => <span key={role}>{role}</span>)}</div></ReportSection>
      <ReportSection title="仍需补充的信息"><ReportList items={profile.unknowns}></ReportList></ReportSection>
    </>,
    evidence: <>
      <ReportSection title="资料来源" meta={`${evidence.length} 条可回溯记录`}>
        <div className="report-stack">{evidence.map((record, index) => <article className="report-card customer-source-card" key={record.id || record.sourceUrl || index}>
          <div className="report-card-heading"><strong>{record.title}</strong><span className="report-badge">{record.sourceLevel || record.level || "A"}级 · {record.kind === "inference" ? "分析推断" : "公开资料"}</span></div>
          <ReportText value={record.excerpt || "用于支持客户规模、业务布局、数字化基础与近期动态的前置调研资料。"}></ReportText>
          {record.publishedAt && <small>发布于 {record.publishedAt} · 收录于 {record.retrievedAt || "资料库"}</small>}
          {(record.sourceUrl || record.url) && <a className="report-source-link" href={record.sourceUrl || record.url} target="_blank" rel="noopener noreferrer">查看原始资料 ↗</a>}
        </article>)}</div>
      </ReportSection>
      <ReportSection title="资料使用说明"><p className="customer-research-note">客户资料来自前置搜集环节；事实、推断和信息缺口分开展示，销售行动与能力匹配需在智能分析后结合当前国家进一步判断。</p></ReportSection>
    </>
  }[tab];

  return <div className="tab-body customer-research-page" data-customer-research-tab={tab} data-report-run={hasLiveProfile ? liveReport.runId : "source-data"}>{pageContent}</div>;
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
        <div><span><Icon name="mail" size={16}></Icon>英文开发邮件</span><small>待智能体分析</small></div>
        <strong>完成分析后生成个性化邮件</strong>
        <p>点击底部“运行完整商机分析链路”后，智能体会基于该客户真实证据生成英文邮件、拜访问题和下一步行动。</p>
      </div>
    </div>
  );
}

function BattleCard({ country, customer }) {
  const lead = customer || country.customers[0];
  return (
    <div className="tab-body battle-card-grid">
      <div className="battle-lead">
        <span>真实调研客户</span><strong>{lead.name}</strong><p>{lead.type} · {lead.stores}</p><em>{lead.sourceLevel}来源</em>
      </div>
      <div className="battle-block"><span>推荐切入模块</span><div className="module-chips">{lead.modules.map((module) => <b key={module}>{module}</b>)}</div></div>
      <div className="battle-block"><span>已确认事实</span><p>{country.opportunities[1] || country.opportunities[0]}</p></div>
      <div className="battle-block"><span>决策联系人</span><p>待智能体根据客户画像和资料分析</p></div>
      <div className="battle-block"><span>分析状态</span><p>尚未运行；不预置模拟试点或 ROI</p></div>
      <div className="battle-block risk"><span><Icon name="shield" size={16}></Icon>风险与未知</span><p>{lead.risk}</p></div>
    </div>
  );
}

function ManagementBrief({ country, onCopy }) {
  return (
    <div className="tab-body brief-page">
      <div className="brief-stamp">SOURCE DATA BRIEF · {country.en.toUpperCase()}</div>
      <h2>{country.name} 已核验资料摘要</h2>
      <p className="brief-lead">当前国家报告已纳入潜在客户样本 {country.customers[0].name}：{country.customers[0].stores}；{country.pipeline}。准入、商机和行动结论将在智能分析后生成，后续可继续扩充客户名单。</p>
      <div className="brief-grid">
        <div><span>Verified facts</span><p>{country.opportunities.slice(0, 2).join("；")}。</p></div>
        <div><span>Research entry</span><p>{country.recommendations[0]}</p></div>
        <div><span>Sources</span><p>{country.sources.length} 个 A 级来源，均可回溯原文。</p></div>
        <div><span>Next step</span><p>启动智能分析，生成准入建议、证据链、能力匹配、风险和行动材料。</p></div>
      </div>
      <div className="brief-actions">
        <button type="button" onClick={onCopy}><Icon name="copy" size={16}></Icon>复制简报</button>
      </div>
    </div>
  );
}

function LiveAgentResult({ report, country }) {
  const brief = report.researchBrief;
  return (
    <div className="tab-body live-agent-result">
      <div className="live-result-hero">
        <div><span>智能分析报告 · 已完成</span><h2>{country?.name || report.countryName || report.marketRadar?.regionName}</h2><p className="live-result-subtitle">国家商机报告 · 当前潜在客户样本：{report.customerProfile.name}</p><MarkdownContent className="live-result-narrative" content={countryReportNarrative(report.finalNarrative)}></MarkdownContent></div>
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
                <i>{record.sourceLevel}</i><div><b>{record.title}</b><p>{record.excerpt}</p><small>{record.publishedAt} · {record.kind === "fact" ? "已核验事实" : "分析推断"}</small></div>
              </a>
            ))}
          </div>
        </section>
        <section>
          <div className="section-heading"><span>Dmall 能力匹配</span><small>含前置条件</small></div>
          <p className="report-note">{materialSourceLabel(report.productMatch.generation)}</p>
          <div className="live-match-list">
            {report.productMatch.matches.slice(0, 4).map((match) => (
              <div key={match.capabilityId}><span><b>{match.capabilityName}</b><em>{match.fitScore}</em></span><i><u style={{ width: `${match.fitScore}%` }}></u></i><MarkdownContent className="live-match-reason" content={match.reasons.join("\n\n")}></MarkdownContent>{match.pilotScope && <MarkdownContent className="live-match-reason" content={`**建议验证范围**\n\n${match.pilotScope}`}></MarkdownContent>}<p>禁止直接宣称：<MarkdownContent inline content={match.caution}></MarkdownContent></p></div>
            ))}
          </div>
          <div className="section-heading live-risk-heading"><span>风险与待确认项</span><small>人工确认门禁</small></div>
          <div className="live-risk-list">
            {report.riskAssessment.risks.slice(0, 4).map((risk) => <div key={risk.id}><Icon name="shield" size={14}></Icon><p><b>{risk.title}</b><MarkdownContent inline content={risk.reason}></MarkdownContent></p></div>)}
          </div>
        </section>
      </div>
      <section className="live-brief-card">
        <div className="section-heading"><span>客户研究简报</span><small>{brief.generatedAt.slice(0, 10)} 生成</small></div>
        <MarkdownContent className="live-brief-summary" content={brief.executiveSummary}></MarkdownContent>
        <div className="live-brief-field"><b>建议切入</b><MarkdownContent inline content={brief.recommendedEntryPoints.join(" · ")}></MarkdownContent></div>
        <div className="live-brief-field"><b>下一步</b><MarkdownContent inline content={brief.nextActions.join("；")}></MarkdownContent></div>
      </section>
    </div>
  );
}

function CountryPanel({ country, region, onBack, onGenerate, generating, notify, packageReady, onViewPackage, liveReport, countryReport, briefRequest, briefRun, selectedCustomer: controlledCustomer, onSelectCustomer: controlledSelectCustomer }) {
  const [internalCustomer, setInternalCustomer] = useAppState(null);
  const selectedCustomer = controlledCustomer === undefined ? internalCustomer : controlledCustomer;
  const selectCustomer = controlledSelectCustomer || setInternalCustomer;
  const tabs = selectedCustomer
    ? [["profile", "客户概览"], ["business", "业务布局"], ["digital", "数字化与系统"], ["dynamics", "动态与组织"], ["evidence", "资料来源"], ["sales", "销售建议"], ["battle", "作战卡"]]
    : [["country", "国家概况"], ["overview", "市场与商机"], ["customers", "客户雷达"], ["brief", "管理层简报"]];
  const [tab, setTab] = useAppState("country");
  const [briefReveal, setBriefReveal] = useAppState(0);
  const tabScrollRef = React.useRef(null);
  const navigationRef = React.useRef({ countryId: null, customerId: null, runId: null });

  useAppEffect(() => {
    const current = { countryId: country.id, customerId: selectedCustomer?.customerId || null, runId: countryReport?.runId || null, briefRequest };
    const previous = navigationRef.current;
    if (previous.countryId !== current.countryId) setTab(current.customerId ? "profile" : briefRequest ? "brief" : "country");
    else if (current.customerId && previous.customerId !== current.customerId) setTab("profile");
    else if (!current.customerId && briefRequest && previous.briefRequest !== briefRequest) setTab("brief");
    else if (!current.customerId && previous.customerId) setTab("customers");
    else if (!current.customerId && (previous.runId !== current.runId || previous.briefRequest !== current.briefRequest)) setTab(current.runId || briefRequest ? "brief" : "country");
    navigationRef.current = current;
  }, [country.id, countryReport?.runId, selectedCustomer?.customerId, briefRequest]);
  useAppEffect(() => { if (tabScrollRef.current) tabScrollRef.current.scrollTop = 0; }, [tab, country.id, liveReport?.runId, countryReport?.runId, selectedCustomer?.customerId]);
  useAppEffect(() => {
    if (tab !== "brief" || selectedCustomer) return;
    // Re-selecting the current tab must also reveal the result at the top.
    const panel = tabScrollRef.current;
    if (!panel) return;
    panel.scrollTop = 0;
    panel.querySelector(".brief-result-heading")?.focus({ preventScroll: true });
  }, [tab, country.id, countryReport?.runId, briefRequest, briefReveal, selectedCustomer?.customerId]);
  const openBrief = () => { setTab("brief"); setBriefReveal(value => value + 1); };

  const enterCustomer = (customer) => { selectCustomer({ ...customer, countryId: country.id }); setTab("profile"); };
  const returnToCountry = () => { selectCustomer(null); setTab("customers"); };
  const liveProfile = liveReport?.customerProfile;
  const sourceProfile = Object.values(window.OPPORTUNITY_DATA.companyProfiles).find(profile => profile.id === (selectedCustomer?.customerId || country.companyId));
  const headerName = selectedCustomer ? (liveProfile?.customerId === selectedCustomer.customerId ? liveProfile.name : selectedCustomer.name) : country.name;
  const headerSubtitle = selectedCustomer
    ? liveProfile?.customerId === selectedCustomer.customerId ? `${country.name} · ${liveProfile.formats.slice(0, 3).join(" / ")}` : `${country.name} · ${selectedCustomer.type}`
    : country.research.positioning;
  const headerMetrics = selectedCustomer
    ? liveReport ? [["分析状态", liveReport.admission.label], ["集团规模", liveProfile.storeCountLabel.split("（")[0]], ["覆盖国家", liveProfile.countries.length], ["资料来源", liveReport.evidenceChain.records.length]]
      : [["资料状态", "已收录"], ["集团规模", sourceProfile.groupStores], ["覆盖国家", sourceProfile.countries.length], ["资料来源", sourceProfile.sources.length]]
    : [...country.research.counts.map(item => [`${item.label} · 估算`, `${item.value}${item.unit}`]), ["市场观察", `${country.research.signals.length} 条`]];

  const briefText = countryBriefText(country, countryReport);
  const copyBrief = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(briefText);
      notify("国家管理层简报已复制");
    } catch {
      notify("复制失败，请允许浏览器访问剪贴板");
    }
  };

  return (
    <div className={`country-panel-shell ${selectedCustomer ? "is-customer-level" : "is-country-level"}`} data-view-level={selectedCustomer ? "customer" : "country"}>
      <div className="country-panel-head">
        <button type="button" className="back-link" onClick={selectedCustomer ? returnToCountry : onBack}><Icon name="back" size={16}></Icon>{selectedCustomer ? `${country.name} · 客户雷达` : `${region.name}雷达`}</button>
        <div className="country-head-main">
          <div><div className="panel-kicker"><span style={{ background: region.color }}></span>{selectedCustomer ? `${country.en.toUpperCase()} · CUSTOMER PROFILE` : `${country.en.toUpperCase()} OPPORTUNITY`}</div><h1>{headerName}</h1><p>{headerSubtitle}</p></div>
          {selectedCustomer ? (liveReport ? <ScoreRing value={liveReport.admission.referenceScore} size="compact"></ScoreRing> : <VerifiedBadge count={country.sourceCount}></VerifiedBadge>) : <div className="national-header-stamp"><b>COUNTRY BRIEF</b><span>{window.OPPORTUNITY_DATA.countryMeta.asOf}</span></div>}
        </div>
        <div className="country-quick-metrics">
          {headerMetrics.map(([label, value]) => <Metric key={label} label={label} value={value}></Metric>)}
        </div>
      </div>
      <nav className="detail-tabs" aria-label={selectedCustomer ? "客户作战视图" : "国家详情"}>
        {tabs.map(([id, label]) => <button type="button" key={id} className={`${tab === id ? "is-active" : ""}${id === "brief" && countryReport?.generation.source === "llm" ? " has-generated-brief" : ""}`} title={id === "brief" && countryReport ? "查看已生成的国家简报" : undefined} onClick={id === "brief" ? openBrief : () => setTab(id)}>{label}</button>)}
      </nav>
      <div className="country-tab-scroll" ref={tabScrollRef}>
        {selectedCustomer ? (["profile", "business", "digital", "dynamics", "evidence"].includes(tab)
          ? <CustomerResearchView tab={tab} country={country} customer={selectedCustomer} sourceProfile={sourceProfile} liveReport={liveReport}></CustomerResearchView>
          : liveReport
            ? <ReportTab tab={tab} report={liveReport} country={country} generating={generating} onCopy={copyBrief}></ReportTab>
            : <>{tab === "sales" && <SalesAdvice country={country}></SalesAdvice>}{tab === "battle" && <BattleCard country={country} customer={selectedCustomer}></BattleCard>}</>)
          : <>
          {tab === "country" && <CountryOverview country={country} />}
          {tab === "overview" && <CountryMarketRadar country={country} onCustomers={() => setTab("customers")} />}
          {tab === "customers" && <CustomerRadar country={country} onSelectCustomer={enterCustomer} />}
          {tab === "brief" && <CountryManagementBrief country={country} report={countryReport} generating={briefRun === undefined ? generating : Boolean(briefRun && !briefRun.done)} run={briefRun} onCopy={copyBrief} />}
          </>}
      </div>
      <div className="panel-footer-action">
        <div><Icon name="spark" size={18}></Icon><span><b>{selectedCustomer ? "客户作战智能体" : "国家简报智能体"}</b><small>{selectedCustomer ? headerName : "综合本国三家企业资料"}</small></span></div>
        <div className="footer-buttons">
          {selectedCustomer && packageReady && !generating && (
            <button type="button" className="ghost" onClick={onViewPackage}>查看作战包</button>
          )}
          {!selectedCustomer && countryReport && !generating && <button type="button" className="ghost" onClick={openBrief}>查看国家简报</button>}
          <button type="button" onClick={onGenerate} disabled={generating}>{generating ? "生成中" : selectedCustomer ? packageReady ? "重新生成" : "生成 BD 作战包" : countryReport ? "重新生成国家简报" : "生成国家简报"}<Icon name="arrow" size={16}></Icon></button>
        </div>
      </div>
    </div>
  );
}

function AgentRunOverlay({ steps, active, mode, onClose, onMinimize, onViewPackage, statusMessage, error }) {
  const done = active >= steps.length;
  return (
    <div className="agent-run-backdrop" role="dialog" aria-modal="true" aria-label="智能分析状态">
      <div className="agent-run-card">
        {done && <button type="button" className="overlay-close" onClick={onClose}><Icon name="close" size={18}></Icon></button>}
        {!done && ["package","country"].includes(mode) && <button type="button" className="overlay-minimize" onClick={onMinimize}>最小化</button>}
        <div className={`agent-orb ${done && !error ? "is-done" : ""} ${error ? "is-error" : ""}`}>{done && !error ? <Icon name="check" size={27}></Icon> : <Icon name={error ? "close" : "spark"} size={25}></Icon>}</div>
        <span className="run-eyebrow">全球商机智能分析</span>
        <h2>{error ? "智能分析未完成" : done ? (mode === "country" ? "国家管理层简报已生成" : mode === "scan" ? "市场扫描已完成" : "客户作战材料已生成") : (mode === "country" ? "正在综合三家企业生成国家简报" : mode === "scan" ? "正在分析市场与客户" : "正在运行完整商机分析链路")}</h2>
        <MarkdownContent className={`run-status ${done ? "run-conclusion" : ""}`} content={error || statusMessage || (done ? "证据链、准入评估、能力匹配、风险和客户简报均已生成。" : `正在处理：${steps[Math.min(active, steps.length - 1)]}`)}></MarkdownContent>
        <div className="run-steps">
          {steps.map((step, index) => <i key={step} className={active > index ? "done" : active === index ? "active" : ""}><span>{active > index ? <Icon name="check" size={11}></Icon> : index + 1}</span><b>{step}</b></i>)}
        </div>
        <div className="run-progress"><i style={{ width: `${Math.min(100, (active / steps.length) * 100)}%` }}></i></div>
        {done && (
          <div className="run-actions">
            {["package","country"].includes(mode) && !error && (
              <button type="button" className="run-complete-button ghost" onClick={onClose}>返回商机地图</button>
            )}
            <button type="button" className="run-complete-button" onClick={["package","country"].includes(mode) && !error ? onViewPackage : onClose}>
              {!error && mode === "country" ? "查看国家管理层简报" : mode === "package" && !error ? "查看智能分析结果" : "返回商机地图"}
              <Icon name="arrow" size={15}></Icon>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function buildLiveBattlePackage(report) {
  const brief = report.researchBrief;
  const profile = report.customerProfile;
  const artifacts = [
    { id: "research", title: "客户研究简报", en: "CUSTOMER RESEARCH", sections: [
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
      { h: "生成方式", paras: [materialSourceLabel(report.productMatch.generation), "分析建议需人工核验，不代表已确认项目或成交概率。"] },
      { h: "切入定位", paras: [report.productMatch.positioning] },
      ...report.productMatch.matches.map((match) => ({ h: `${match.capabilityName}｜匹配参考 ${match.fitScore}`, paras: [...match.reasons, ...(match.pilotScope ? [`建议验证范围：${match.pilotScope}`] : []), `禁止直接宣称：${match.caution}`], list: match.prerequisites })),
      { h: "禁止宣称", list: report.productMatch.avoidClaims }
    ]},
    { id: "risk", title: "风险与待确认项", en: "RISKS & GAPS", sections: [
      { h: `整体风险：${report.riskAssessment.overall}`, list: report.riskAssessment.risks.map((risk) => `${risk.title}｜${risk.reason}｜应对：${risk.mitigation}`) },
      { h: "需人工确认", list: report.riskAssessment.pendingConfirmations }
    ]},
    { id: "email", title: "英文开发邮件", en: "OUTREACH EMAIL", sections: [
      { h: "生成方式", paras: [materialSourceLabel(brief.outreachEmail.generation), "待销售审核，未发送。"] },
      { h: "Subject", paras: [brief.outreachEmail.subject] },
      { h: "Body", paras: [brief.outreachEmail.body] },
      ...(brief.outreachEmail.angle ? [{ h: "写作依据", paras: [brief.outreachEmail.angle], list: brief.outreachEmail.evidenceIds || [] }] : []),
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
      id: "research", title: "客户研究简报", en: "CUSTOMER RESEARCH",
      sections: [
        { h: "客户概览", list: [
          `${lead.name} — ${lead.type}，${country.name}市场，门店规模 ${lead.stores}`,
          `数字化成熟度：${country.demand === "强" ? "中高" : "中"}（基于扩店、招聘与财报信号综合判断）`,
          "关键决策角色：COO / CIO / Head of Digital / Supply Chain Director"
        ]},
        { h: "近期关键信号", list: country.customers.filter((item) => item.selectable !== false).map((item) => `${item.name}：${item.signal}`) },
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
        { h: "回收测算", paras: [`以${country.name} ${country.pipeline} 的潜在线索池估算，单客户 12-18 个月回本为保守假设；试点期以库存准确率、缺货率、门店执行效率作为核心验证指标。`] }
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

  return (
    <div className="package-backdrop" role="dialog" aria-modal="true" aria-label={`${country.name} BD 作战包`} onClick={onClose}>
      <div className="package-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="package-head">
          <div>
            <div className="panel-kicker"><span style={{ background: region.color }}></span>BD BATTLE PACKAGE · {country.en.toUpperCase()}</div>
            <h2>{country.name}作战包</h2>
            <p>7 项材料 · 由 9 个智能分析步骤生成 · 目标客户 {liveReport?.customerProfile.name ?? country.customers[0].name}</p>
          </div>
          <div className="package-head-actions">
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
                {(section.paras || []).map((para, index) => <MarkdownContent key={`${section.h}-paragraph-${index}`} content={para}></MarkdownContent>)}
                {section.list && <ul>{section.list.map((item, index) => <li key={`${section.h}-item-${index}`}><MarkdownContent content={item}></MarkdownContent></li>)}</ul>}
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
  const [marketScan, setMarketScan] = useAppState(null);
  const [marketOverview, setMarketOverview] = useAppState(null);
  const [toast, setToast] = useAppState("");
  const [pkgCountry, setPkgCountry] = useAppState(null);
  const [pkgReady, setPkgReady] = useAppState(() => new Set());
  const [agentStatus, setAgentStatus] = useAppState(null);
  const [liveReports, setLiveReports] = useAppState({});
  const [countryReports, setCountryReports] = useAppState({});
  const [briefFocus, setBriefFocus] = useAppState(null);
  const [customerFocus, setCustomerFocus] = useAppState(null);
  const [panelCollapsed, setPanelCollapsed] = useAppState(true);
  const [runMinimized, setRunMinimized] = useAppState(false);

  const regionId = selectedRegion || hoverRegion || "south_america";
  const region = regions[regionId];
  const country = selectedCountry ? countries[selectedCountry] : null;
  const runSteps = run?.steps || agentSteps;
  const activeStep = run ? (run.done ? runSteps.length : run.step) : -1;

  useAppEffect(() => {
    window.AgentApi.health().then(setAgentStatus).catch(() => setAgentStatus({ ok: false }));
  }, []);

  useAppEffect(() => {
    if (!marketScan || marketScan.done) return undefined;
    const timer = setTimeout(() => {
      setMarketScan(current => {
        if (!current || current.done) return current;
        const step = current.step + 1;
        return { ...current, step, done: step >= MARKET_SCAN_STEPS.length };
      });
    }, 1100);
    return () => clearTimeout(timer);
  }, [marketScan]);

  useAppEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectRegion = (id) => {
    setSelectedRegion(id); setSelectedCountry(null); setCustomerFocus(null); setHoverRegion(null); setPanelCollapsed(false);
  };
  const selectCountry = (id) => {
    const target = countries[id];
    setSelectedRegion(target.region); setSelectedCountry(id); setCustomerFocus(null); setHoverRegion(null); setPanelCollapsed(false);
  };
  const backToGlobal = () => { setSelectedRegion(null); setSelectedCountry(null); setCustomerFocus(null); setHoverRegion(null); };
  const backToRegion = () => { setSelectedCountry(null); setCustomerFocus(null); };
  const notify = (message) => setToast(message);

  const startBackendRun = async ({ targetCountryId, regionId, customerId, countryName, scope }) => {
    const steps = scope === "country" ? ["国家市场与企业名单", ...countries[targetCountryId].research.companies.map(c => `研究 ${c.name}`), "综合国家管理层简报"] : agentSteps;
    setRunMinimized(false);
    if (scope === "country") setBriefFocus(current => ({countryId:targetCountryId,token:(current?.token || 0) + 1}));
    setRun({ source: "backend", mode: scope === "country" ? "country" : "package", steps, step: 0, done: false, targetCountryId, statusMessage: "正在启动智能分析…" });
    try {
      const output = await window.AgentApi.startRun({
        scope,
        regionId,
        customerId,
        countryId: targetCountryId,
        countryName,
        mode: "auto",
        onEvent: (event) => {
          if (event.type === "tool_start") {
            setRun((current) => current?.source === "backend" ? { ...current, step: Math.max(0, (event.stage || 1) - 1), statusMessage: `正在运行：${event.label || event.toolName}` } : current);
          }
          if (event.type === "tool_progress") {
            const progress = event.data?.progress || 50;
            setRun((current) => current?.source === "backend" ? { ...current, step: event.stage ? Math.max(0, event.stage - 1) : current.step, statusMessage: `${event.label || event.toolName} · ${progress}%` } : current);
          }
          if (event.type === "tool_end" && event.data?.validationError) {
            setRun(current => current?.source === "backend" ? {...current,statusMessage:"内容校验未通过，正在修订分析与引用…"} : current);
          }
        }
      });
      if (scope === "country") {
        if (output.scope !== "country" || output.countryId !== targetCountryId) throw new Error("国家简报返回的分析范围不匹配");
        setCountryReports(current => ({...current,[targetCountryId]:output}));
        notify(`${countries[targetCountryId].name}国家简报已更新`);
      } else {
        if (output.customerId !== customerId || output.countryId !== targetCountryId) throw new Error("客户作战包返回的目标不匹配");
        setLiveReports((current) => ({ ...current, [targetCountryId]: output }));
        setPkgReady((current) => new Set(current).add(targetCountryId));
      }
      setRun((current) => current?.source === "backend" ? { ...current, step: steps.length, done: true, statusMessage: output.finalNarrative } : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRunMinimized(false);
      setRun((current) => current?.source === "backend" ? { ...current, step: steps.length, done: true, error: message, statusMessage: "" } : current);
    }
  };

  const startMarketScan = () => {
    if (marketScan || (run && !run.done) || pkgCountry) return;
    setRun(null);
    setRunMinimized(false);
    setMarketScan({ step: 0, done: false, summary: buildMarketScanSummary(window.OPPORTUNITY_DATA) });
  };
  const viewMarketOverview = () => {
    if (!marketScan?.done) return;
    setMarketOverview({ ...marketScan.summary, completedAt: new Date().toISOString() });
    setMarketScan(null);
    setPanelCollapsed(false);
    backToGlobal();
  };
  const startCountryPackage = () => {
    if (marketScan || (run && !run.done)) return;
    if (!customerFocus || customerFocus.countryId !== selectedCountry) return startBackendRun({targetCountryId:selectedCountry,scope:"country"});
    const target = window.AgentApi.targetForCountry(selectedCountry);
    if (target) {
      if (customerFocus.customerId !== target.customerId) {notify("仅第一家已收录客户开放作战包生成");return;}
      return startBackendRun({ scope:"customer", targetCountryId: selectedCountry, regionId: target.regionId, customerId: target.customerId, countryName: countries[selectedCountry].name });
    }
    notify("当前国家暂无可运行的真实客户资料");
    return undefined;
  };

  // Esc 逐级退出：作战包 → 运行浮层 → 国家 → 区域
  useAppEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (pkgCountry) { setPkgCountry(null); return; }
      if (marketScan) { setMarketScan(null); return; }
      if (run && !run.done && !runMinimized) { setRunMinimized(true); return; }
      if (run && run.done && !runMinimized) { setRun(null); return; }
      if (customerFocus) { setCustomerFocus(null); return; }
      if (selectedCountry) backToRegion();
      else if (selectedRegion) backToGlobal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pkgCountry, marketScan, run, runMinimized, customerFocus, selectedCountry, selectedRegion]);

  const palette = t.palette;
  const themeStyle = {
    "--accent": palette[0], "--mint": palette[1], "--canvas": palette[2], "--ink": palette[3], "--muted": palette[4]
  };

  return (
    <main className={`app density-${t.density}`} style={themeStyle} data-screen-label="海外商机洞察与决策智能体">
      <Header onScan={startMarketScan} scanning={Boolean(marketScan && !marketScan.done)} scanDisabled={Boolean(marketScan || (run && !run.done) || pkgCountry)} agentStatus={agentStatus}></Header>
      <div className={`app-stage ${panelCollapsed ? "is-panel-collapsed" : ""}`}>
        <section className={`map-stage ${selectedCountry ? "has-country-map" : ""}`}>
          <div className="map-stage-copy">
            <span>GLOBAL OPPORTUNITY INTELLIGENCE</span>
            <h2>{selectedCountry ? `${countries[selectedCountry].name} · 客户版图` : selectedRegion ? `${regions[selectedRegion].name} · 零售市场` : "让全球商机变得可见"}</h2>
            <p>{selectedCountry ? "从代表门店，走近本地零售市场" : selectedRegion ? (regions[selectedRegion].countryIds.length ? "浏览大洲简报，点击国家查看客户与下一步行动" : "浏览市场全景、展会日历与机会信号") : "拖动地球，悬停预览区域机会，点击锁定后下钻国家"}</p>
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
            onBackToRegion={backToRegion}
            motion={t.motion}
          ></Globe>
          <AgentRail steps={runSteps} activeStep={activeStep} minimized={Boolean(run && !run.done && runMinimized)} onExpand={() => setRunMinimized(false)}></AgentRail>
        </section>

        <button type="button" className="panel-collapse-toggle" aria-expanded={!panelCollapsed} aria-controls="opportunity-intelligence-panel" onClick={() => setPanelCollapsed(value => !value)} title={panelCollapsed ? "展开商机信息面板" : "收起商机信息面板"}>
          <Icon name="chevron" size={17}></Icon><span>{panelCollapsed ? "展开信息" : "收起"}</span>
        </button>

        <aside id="opportunity-intelligence-panel" className="intelligence-panel" data-screen-label="商机情报面板" aria-hidden={panelCollapsed}>
          {country ? (
            <CountryPanel country={country} region={regions[country.region]} onBack={backToRegion} onGenerate={startCountryPackage} generating={Boolean(run && !run.done)} notify={notify} packageReady={pkgReady.has(country.id)} onViewPackage={() => setPkgCountry(country.id)} liveReport={liveReports[country.id]} countryReport={countryReports[country.id]} briefRequest={briefFocus?.countryId === country.id ? briefFocus.token : null} briefRun={run?.mode === "country" && run.targetCountryId === country.id ? run : null} selectedCustomer={customerFocus?.countryId === country.id ? customerFocus : null} onSelectCustomer={setCustomerFocus}></CountryPanel>
          ) : marketOverview && !selectedRegion && !hoverRegion ? (
            <MarketOverviewPanel summary={marketOverview} onSelectRegion={selectRegion} onSelectCountry={selectCountry}></MarketOverviewPanel>
          ) : (
            <RegionPanel key={region.id} region={region} countries={countries} onSelectCountry={selectCountry} pinned={Boolean(selectedRegion)}></RegionPanel>
          )}
        </aside>
      </div>

      {marketScan && <MarketScanOverlay scan={marketScan} onClose={() => setMarketScan(null)} onViewOverview={viewMarketOverview}></MarketScanOverlay>}
      {run && !runMinimized && (
        <AgentRunOverlay
          steps={runSteps}
          active={run.done ? runSteps.length : run.step}
          mode={run.mode}
          onClose={() => { setRun(null); setRunMinimized(false); }}
          onMinimize={() => setRunMinimized(true)}
          onViewPackage={() => { const target=run.targetCountryId || selectedCountry; if (run.mode === "country") {selectCountry(target);setBriefFocus(current => ({countryId:target,token:(current?.token || 0) + 1}));} else setPkgCountry(target); setRun(null); setRunMinimized(false); }}
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
