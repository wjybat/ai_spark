// Deliberately local: this demo never requests an Agent run or mutates customer reports.
const MARKET_SCAN_STEPS = [
  { title: "资料对齐", detail: "整理已收录的区域、国家与客户资料", icon: "layers" },
  { title: "市场汇总", detail: "汇总各区域的零售主题与市场概览", icon: "globe" },
  { title: "客户归并", detail: "按集团去重，整理整体目标客户池", icon: "users" },
  { title: "雷达更新", detail: "准备整体市场视图与客户研究入口", icon: "scan" }
];

function buildMarketScanSummary(data) {
  const countries = Object.values(data.countries);
  return {
    regions: Object.values(data.regions),
    countryCount: countries.length,
    companies: Object.values(data.companyProfiles).map(company => ({
      ...company,
      countryIds: countries.filter(country => country.companyId === company.id).map(country => country.id)
    })),
    sourceCount: new Set(countries.flatMap(country => country.sources.map(source => source.url))).size
  };
}

function MarketScanOverlay({ scan, onClose, onViewOverview }) {
  const cardRef = React.useRef(null);
  React.useEffect(() => {
    const previous = document.activeElement;
    cardRef.current?.querySelector("button")?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const trapFocus = (event) => {
    if (event.key !== "Tab") return;
    const buttons = [...cardRef.current.querySelectorAll("button:not(:disabled)")];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const percent = Math.round(scan.step / MARKET_SCAN_STEPS.length * 100);
  return <div className="agent-run-backdrop" role="dialog" aria-modal="true" aria-labelledby="market-scan-title">
    <div className="market-scan-card" ref={cardRef} onKeyDown={trapFocus}>
      <button type="button" className="overlay-close" onClick={onClose} aria-label={scan.done ? "关闭市场扫描" : "取消市场扫描"}><Icon name="close"></Icon></button>
      <div className="market-scan-eyebrow"><Icon name="globe" size={17}></Icon> MARKET REFRESH <span>前端演示</span></div>
      <h2 id="market-scan-title">{scan.done ? "整体市场与客户池已就绪" : "正在更新整体市场与客户池"}</h2>
      <p className="market-scan-subtitle">基于已收录调研资料，演示从市场概览到客户池的整理流程。</p>
      <ol className="market-scan-nodes" aria-label="市场扫描演示流程">
        {MARKET_SCAN_STEPS.map((step, index) => {
          const done = index < scan.step;
          const active = !scan.done && index === scan.step;
          return <li key={step.title} className={done ? "is-done" : active ? "is-active" : ""} aria-current={active ? "step" : undefined}>
            <span className="market-scan-node-icon"><Icon name={done ? "check" : step.icon} size={18}></Icon></span>
            <div><strong>{step.title}</strong><p>{step.detail}</p></div>
            <small>{done ? "已完成" : active ? "进行中" : "等待中"}</small>
          </li>;
        })}
      </ol>
      <div className="market-scan-progress-label" aria-live="polite"><span>{scan.done ? "演示流程已完成" : MARKET_SCAN_STEPS[scan.step].title}</span><b>{percent}%</b></div>
      <div className="run-progress" role="progressbar" aria-label="市场扫描演示进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><i style={{ width: `${percent}%` }}></i></div>
      {scan.done && <div className="market-scan-result" aria-label="本地资料覆盖摘要">
        <span><b>{scan.summary.regions.length}</b> 个区域</span><span><b>{scan.summary.countryCount}</b> 个国家</span><span><b>{scan.summary.companies.length}</b> 家客户</span>
      </div>}
      <div className="market-scan-footer"><small>仅展示流程动画，不调用后端 Agent，也不改写客户分析结果。</small>{scan.done && <button type="button" className="run-complete-button" onClick={onViewOverview}>查看整体市场<Icon name="arrow" size={15}></Icon></button>}</div>
    </div>
  </div>;
}

function MarketOverviewPanel({ summary, onSelectRegion, onSelectCountry }) {
  return <div className="panel-content market-overview" data-market-overview="true">
    <div className="panel-kicker">GLOBAL MARKET OVERVIEW <em className="lock-tag">前端演示</em></div>
    <div className="region-title-row"><div><h1>整体市场与客户池</h1><p>已收录资料的整体视图 · 未执行后端扫描</p></div></div>
    <p className="market-overview-note">视图整理于 {new Date(summary.completedAt).toLocaleTimeString("zh-CN", { hour12: false })}。资料仍为原有调研快照；选择国家后，可单独运行真实客户 Agent。</p>
    <div className="metrics-grid"><Metric label="覆盖区域" value={summary.regions.length}></Metric><Metric label="覆盖国家" value={summary.countryCount}></Metric><Metric label="真实客户" value={summary.companies.length}></Metric><Metric label="资料来源" value={summary.sourceCount}></Metric></div>
    <section className="panel-section"><div className="section-heading"><span>整体市场概览</span><small>点击区域下钻</small></div>
      <div className="market-overview-regions">{summary.regions.map(region => <button type="button" key={region.id} onClick={() => onSelectRegion(region.id)}>
        <span style={{ background: region.color }}></span><div><strong>{region.name}</strong><p>{region.headline}</p></div><small>{region.countryIds.length} 国</small><Icon name="chevron" size={15}></Icon>
      </button>)}</div>
    </section>
    <section className="panel-section"><div className="section-heading"><span>目标客户池</span><small>按集团去重 · 非新生成排名</small></div>
      <div className="market-overview-customers">{summary.companies.map(company => <button type="button" key={company.id} data-market-customer={company.id} onClick={() => onSelectCountry(company.countryIds[0])} disabled={!company.countryIds.length}>
        <div><strong>{company.name}</strong><span>覆盖 {company.countryIds.length} 国<Icon name="arrow" size={14}></Icon></span></div><p>{company.type}</p><small>集团规模：{company.groupStores}</small>
      </button>)}</div>
    </section>
  </div>;
}

Object.assign(window, { MARKET_SCAN_STEPS, buildMarketScanSummary, MarketScanOverlay, MarketOverviewPanel });
