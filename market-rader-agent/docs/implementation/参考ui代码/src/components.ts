import { bubbleChart, detailBars, sparkline } from './charts';
import {
  COUNTRIES,
  FILTERS,
  HEADER_META,
  INSIGHT,
  KPIS,
  NAV_ITEMS,
  VIETNAM_BARS,
} from './data';
import { flag } from './flags';
import { icon } from './icons';
import type { Country, FilterField, Kpi, Priority } from './types';

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export function renderHeader(): string {
  return (
    `<header class="header">` +
    `<div class="logo">` +
    `<span class="logo-mark">${icon('radar', 26)}</span>` +
    `<span class="logo-name">${HEADER_META.title}</span>` +
    `<span class="logo-sub">${HEADER_META.subtitle}</span>` +
    `</div>` +
    `<div class="header-right">` +
    `<label class="search">${icon('search', 15)}` +
    `<input type="text" placeholder="${HEADER_META.searchPlaceholder}" />` +
    `</label>` +
    `<button class="daterange" type="button">${icon('calendar', 15)}` +
    `<span>${HEADER_META.dateRange}</span>${icon('chevronDown', 13)}</button>` +
    `<div class="avatar">${avatarSvg()}${icon('chevronDown', 13, 'ic-muted')}</div>` +
    `<button class="btn-scan" id="btn-scan" type="button">${icon('scan', 15)}<span>${HEADER_META.scanLabel}</span></button>` +
    `</div>` +
    `</header>`
  );
}

