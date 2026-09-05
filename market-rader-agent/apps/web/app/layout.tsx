import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getAppContext } from "@/lib/context";
import { AgentDrawer } from "./agent-drawer";
import { HeaderDateRange } from "./header-date-range";
import { ScanButton } from "./scan-actions";
import { SidebarNav } from "./sidebar-nav";
import { Icon } from "./ui/icons";

import "./globals.css";

export const metadata: Metadata = {
  title: "Market Radar — 零售市场扫描与机会发现",
  description: "Multi-region retail market opportunity radar",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const context = await getAppContext();
  return (
    <html lang="zh-CN">
      <body>
        <div id="app">
          <header className="header">
            <div className="logo">
              <span className="logo-mark">
                <Icon name="radar" size={26} />
              </span>
              <span className="logo-name">Market Radar</span>
              <span className="logo-sub">零售市场扫描与机会发现</span>
            </div>
            <div className="header-right">
              <label className="search">
                <Icon name="search" size={15} className="ic-muted" />
                <input type="text" placeholder="搜索国家、零售商或数据源" />
              </label>
              <HeaderDateRange />
              <div className="avatar" title={context.scenarioName ?? ""}>
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <defs>
                    <linearGradient id="av" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#7db4f7" />
                      <stop offset="1" stopColor="#4a78e0" />
                    </linearGradient>
                  </defs>
                  <circle cx="14" cy="14" r="14" fill="url(#av)" />
                  <circle cx="14" cy="11" r="4.4" fill="#eaf2ff" />
                  <path d="M6 24c1.6-4.4 4.8-6.4 8-6.4s6.4 2 8 6.4" fill="#eaf2ff" />
                </svg>
              </div>
              <ScanButton
                researchProvider={context.researchProvider}
                initialRegion={context.regionCode}
              />
            </div>
          </header>
          <div className="layout">
            <aside className="sidebar">
              <SidebarNav />
              <div className="sidebar-foot" role="button" tabIndex={0}>
                <Icon name="chevronsLeft" size={16} />
                <span>收起菜单</span>
              </div>
            </aside>
            <main className="main">
              <div className="synthetic-banner" role="note">
                {context.resultProvider === "pi-agent"
                  ? "Live Research — 当前结果仅使用 Pi 搜索证据"
                  : context.resultProvider === "fixture"
                    ? "Synthetic Data — 当前展示为合成数据（fixture），不用于业务决策"
                    : "No Result — 当前区域尚无扫描结果"}{" "}
                · 区域 {context.scenarioName ?? context.regionCode}
                {context.benchmarkStatus === "shared_baseline"
                  ? " · 区域评分使用共享基准"
                  : context.benchmarkStatus === "provisional_shared_baseline"
                    ? " · 历史区域基准策略，评分仅为 provisional"
                    : ""}
                {" "}· 准入策略 高召回/低精度 · 最新任务 {context.scanStatus ?? "未运行"} · 当前结果 {context.resultProvider ?? "无"} · 数据截至 {context.dataAsOf ?? "—"}
              </div>
              {children}
            </main>
          </div>
        </div>
        <AgentDrawer />
      </body>
    </html>
  );
}
