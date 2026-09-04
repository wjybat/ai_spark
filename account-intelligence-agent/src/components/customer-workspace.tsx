"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Bot, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, CircleAlert, Clock3, Download, FileText, Filter, Lightbulb, Loader2, MapPin, RefreshCw, Search, Share2, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Customer { id: string; name: string; country: string | null; industry: string | null; owner: string | null; category: string; stage: string; status: string; last_activity_at: string | null; profile_json: string; card_summary?: string | null }
interface EventItem { id: string; source_item_id: string; event_type: string; occurred_at: string; summary: string; importance: number; source_title: string; source_type: string; payload?: { evidence_text?: string } }
interface Experience { id: string; experience_type: string; title: string; description: string; source_item_ids: string[] }
interface FactItem { id: string; fact_type: string; fact_value: string; source_item_id: string; source_title: string | null; source_type: string; evidence_text: string | null }
interface Detail extends Customer { current_state: string; key_requirements: string[]; key_blockers: string[]; success_factors: string[]; failure_reasons: string[]; reusable_playbook: string[]; next_actions: string[]; recent_events: EventItem[]; experiences: Experience[]; facts: FactItem[]; source_count: number; generated_at: string | null; profile: Record<string, unknown> }
interface ListResponse { items: Customer[]; total: number; stats: Record<string, number> }
interface SourceItem { id: string; title: string | null; source_type: string; source_system: string; content: string; occurred_at: string | null; received_at: string; processing_status: string; metadata?: { filename?: string; original_filename?: string } }
interface EvidenceSelection { sourceId: string; evidenceText?: string | null; conclusion: string }

const categoryLabel: Record<string, string> = { CONVERTED: "已落地", UNCONVERTED: "未转化", UNTAPPED: "未拓展" };
const stageLabel: Record<string, string> = { TARGET: "目标", RESEARCH: "调研", CONTACTED: "已联系", DISCOVERY: "需求探索", QUALIFIED: "需求确认", SOLUTION: "方案", POC: "PoC", COMMERCIAL: "商务", CONTRACT: "合同", DEPLOYMENT: "部署", PRODUCTION: "生产", EXPANSION: "扩展", CLOSED_LOST: "已流失" };
const statusLabel: Record<string, string> = { ACTIVE: "活跃", WAITING_CUSTOMER: "等待客户", WAITING_INTERNAL: "等待内部", STALLED: "停滞", WON: "赢单", LOST: "丢单" };
const eventLabel: Record<string, string> = { FIRST_CONTACT: "首次联系", DISCOVERY_COMPLETED: "完成需求探索", REQUIREMENT_IDENTIFIED: "识别关键需求", SOLUTION_PRESENTED: "完成方案演示", POC_PROPOSED: "提出 PoC", POC_STARTED: "PoC 启动", POC_COMPLETED: "PoC 完成", POSITIVE_FEEDBACK: "积极反馈", NEGATIVE_FEEDBACK: "负面反馈", BUDGET_APPROVED: "预算获批", BUDGET_REJECTED: "预算未通过", PROJECT_PAUSED: "项目暂停", PROJECT_RESUMED: "项目恢复", COMMERCIAL_STARTED: "进入商务", CONTRACT_SIGNED: "合同签署", DEPLOYMENT_STARTED: "开始部署", PRODUCTION_STARTED: "正式上线", EXPANSION_STARTED: "开始扩展", LOST: "项目丢失" };
const sourceTypeLabel: Record<string, string> = { MEETING: "会议", CRM_FOLLOWUP: "CRM 跟进", RESEARCH: "调研", DOCUMENT: "客户文档", MANUAL_NOTE: "人工记录" };
const processingStatusLabel: Record<string, string> = { PENDING: "待分析", PROCESSING: "分析中", DONE: "已分析", FAILED: "分析失败" };
const tabs = ["总览", "时间线", "客户画像", "关键洞察", "经验", "来源"];