function avatarSvg(): string {
  return (
    `<svg class="avatar-img" width="28" height="28" viewBox="0 0 28 28">` +
    `<defs><linearGradient id="av" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#7db4f7"/><stop offset="1" stop-color="#4a78e0"/>` +
    `</linearGradient></defs>` +
    `<circle cx="14" cy="14" r="14" fill="url(#av)"/>` +
    `<circle cx="14" cy="11" r="4.4" fill="#eaf2ff"/>` +
    `<path d="M6 24c1.6-4.4 4.8-6.4 8-6.4s6.4 2 8 6.4" fill="#eaf2ff"/>` +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

export function renderSidebar(activeId: string): string {
  const items = NAV_ITEMS.map(
    (n) =>
      `<div class="nav-item${n.id === activeId ? ' active' : ''}" data-nav="${n.id}" role="button" tabindex="0">` +
      `${icon(n.icon, 19)}<span>${n.label}</span></div>`
  ).join('');

  return (
    `<aside class="sidebar">` +
    `<nav class="nav">${items}</nav>` +
    `<div class="sidebar-foot" id="collapse-btn" role="button" tabindex="0">` +
    `${icon('chevronsLeft', 16)}<span>收起菜单</span>` +
    `</div>` +
    `</aside>`
  );
}

/* ------------------------------------------------------------------ */
/* 筛选条                                                              */
/* ------------------------------------------------------------------ */

export function renderFilters(): string {
  const cells = FILTERS.map(
    (f: FilterField) =>
      `<div class="filter">` +
      `<div class="filter-label">${f.label}</div>` +
      `<button class="filter-select" type="button" data-filter="${f.id}">` +
      `${icon(f.icon, 15, 'ic-muted')}<span class="filter-value">${f.value}</span>${icon('chevronDown', 13, 'ic-muted')}` +
      `</button>` +
      `</div>`
  ).join('');
  return `<section class="filters">${cells}</section>`;
}

/* ------------------------------------------------------------------ */
/* KPI                                                                 */
/* ------------------------------------------------------------------ */

function renderKpi(k: Kpi): string {
  const deltaCls = k.deltaType === 'up' ? 'delta-up' : 'delta-flat';
  const valueStyle = k.valueColor ? ` style="color:${k.valueColor}"` : '';
  const right =
    k.spark.type === 'target'
      ? `<span class="kpi-target">${icon('target', 40)}</span>`
      : `<span class="kpi-spark">${sparkline(k.spark, k.id)}</span>`;

  return (
    `<div class="kpi">` +
    `<span class="kpi-icon" style="background:${k.iconBg};color:${k.iconColor}">${icon(k.icon, 19)}</span>` +
    `<div class="kpi-main">` +
    `<div class="kpi-label">${k.label}</div>` +
    `<div class="kpi-value"${valueStyle}>${k.value}</div>` +
    `<div class="kpi-delta ${deltaCls}">${k.delta}</div>` +
    `</div>` +
    right +
    `</div>`
  );
}

export function renderKpis(): string {
  return `<section class="kpis">${KPIS.map(renderKpi).join('')}</section>`;
}

/* ------------------------------------------------------------------ */
/* 气泡图卡片                                                           */
/* ------------------------------------------------------------------ */

export function renderBubbleCard(): string {
  return (
    `<section class="card bubble-card">` +
    `<div class="card-title">市场吸引力 × 进入难度 ${icon('info', 14, 'ic-muted')}</div>` +
    `<div class="bubble-wrap">${bubbleChart(COUNTRIES)}</div>` +
    `<div class="card-note center">气泡大小代表综合机会指数</div>` +
    `</section>`
  );
}

/* ------------------------------------------------------------------ */
/* 国家机会排行表                                                       */
/* ------------------------------------------------------------------ */

const PRIORITY_CLASS: Record<Priority, string> = {
  P1: 'badge-p1',
  P2: 'badge-p2',
  P3: 'badge-p3',
};

function renderRow(c: Country): string {
  return (
    `<tr>` +
    `<td><div class="cell-country">${flag(c.code)}<span>${c.name}</span></div></td>` +
    `<td class="num num-opp">${c.opportunity}</td>` +
    `<td class="num num-growth">${c.growth}</td>` +
    `<td class="num num-digital">${c.digital}</td>` +
    `<td class="num num-customer">${c.customerValue}</td>` +
    `<td class="num num-diff">${c.entryDifficulty}</td>` +
    `<td><span class="badge ${PRIORITY_CLASS[c.priority]}">${c.priority}</span></td>` +
    `</tr>`
  );
}

export function renderRankingCard(): string {
  return (
    `<section class="card ranking-card">` +
    `<div class="card-title">国家机会排行</div>` +
    `<table class="rank-table">` +
    `<thead><tr>` +
    `<th>国家</th><th>机会指数</th><th>增长</th><th>数字化</th><th>客户价值</th><th>进入难度</th><th>建议</th>` +
    `</tr></thead>` +
    `<tbody>${COUNTRIES.map(renderRow).join('')}</tbody>` +
    `</table>` +
    `<div class="card-note">* 指数范围 0-100，分数越高代表机会越大</div>` +
    `</section>`
  );
}

/* ------------------------------------------------------------------ */
/* AI Agent 洞察面板                                                    */
/* ------------------------------------------------------------------ */

export function renderAgentPanel(): string {
  const bullets = INSIGHT.bullets.map((b) => `<li>${b}</li>`).join('');
  const chips = INSIGHT.chips
    .map((c) => `<button class="chip" type="button" data-chip="${c}">${c}</button>`)
    .join('');

  return (
    `<section class="card agent-card">` +
    `<div class="card-title">` +
    `<span class="agent-title">${icon('sparkles', 16, 'ic-primary')}AI Agent 洞察</span>` +
    `<button class="icon-btn" id="refresh-insight" type="button" title="重新生成">${icon('refresh', 15)}</button>` +
    `</div>` +
    `<div class="chat">` +
    `<div class="msg-user-row"><span class="msg-user">${INSIGHT.userQuestion}</span>` +
    `<span class="msg-user-avatar">` +
    `<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#e8f1fe"/>` +
    `<circle cx="10" cy="8" r="3" fill="#4a78e0"/><path d="M4 17c1.2-3 3.4-4.4 6-4.4s4.8 1.4 6 4.4" fill="#4a78e0"/></svg>` +
    `</span></div>` +
    `<div class="msg-ai">` +
    `<span class="ai-avatar">${icon('robot', 13)}</span>` +
    `<div class="ai-card"><ul>${bullets}</ul></div>` +
    `</div>` +
    `<div class="chips">${chips}</div>` +
    `</div>` +
    `<div class="detail">` +
    `<div class="detail-head">` +
    `<span class="detail-title"><i class="dot"></i>越南详情</span>` +
    `<a class="detail-link" href="javascript:void 0" id="view-report">查看报告 ${icon('external', 11)}</a>` +
    `</div>` +
    `<div class="detail-bars">${detailBars(VIETNAM_BARS)}</div>` +
    `<div class="detail-banner">综合机会 86 / 100，建议优先级 P1</div>` +
    `</div>` +
    `</section>`
  );
}

/* ------------------------------------------------------------------ */
/* 整页                                                                */
/* ------------------------------------------------------------------ */

export function renderApp(activeNav: string): string {
  return (
    renderHeader() +
    `<div class="layout">` +
    renderSidebar(activeNav) +
    `<main class="main">` +
    renderFilters() +
    renderKpis() +
    `<div class="grid-main">` +
    renderBubbleCard() +
    renderRankingCard() +
    renderAgentPanel() +
    `</div>` +
    `</main>` +
    `</div>` +
    `<div class="toast" id="toast"></div>`
  );
}
