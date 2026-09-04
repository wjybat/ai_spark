"use client";

import { Bell, BrainCircuit, ChevronRight, Database, FileText, Lightbulb, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Sparkles, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { IngestModal } from "./ingest-modal";
import { JobTracker } from "./job-tracker";
import { NewCustomerModal } from "./new-customer-modal";

const nav = [
  { label: "客户", icon: Users, tab: "总览" },
  { label: "洞察", icon: Lightbulb, tab: "关键洞察" },
  { label: "经验库", icon: BrainCircuit, tab: "经验" },
  { label: "数据来源", icon: Database, tab: "来源" },
  { label: "设置", icon: Settings, disabled: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ingestOpen, setIngestOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("客户");
  const [globalQuery, setGlobalQuery] = useState("");
  const [ingestion, setIngestion] = useState({ today: 0, week: 0, total: 0 });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("customer-sidebar-collapsed") === "true");
    const load = () => fetch("/api/v1/dashboard").then((response) => response.json()).then((data) => setIngestion(data.ingestion)).catch(() => undefined);
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    const syncNav = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail;
      setActiveNav(tab === "关键洞察" ? "洞察" : tab === "经验" ? "经验库" : tab === "来源" ? "数据来源" : "客户");
    };
    load();
    window.addEventListener("keydown", focusSearch);
    window.addEventListener("customer-ingested", load);
    window.addEventListener("customer-tab-active", syncNav);
    return () => {
      window.removeEventListener("keydown", focusSearch);
      window.removeEventListener("customer-ingested", load);
      window.removeEventListener("customer-tab-active", syncNav);
    };
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("global-customer-search", { detail: globalQuery.trim() }));
  }

  function toggleSidebar() {
    setSidebarCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("customer-sidebar-collapsed", String(next));
      return next;
    });
  }

  function openSection(label: string, tab?: string) {
    if (!tab) return;
    setActiveNav(label);
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent("customer-tab-change", { detail: tab }));
  }

  return <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "关闭菜单" : "打开菜单"} aria-expanded={menuOpen}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <Link href="/customers" className="brand" aria-label="客户情报中心"><span className="brand-mark"><Sparkles size={22} /></span><span><strong>客户情报中心</strong><small>AI 驱动的客户洞察</small></span></Link>
      <form className="global-search" role="search" onSubmit={search}><Search size={16} /><input ref={searchRef} value={globalQuery} onChange={(event) => { setGlobalQuery(event.target.value); window.dispatchEvent(new CustomEvent("global-customer-search", { detail: event.target.value.trim() })); }} aria-label="全局搜索客户" placeholder="搜索客户名称…" />{globalQuery && <button type="button" className="search-clear" aria-label="清除搜索" onClick={() => { setGlobalQuery(""); window.dispatchEvent(new CustomEvent("global-customer-search", { detail: "" })); searchRef.current?.focus(); }}><X size={13} /></button>}<kbd>⌘ K</kbd></form>
      <button className="secondary-button topbar-create" aria-label="新建客户" onClick={() => setNewCustomerOpen(true)}><UserPlus size={16} /><span>新建客户</span></button>
      <button className="primary-button topbar-ingest" aria-label="更新材料" onClick={() => setIngestOpen(true)}><Plus size={17} /><span>更新材料</span></button>
      <div className="notification-wrap"><button className="icon-button notification" onClick={() => setNotificationsOpen((value) => !value)} aria-label="通知" aria-expanded={notificationsOpen}><Bell size={19} /></button>{notificationsOpen && <div className="notification-popover" role="status"><b>通知</b><p>暂无新通知</p></div>}</div>
      <span className="avatar" role="img" aria-label="当前用户 JS">JS</span>
    </header>
    <aside className={`sidebar ${menuOpen ? "open" : ""}`} aria-label="主导航">
      <nav>{nav.map(({ label, icon: Icon, tab, disabled }) => <button key={label} type="button" className={activeNav === label ? "active" : ""} disabled={disabled} aria-label={label} title={disabled ? "该功能尚未开放" : sidebarCollapsed ? label : undefined} onClick={() => openSection(label, tab)}><Icon size={18} /><span className="nav-label">{label}</span>{label !== "客户" && <ChevronRight className="nav-arrow" size={14} />}</button>)}</nav>
      <div className="ingestion-status"><div className="status-title"><FileText size={15} />数据接入</div><div><span>今日</span><b>{ingestion.today}</b></div><div><span>本周</span><b>{ingestion.week}</b></div><div><span>来源总数</span><b>{ingestion.total.toLocaleString()}</b></div><p><i />系统运行正常</p></div>
      <div className="sidebar-foot"><button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}>{sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}</button><span>MVP · 本地运行</span></div>
    </aside>
    {menuOpen && <button className="sidebar-scrim" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />}
    <main className="main-content">{children}</main>
    <JobTracker />
    <NewCustomerModal open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} />
    <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} />
  </div>;
}