function timeAgo(value: string | null): string {
  if (!value) return "暂无活动";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return `${Math.floor(diff / 86400_000)} 天前`;
}
function dateText(value: string) { return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(value)); }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function cardSummary(customer: Customer) {
  if (customer.stage === "TARGET") return "市场调研与客户信息收集中";
  const parts = customer.card_summary?.split("。").map((part) => part.trim()).filter(Boolean);
  return parts?.at(-1) || `${stageLabel[customer.stage]}阶段客户推进记录`;
}
function CompanyLogo({ name, large = false }: { name: string; large?: boolean }) {
  const key = name.toLowerCase();
  let mark: React.ReactNode = initials(name);
  if (key.includes("tesco")) mark = <span className="tesco-mark">TESCO<i /></span>;
  else if (key.includes("carrefour")) mark = <span className="carrefour-mark">◆</span>;
  else if (key === "walmart") mark = <span className="walmart-mark">✳</span>;
  else if (key === "lidl") mark = <span className="lidl-mark">LIDL</span>;
  else if (key === "metro") mark = <span className="metro-mark">M</span>;
  return <div className={`company-logo ${large ? "large" : ""} logo-${name.length % 4}`}>{mark}</div>;
}

export function CustomerWorkspace({ initialCustomerId }: { initialCustomerId?: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState(initialCustomerId || "");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [stage, setStage] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [tab, setTab] = useState("总览");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialCustomerId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [evidenceSelection, setEvidenceSelection] = useState<EvidenceSelection | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const [detailVersion, setDetailVersion] = useState(0);
  const closeEvidence = useCallback(() => setEvidenceSelection(null), []);

  const activateTab = useCallback((nextTab: string) => {
    setTab(nextTab);
    window.dispatchEvent(new CustomEvent("customer-tab-active", { detail: nextTab }));
  }, []);

  useEffect(() => {
    const reload = () => setListVersion((value) => value + 1);
    const created = (event: Event) => {
      const customer = (event as CustomEvent<Customer>).detail;
      reload();
      if (customer?.id) {
        setSelectedId(customer.id);
        activateTab("总览");
        window.history.replaceState({}, "", `/customers/${customer.id}`);
      }
    };
    const globalSearch = (event: Event) => {
      setQuery(String((event as CustomEvent<string>).detail || ""));
      setCategory("ALL");
      setStage("ALL");
      setStatus("ALL");
    };
    const changeTab = (event: Event) => activateTab((event as CustomEvent<string>).detail || "总览");
    const analysisCompleted = () => { reload(); setDetailVersion((value) => value + 1); };
    window.addEventListener("customer-ingested", reload);
    window.addEventListener("customer-created", created);
    window.addEventListener("global-customer-search", globalSearch);
    window.addEventListener("customer-tab-change", changeTab);
    window.addEventListener("customer-analysis-completed", analysisCompleted);
    return () => {
      window.removeEventListener("customer-ingested", reload);
      window.removeEventListener("customer-created", created);
      window.removeEventListener("global-customer-search", globalSearch);
      window.removeEventListener("customer-tab-change", changeTab);
      window.removeEventListener("customer-analysis-completed", analysisCompleted);
    };
  }, [activateTab]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ page_size: "100" });
      if (query) params.set("q", query);
      if (category !== "ALL") params.set("category", category);
      if (stage !== "ALL") params.set("stage", stage);
      if (status !== "ALL") params.set("status", status);
      try {
        const response = await fetch(`/api/v1/customers?${params}`);
        if (!response.ok) throw new Error("客户列表加载失败");
        const result = await response.json() as ListResponse;
        if (cancelled) return;
        setCustomers(result.items);
        setStats(result.stats || {});
        setError("");
        setSelectedId((current) => {
          if (current && result.items.some((item) => item.id === current)) return current;
          if (window.matchMedia("(max-width: 800px)").matches) return "";
          return result.items[0]?.id || "";
        });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "客户列表加载失败");
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, category, stage, status, listVersion]);

  useEffect(() => { setEvidenceSelection(null); }, [selectedId]);
  const loadDetail = useCallback(async () => {
    if (!selectedId) { setDetail(null); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/customers/${selectedId}`);
      if (!response.ok) throw new Error(response.status === 404 ? "客户不存在或已删除" : "客户详情加载失败");
      setDetail(await response.json());
      setError("");
    } catch (cause) {
      setDetail(null);
      setError(cause instanceof Error ? cause.message : "客户详情加载失败");
    } finally { setLoading(false); }
  }, [selectedId]);
  useEffect(() => { void loadDetail(); }, [loadDetail, detailVersion]);

  const selectCustomer = (id: string) => {
    setSelectedId(id);
    activateTab("总览");
    window.history.replaceState({}, "", `/customers/${id}`);
  };
  const closeMobileDetail = () => {
    setSelectedId("");
    setDetail(null);
    window.history.replaceState({}, "", "/customers");
  };
  const refresh = async () => {
    if (!selectedId || refreshing) return;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/v1/customers/${selectedId}/refresh`, { method: "POST" });
      if (!response.ok) throw new Error("刷新分析失败");
      await loadDetail();
      setNotice("分析已刷新");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "刷新分析失败"); }
    finally { setRefreshing(false); }
  };
  const share = async () => {
    if (!detail) return;
    const data = { title: `${detail.name} · 客户情报`, text: detail.current_state, url: window.location.href };
    try {
      if (navigator.share) { await navigator.share(data); setNotice("分享已完成"); }
      else { await navigator.clipboard.writeText(window.location.href); setNotice("客户链接已复制"); }
    } catch (cause) { if ((cause as Error).name !== "AbortError") setNotice("分享失败，请稍后重试"); }
  };
  const exportDetail = () => {
    if (!detail) return;
    const blob = new Blob([JSON.stringify(detail, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${detail.name}-客户情报.json`; link.click();
    URL.revokeObjectURL(url); setNotice("客户情报已导出");
  };
  const totals = useMemo<Record<string, number>>(() => ({ ALL: Object.values(stats).reduce((sum, value) => sum + value, 0), ...stats }), [stats]);
  const filtersActive = stage !== "ALL" || status !== "ALL";

  return <div className={`workspace ${selectedId ? "has-selection" : ""}`}>
    <section className="customer-panel" aria-label="客户列表">
      <div className="category-tabs" role="tablist" aria-label="客户分类">
        {["ALL", "CONVERTED", "UNCONVERTED", "UNTAPPED"].map((key) => <button key={key} role="tab" aria-selected={category === key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}>{key === "ALL" ? "全部" : categoryLabel[key]} <span>({totals[key] || 0})</span></button>)}
      </div>
      <div className="list-tools"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索客户" placeholder="搜索客户…" /></label><button className={`filter-button ${filtersActive ? "active" : ""}`} aria-expanded={filterOpen} onClick={() => setFilterOpen((value) => !value)}><Filter size={16} />筛选{filtersActive && <i />}</button></div>
      {filterOpen && <div className="filter-popover"><label>阶段<select value={stage} onChange={(event) => setStage(event.target.value)}><option value="ALL">全部阶段</option>{Object.entries(stageLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">全部状态</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={() => { setStage("ALL"); setStatus("ALL"); }}>清除筛选</button></div>}
      <div className="sort-row">排序：<b>最近活动</b><ChevronDown size={14} aria-hidden="true" /></div>
      <div className="customer-list">
        {customers.map((customer) => <button key={customer.id} className={`customer-card ${selectedId === customer.id ? "selected" : ""}`} aria-pressed={selectedId === customer.id} onClick={() => selectCustomer(customer.id)}>
          <CompanyLogo name={customer.name} />
          <div className="customer-card-main"><div className="customer-card-title"><strong>{customer.name}</strong><span className={`pill category-${customer.category}`}>{categoryLabel[customer.category]}</span></div>
            <p>{customer.country || "地区未知"}<i>·</i>{customer.industry || "行业未知"}</p><div className="mini-pills"><span>{stageLabel[customer.stage]}</span><span className={`status-${customer.status}`}>{statusLabel[customer.status]}</span></div>
            <div className="card-note" title={cardSummary(customer)}>{cardSummary(customer)}</div><small>最后更新：{timeAgo(customer.last_activity_at)}</small>
          </div>
        </button>)}
        {!customers.length && <div className="empty-list"><Building2 /><b>{error ? "客户加载失败" : "没有匹配的客户"}</b><span>{error || (query || filtersActive || category !== "ALL" ? "请调整搜索或筛选条件" : "点击右上角“新建客户”开始")}</span></div>}
      </div>
      <div className="list-footer">显示 {customers.length} / {totals.ALL || 0} 个客户</div>
    </section>

    <section className="detail-panel" aria-label="客户详情">
      {detail ? <>
        <header className="customer-header"><button className="mobile-back" onClick={closeMobileDetail}><ArrowLeft size={18} />客户列表</button><CompanyLogo name={detail.name} large /><div className="identity"><h1>{detail.name}<ShieldCheck size={18} aria-label="已验证客户" /></h1><p>{detail.country || "地区未知"}<i>·</i>{detail.industry || "行业未知"}</p><div className="hero-pills"><span className={`pill category-${detail.category}`}>{categoryLabel[detail.category]}</span><span>{stageLabel[detail.stage]}</span><span className={`status-${detail.status}`}>{statusLabel[detail.status]}</span></div></div>
          <div className="header-actions"><div className="utility-actions"><button className="secondary-button" title="分享客户链接" onClick={share}><Share2 size={14} />分享</button><button className="secondary-button" title="导出客户情报 JSON" onClick={exportDetail}><Download size={14} />导出</button></div><div className="owner-meta"><span><small>负责人</small><b><i className="tiny-avatar">{initials(detail.owner || "未")}</i>{detail.owner || "未分配"}</b></span><span><small>最后更新</small><b><Clock3 size={14} />{timeAgo(detail.last_activity_at)}</b></span><span><small>数据来源</small><b><FileText size={14} />{detail.source_count} 项</b></span></div><button className="primary-button" onClick={refresh} disabled={refreshing}>{refreshing ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}刷新分析</button></div>
        </header>
        <nav className="detail-tabs" role="tablist" aria-label="客户详情栏目">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => activateTab(item)} className={tab === item ? "active" : ""}>{item}</button>)}</nav>
        <div className="detail-content">
          {tab === "总览" && <Overview detail={detail} onViewTimeline={() => activateTab("时间线")} onEvidence={setEvidenceSelection} />}
          {tab === "时间线" && <Timeline events={detail.recent_events} full onEvidence={setEvidenceSelection} />}
          {tab === "客户画像" && <Profile detail={detail} onEvidence={setEvidenceSelection} />}
          {tab === "关键洞察" && <Insights detail={detail} onEvidence={setEvidenceSelection} />}
          {tab === "经验" && <Experiences detail={detail} onEvidence={setEvidenceSelection} />}
          {tab === "来源" && <Sources customerId={detail.id} count={detail.source_count} />}
        </div>
        {loading && <div className="detail-loading" aria-label="正在加载客户详情"><Loader2 className="spin" /></div>}
      </> : <div className="center-loading">{loading ? <><Loader2 className="spin" />正在加载客户情报…</> : error ? <><CircleAlert size={34} />{error}<button className="secondary-button" onClick={() => setListVersion((value) => value + 1)}>重新加载</button></> : <><Building2 size={34} />选择一个客户查看情报</>}</div>}
    </section>
    {notice && <div className="toast" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice("")}><X size={14} /></button></div>}
    {detail && evidenceSelection && <EvidenceDrawer customerId={detail.id} selection={evidenceSelection} onClose={closeEvidence} />}
  </div>;
}

function SectionTitle({ icon, children, count }: { icon: React.ReactNode; children: React.ReactNode; count?: number }) { return <div className="section-title"><span>{icon}<b>{children}</b></span>{count !== undefined && <small>{count} 项</small>}</div>; }
function Overview({ detail, onViewTimeline, onEvidence }: { detail: Detail; onViewTimeline: () => void; onEvidence: (selection: EvidenceSelection) => void }) {
  const stages = ["TARGET", "CONTACTED", "DISCOVERY", "SOLUTION", "POC", "COMMERCIAL", "CONTRACT"];
  const stageIndex = stages.indexOf(detail.stage);
  const current = stageIndex >= 0 ? stageIndex : ["DEPLOYMENT", "PRODUCTION", "EXPANSION"].includes(detail.stage) ? stages.length - 1 : 0;
  const positiveTypes = new Set(["POSITIVE_FEEDBACK", "BUDGET_APPROVED", "PROJECT_RESUMED", "CONTRACT_SIGNED", "PRODUCTION_STARTED", "EXPANSION_STARTED"]);
  const negativeTypes = new Set(["NEGATIVE_FEEDBACK", "BUDGET_REJECTED", "PROJECT_PAUSED", "LOST"]);
  const sentimentEvents = detail.recent_events.filter((event) => positiveTypes.has(event.event_type) || negativeTypes.has(event.event_type));
  const sentimentScore = sentimentEvents.reduce((score, event) => score + (positiveTypes.has(event.event_type) ? 1 : -1), 0);
  const sentiment = !sentimentEvents.length ? "暂无明确信号" : sentimentScore > 0 ? "积极" : sentimentScore < 0 ? "需关注" : "中性";
  return <div className="overview-grid">
    <article className="status-card"><SectionTitle icon={<Sparkles size={17} />}>当前状态</SectionTitle><p>{detail.current_state}</p></article>
    <article className="progress-card"><SectionTitle icon={<TrendingUp size={17} />}>阶段进展</SectionTitle><div className="stage-track">{stages.map((stage, index) => <div key={stage} className={index <= current ? "done" : ""}><i>{index < current ? <Check size={11} /> : ""}</i><span>{stageLabel[stage]}</span></div>)}</div></article>
    <InfoCard title="关键需求" icon={<Target size={17} />} values={detail.key_requirements} tone="blue" facts={detail.facts} factTypes={["REQUIREMENT", "PRODUCT_INTEREST", "SUCCESS_METRIC"]} onEvidence={onEvidence} />
    <InfoCard title="关键阻碍" icon={<AlertTriangle size={17} />} values={detail.key_blockers} tone="red" facts={detail.facts} factTypes={["BLOCKER", "BUDGET", "COMPETITOR"]} onEvidence={onEvidence} />
    <article className={`sentiment-card ${sentimentScore < 0 ? "negative" : ""}`}><SectionTitle icon={sentimentScore < 0 ? <TrendingDown size={17} /> : <TrendingUp size={17} />}>客户情绪信号</SectionTitle><div className="sentiment-summary"><i>{sentimentScore < 0 ? <TrendingDown /> : <TrendingUp />}</i><div><small>基于最近时间线</small><b>{sentiment}</b><span>{sentimentEvents.length ? `识别到 ${sentimentEvents.length} 个明确反馈或推进信号` : "现有材料未包含明确的正负反馈"}</span></div></div></article>
    <article className="summary-card"><SectionTitle icon={<Bot size={17} />}>AI 总结</SectionTitle><p>{detail.current_state}</p>{detail.reusable_playbook[0] && <div className="learning"><Lightbulb size={16} />关键经验：{detail.reusable_playbook[0]}</div>}</article>
    <article className="next-card"><SectionTitle icon={<Target size={17} />}>推荐下一步</SectionTitle><ol>{detail.next_actions.slice(0, 5).map((item, index) => { const fact = detail.facts.find((candidate) => candidate.fact_type === "NEXT_ACTION" && candidate.fact_value === item); return <li key={`${item}-${index}`}><i>{index + 1}</i><span>{item}</span>{fact && <EvidenceButton fact={fact} conclusion={item} onEvidence={onEvidence} />}</li>; })}</ol>{!detail.next_actions.length && <p className="muted">暂无推荐行动</p>}</article>
    <article className="experience-card"><SectionTitle icon={<BriefcaseBusiness size={17} />}>客户案例与经验</SectionTitle>{detail.experiences.slice(0, 3).map((item, index) => <div className="case" key={item.id}><span className={`case-icon c${index}`}><Lightbulb size={14} /></span><p><b>{item.title}</b><small>{experienceTypeText(item.experience_type)}</small><small>{item.description}</small></p>{item.source_item_ids[0] && <button className="case-evidence" onClick={() => onEvidence({ sourceId: item.source_item_ids[0], conclusion: item.description })}>证据</button>}</div>)}{!detail.experiences.length && <p className="muted">暂无从该客户提炼的案例经验</p>}</article>
    <article className="timeline-card"><SectionTitle icon={<CalendarDays size={17} />}>最近时间线</SectionTitle><Timeline events={detail.recent_events.slice(0, 5)} onViewAll={onViewTimeline} onEvidence={onEvidence} /></article>
  </div>;
}
function experienceTypeText(value: string) { return ({ SUCCESS: "成功经验", FAILURE: "失败经验", PLAYBOOK: "可复用打法" } as Record<string, string>)[value] || value; }
function EvidenceButton({ fact, conclusion, onEvidence }: { fact: FactItem; conclusion: string; onEvidence: (selection: EvidenceSelection) => void }) { return <button className="evidence-button" title={`查看来源：${fact.source_title || "原始材料"}`} onClick={() => onEvidence({ sourceId: fact.source_item_id, evidenceText: fact.evidence_text, conclusion })}><FileText size={11} />证据</button>; }
function InfoCard({ title, icon, values, tone, facts = [], factTypes = [], onEvidence }: { title: string; icon: React.ReactNode; values: string[]; tone: string; facts?: FactItem[]; factTypes?: string[]; onEvidence?: (selection: EvidenceSelection) => void }) { return <article className={`info-card ${tone}`}><SectionTitle icon={icon} count={values.length}>{title}</SectionTitle><ul>{values.slice(0, 5).map((value, index) => { const fact = facts.find((candidate) => candidate.fact_value === value && (!factTypes.length || factTypes.includes(candidate.fact_type))); return <li key={`${value}-${index}`}><i /><span title={value}>{value}</span>{fact && onEvidence && <EvidenceButton fact={fact} conclusion={value} onEvidence={onEvidence} />}</li>; })}</ul>{!values.length && <p className="muted">暂未识别到{title}</p>}</article>; }
function Timeline({ events, full = false, onViewAll, onEvidence }: { events: EventItem[]; full?: boolean; onViewAll?: () => void; onEvidence?: (selection: EvidenceSelection) => void }) { return <div className={`timeline ${full ? "full-timeline" : ""}`}>{events.map((event) => <div className="timeline-row" key={event.id}><time>{dateText(event.occurred_at)}</time><i className={event.importance >= 8 ? "critical" : "normal"}>{event.importance >= 8 ? <CircleAlert size={13} /> : <Check size={12} />}</i><div><b>{eventLabel[event.event_type] || event.event_type}</b>{full && <p>{event.summary}</p>}</div><span title={event.payload?.evidence_text || event.summary}>{event.payload?.evidence_text || event.summary}</span>{onEvidence ? <button className="timeline-evidence" onClick={() => onEvidence({ sourceId: event.source_item_id, evidenceText: event.payload?.evidence_text, conclusion: event.summary })}>{sourceTypeLabel[event.source_type] || event.source_type}</button> : <em>{sourceTypeLabel[event.source_type] || event.source_type}</em>}</div>)}{!events.length && <p className="muted">暂无客户事件</p>}{events.length > 0 && !full && <button className="text-button" onClick={onViewAll}>查看完整时间线<ArrowRight size={14} /></button>}</div>; }
function Profile({ detail, onEvidence }: { detail: Detail; onEvidence: (selection: EvidenceSelection) => void }) { return <div className="tab-page"><h2>客户画像</h2><div className="profile-grid"><Info label="客户名称" value={detail.name} icon={<Building2 />} /><Info label="国家/地区" value={detail.country || "待补充"} icon={<MapPin />} /><Info label="行业" value={detail.industry || "待补充"} icon={<BriefcaseBusiness />} /><Info label="负责人" value={detail.owner || "未分配"} icon={<UserRound />} /></div><InfoCard title="当前事实" icon={<Target size={17} />} values={[...detail.key_requirements, ...detail.key_blockers]} tone="blue" facts={detail.facts} onEvidence={onEvidence} /></div>; }
function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="profile-info"><i>{icon}</i><span><small>{label}</small><b>{value}</b></span></div>; }
function Insights({ detail, onEvidence }: { detail: Detail; onEvidence: (selection: EvidenceSelection) => void }) { return <div className="tab-page"><h2>关键洞察</h2><div className="two-column"><InfoCard title="成功因素" icon={<ShieldCheck size={17} />} values={detail.success_factors} tone="blue" facts={detail.facts} factTypes={["SUCCESS_FACTOR"]} onEvidence={onEvidence} /><InfoCard title="失败原因" icon={<AlertTriangle size={17} />} values={detail.failure_reasons} tone="red" facts={detail.facts} factTypes={["FAILURE_REASON"]} onEvidence={onEvidence} /></div><InfoCard title="可复用打法" icon={<Lightbulb size={17} />} values={detail.reusable_playbook} tone="blue" facts={detail.facts} factTypes={["PLAYBOOK"]} onEvidence={onEvidence} /></div>; }
function Experiences({ detail, onEvidence }: { detail: Detail; onEvidence: (selection: EvidenceSelection) => void }) { return <div className="tab-page"><h2>客户经验</h2><div className="experience-list">{detail.experiences.map((item) => <article key={item.id}><i><Lightbulb /></i><div><span>{experienceTypeText(item.experience_type)}</span><h3>{item.title}</h3><p>{item.description}</p>{item.source_item_ids[0] && <button className="experience-evidence" onClick={() => onEvidence({ sourceId: item.source_item_ids[0], conclusion: item.description })}><FileText size={12} />查看原始材料</button>}</div></article>)}{!detail.experiences.length && <div className="empty-tab"><Lightbulb /><b>暂无客户经验</b><span>系统会从成功、失败材料中提炼可复用经验</span></div>}</div></div>; }
function Sources({ customerId, count }: { customerId: string; count: number }) {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    fetch(`/api/v1/customers/${customerId}/sources`).then((response) => {
      if (!response.ok) throw new Error("原始材料加载失败");
      return response.json();
    }).then((items: SourceItem[]) => { if (!cancelled) setSources(items); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "原始材料加载失败"); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);
  return <div className="tab-page"><h2>原始材料 <small>{count} 项</small></h2>{loading ? <div className="tab-loading"><Loader2 className="spin" />正在加载材料…</div> : error ? <div className="empty-tab"><CircleAlert /><b>{error}</b></div> : <div className="source-list">{sources.map((source) => <article key={source.id}><FileText /><div><b>{source.title || source.metadata?.filename || source.metadata?.original_filename || "未命名材料"}</b><p>{source.content.slice(0, 180)}{source.content.length > 180 ? "…" : ""}</p><small>{sourceTypeLabel[source.source_type] || source.source_type} · {dateText(source.occurred_at || source.received_at)} · {processingStatusLabel[source.processing_status] || source.processing_status}</small>{source.content.length > 180 && <details><summary>阅读完整材料</summary><pre>{source.content}</pre></details>}</div></article>)}{!sources.length && <div className="empty-tab"><FileText /><b>暂无原始材料</b><span>点击“更新材料”添加客户信息</span></div>}</div>}</div>;
}

function EvidenceDrawer({ customerId, selection, onClose }: { customerId: string; selection: EvidenceSelection; onClose: () => void }) {
  const [source, setSource] = useState<SourceItem | null>(null);
  const [error, setError] = useState("");
  const evidenceMark = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    fetch(`/api/v1/customers/${customerId}/sources`).then((response) => {
      if (!response.ok) throw new Error("证据材料加载失败");
      return response.json();
    }).then((items: SourceItem[]) => {
      if (cancelled) return;
      const matched = items.find((item) => item.id === selection.sourceId);
      if (!matched) throw new Error("对应的原始材料不存在");
      setSource(matched);
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "证据材料加载失败"); });
    return () => { cancelled = true; document.removeEventListener("keydown", closeOnEscape); };
  }, [customerId, selection.sourceId, onClose]);
  const evidence = selection.evidenceText?.trim();
  const evidenceIndex = source && evidence ? source.content.indexOf(evidence) : -1;
  useEffect(() => { if (evidenceIndex >= 0) requestAnimationFrame(() => evidenceMark.current?.scrollIntoView({ block: "center" })); }, [evidenceIndex]);
  return <><button className="evidence-scrim" aria-label="关闭证据材料" onClick={onClose} /><aside className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
    <header><div><span><FileText size={17} /></span><div><small>结论依据</small><h2 id="evidence-title">{source?.title || "原始材料"}</h2></div></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></header>
    <div className="evidence-body" role="region" tabIndex={0} aria-label="原始材料正文"><section><small>当前结论</small><blockquote>{selection.conclusion}</blockquote></section>{evidence && <section><small>Agent 引用原文</small><blockquote className="quoted-evidence">{evidence}</blockquote></section>}{error ? <div className="evidence-error"><CircleAlert />{error}</div> : !source ? <div className="tab-loading"><Loader2 className="spin" />正在读取原始材料…</div> : <><div className="evidence-meta"><span>{sourceTypeLabel[source.source_type] || source.source_type}</span><span>{dateText(source.occurred_at || source.received_at)}</span><span>{processingStatusLabel[source.processing_status] || source.processing_status}</span></div><pre>{evidenceIndex >= 0 ? <>{source.content.slice(0, evidenceIndex)}<mark ref={evidenceMark}>{source.content.slice(evidenceIndex, evidenceIndex + evidence!.length)}</mark>{source.content.slice(evidenceIndex + evidence!.length)}</> : source.content}</pre></>}</div>
  </aside></>;
}
