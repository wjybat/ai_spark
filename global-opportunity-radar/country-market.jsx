function CountrySourceLink({ source }) {
  return source ? <a className="national-source" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true"> ↗</span></a> : null;
}

function CountryMethod({ research }) {
  const meta = window.OPPORTUNITY_DATA.countryMeta;
  return <details className="national-method"><summary>数据口径与参考资料 <span>{research.sources.length} 项来源</span></summary>
    <div>{[meta.countMethod, meta.metricMethod, meta.scoreMethod, meta.signalMethod].map(text => <p key={text}>{text}</p>)}
      <ol>{research.sources.map(s => <li key={s.url}><CountrySourceLink source={s} /></li>)}</ol>
    </div>
  </details>;
}

function CountryDimensions({ research }) {
  return <section className="national-section"><div className="national-section-title"><h3>市场四维判断</h3><span>演示评分 / 100</span></div>
    <div className="national-dimensions">{research.dimensions.map(d => <article key={d.key} className={`national-dimension ${["risk","competition"].includes(d.key) ? "is-challenge" : ""}`}>
      <div><b>{d.label}</b><strong>{d.score}</strong></div>
      <div className="national-meter" role="meter" aria-label={d.label} aria-valuenow={d.score} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${d.score}%`}} /></div>
      <p><b>{d.verdict}</b> · {d.detail}</p>
    </article>)}</div><p className="national-caption">数字化、扩张分越高表示越成熟或活跃；竞争、风险分越高表示挑战越大。</p>
  </section>;
}

function CountryOverview({ country }) {
  const r = country.research;
  return <div className="tab-body national-page" data-country-overview={country.id}>
    <section className="national-intro"><div className="national-eyebrow">COUNTRY LANDSCAPE <span>01 / 国家概况</span></div><h2>{r.positioning}</h2><p>{r.summary}</p><div className="national-intro-foot"><span>资料快照 {window.OPPORTUNITY_DATA.countryMeta.asOf}</span><span>市场量级采用演示估算</span></div></section>
    <section className="national-section"><div className="national-section-title"><h3>市场规模与增长</h3><span>逐项注明统计范围</span></div>
      <div className="national-metrics">{r.metrics.map(m => <article key={m.label}><div className="national-metric-label">{m.label}<span className={m.basis === "公开资料" ? "is-sourced" : ""}>{m.basis}</span></div><strong>{m.value.replace(/美元$/, "")}{m.value.endsWith("美元") && <small>美元</small>}</strong><p>{m.period} · {m.scope}</p><CountrySourceLink source={m.source} /></article>)}</div>
    </section>
    <section className="national-section"><div className="national-section-title"><h3>零售格局与主要业态</h3><span>理解客户所在的市场</span></div><p className="national-structure">{r.structure}</p>
      <div className="national-formats">{r.formats.map((f,i) => <article key={f.name}><span>{String(i+1).padStart(2,"0")}</span><div><h4>{f.name}</h4><p>{f.detail}</p></div></article>)}</div>
      <div className="national-sample"><span>已收录客户样本</span><b>{r.sample.name}</b><strong>{r.sample.stores}</strong><p>{r.sample.detail}</p></div>
    </section>
    <CountryDimensions research={r} />
    <section className="national-section"><div className="national-section-title"><h3>近期动态与业务信号</h3><span>{r.signals.length} 条观察</span></div>
      <div className="national-signals">{r.signals.map((s,i) => <article key={s.title}><div className="national-signal-index">{String(i+1).padStart(2,"0")}</div><div><div className="national-signal-meta"><span>{s.type}</span><time>{s.period}</time><em>{s.scope}</em></div><h4>{s.title}</h4><p>{s.detail}</p><p className="national-action"><b>跟进方向</b>{s.action}</p><div className="national-signal-sources">{(s.sources || [s.source]).filter(Boolean).map(source => <CountrySourceLink key={source.url} source={source} />)}</div></div></article>)}</div>
      <div className="national-watch"><b>招聘与公告观察</b><p>{r.watch}</p></div>
    </section>
    <CountryMethod research={r} />
  </div>;
}

function CountryMarketRadar({ country, onCustomers }) {
  const r = country.research;
  return <div className="tab-body national-page" data-country-radar={country.id}>
    <section className="national-radar-hero"><div className="national-eyebrow">MARKET RADAR <span>02 / 市场与商机</span></div>
      <div className="national-radar-verdict"><div><span className="national-verdict-tag">{r.priority}</span><h2>{r.verdict}</h2><p>{r.positioning}</p></div><div className="national-score" aria-label={`国别优先分 ${r.score}，演示研判`}><strong>{r.score}<small>/100</small></strong><span>国别优先分 · 演示</span></div></div>
      <p className="national-radar-note">综合市场空间、场景适配、现有客户入口与落地难度的国别判断。</p>
    </section>
    <section className="national-section"><div className="national-section-title"><h3>为什么值得看</h3><span>3 个判断依据</span></div><ol className="national-reasons">{r.reasons.map((reason,i) => <li key={reason}><span>{String(i+1).padStart(2,"0")}</span><p>{reason}</p></li>)}</ol></section>
    <div className="national-dual"><section className="national-section national-opportunities"><div className="national-section-title"><h3>机会在哪里</h3><span>OPPORTUNITY</span></div>{r.opportunities.map(p => <article key={p.title}><h4>{p.title}</h4><p>{p.detail}</p></article>)}</section>
      <section className="national-section national-risks"><div className="national-section-title"><h3>风险与应对</h3><span>WATCHPOINT</span></div>{r.risks.map(p => <article key={p.title}><h4>{p.title}</h4><p>{p.detail}</p></article>)}</section></div>
    <section className="national-section"><div className="national-section-title"><h3>适合切入的零售场景</h3><span>建议试点 · 可量化验收</span></div><div className="national-scenarios">{r.scenarios.map((s,i) => <article key={s.name}><span className="national-scenario-number">0{i+1}</span><div><h4>{s.name}</h4><p>{s.scope}</p><div className="national-kpi"><span>观察指标</span>{s.metric}</div></div></article>)}</div></section>
    <section className="national-next"><div><span>NEXT MOVE</span><h3>下一步怎么推进</h3><p>{r.nextStep}</p></div><button type="button" onClick={onCustomers}>查看本国客户雷达 <span aria-hidden="true">→</span></button></section>
    <CountryMethod research={r} />
  </div>;
}
window.CountryOverview = CountryOverview;
window.CountryMarketRadar = CountryMarketRadar;
