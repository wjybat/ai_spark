import type {
  AgentInsight,
  BarMetric,
  Country,
  FilterField,
  Kpi,
  NavItem,
} from './types';

/** 侧边导航 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'countries', label: 'Countries', icon: 'globe' },
  { id: 'retailers', label: 'Retailers', icon: 'store' },
  { id: 'sources', label: 'Sources', icon: 'database' },
  { id: 'tasks', label: 'Tasks', icon: 'task' },
  { id: 'agent', label: 'Agent', icon: 'robot' },
];

/** 顶部筛选条 */
export const FILTERS: FilterField[] = [
  {
    id: 'region',
    label: '扫描区域',
    icon: 'globe',
    value: '东南亚',
    options: ['东南亚', '中东', '拉美', '北非'],
  },
  {
    id: 'format',
    label: '目标业态',
    icon: 'store',
    value: '便利店 / Mini Mart',
    options: ['便利店 / Mini Mart', '大型商超 / Hypermarket', '药妆店 / Pharmacy', '专卖连锁'],
  },
  {
    id: 'product',
    label: '我们的产品',
    icon: 'chip',
    value: 'AI视频分析 / 智慧门店',
    options: ['AI视频分析 / 智慧门店', '智能货架 / RFID', '会员营销 / CRM'],
  },
  {
    id: 'customer',
    label: '目标客户',
    icon: 'building',
    value: '连锁零售企业',
    options: ['连锁零售企业', '品牌直营门店', '区域经销商'],
  },
  {
    id: 'period',
    label: '数据时间',
    icon: 'calendar',
    value: '最近3年',
    options: ['最近1年', '最近3年', '最近5年'],
  },
];

/** KPI 卡片 */
export const KPIS: Kpi[] = [
  {
    id: 'countries',
    label: '高潜国家',
    value: '3',
    delta: '↑ 1 较上期',
    deltaType: 'up',
    icon: 'globe',
    iconBg: '#e8f1fe',
    iconColor: '#3b82f6',
    spark: { type: 'bars', color: '#5b8def', values: [9, 14, 11, 17, 13, 20, 16, 23, 26] },
  },
  {
    id: 'opportunity',
    label: '综合机会指数',
    value: '84',
    delta: '↑ 6 较上期',
    deltaType: 'up',
    icon: 'radar',
    iconBg: '#e7f8f0',
    iconColor: '#10b981',
    spark: { type: 'area', color: '#22c38e', values: [14, 20, 16, 24, 19, 28, 24, 33, 38] },
  },
  {
    id: 'confidence',
    label: '数据可信度',
    value: '89%',
    delta: '↑ 4% 较上期',
    deltaType: 'up',
    icon: 'shield',
    iconBg: '#f0ebfe',
    iconColor: '#8b5cf6',
    spark: { type: 'line', color: '#8b5cf6', values: [24, 15, 26, 17, 30, 20, 33, 22, 30] },
  },
  {
    id: 'priority',
    label: '建议优先级',
    value: 'P1',
    valueColor: '#f59e0b',
    delta: '— 持平上期',
    deltaType: 'flat',
    icon: 'building',
    iconBg: '#f2f4f8',
    iconColor: '#8a94a6',
    spark: { type: 'target' },
  },
];

/** 国家机会数据（排行表 + 气泡图共用同一份数据源） */
export const COUNTRIES: Country[] = [
  {
    code: 'VN', name: '越南', opportunity: 86, growth: 92, digital: 78,
    customerValue: 88, entryDifficulty: 42, priority: 'P1', color: '#2fbb74', x: 27, y: 84,
  },
  {
    code: 'ID', name: '印尼', opportunity: 84, growth: 91, digital: 72,
    customerValue: 94, entryDifficulty: 63, priority: 'P1', color: '#5b8def', x: 73, y: 63,
  },
  {
    code: 'TH', name: '泰国', opportunity: 78, growth: 72, digital: 89,
    customerValue: 82, entryDifficulty: 35, priority: 'P2', color: '#a78bfa', x: 21, y: 46,
  },
  {
    code: 'MY', name: '马来西亚', opportunity: 73, growth: 65, digital: 91,
    customerValue: 75, entryDifficulty: 30, priority: 'P2', color: '#f2b64b', x: 23, y: 19,
  },
  {
    code: 'PH', name: '菲律宾', opportunity: 69, growth: 82, digital: 63,
    customerValue: 67, entryDifficulty: 55, priority: 'P3', color: '#3bbdb6', x: 71, y: 23,
  },
];

/** AI Agent 洞察 */
export const INSIGHT: AgentInsight = {
  userQuestion: '为什么越南排名第一?',
  bullets: [
    '现代零售渗透率持续提升',
    '便利店与 Mini Mart 扩张速度快',
    '头部连锁企业集中度较高',
    '适合智慧门店规模化落地',
  ],
  chips: ['比较越南和印尼', '查看主要零售商', '按防损场景重算'],
};

/** 越南详情条形指标 */
export const VIETNAM_BARS: BarMetric[] = [
  { label: '市场规模', value: 82 },
  { label: '市场增长', value: 93 },
  { label: '连锁扩张', value: 94 },
  { label: '数字化水平', value: 78 },
  { label: '潜在客户密度', value: 88 },
  { label: '进入难度', value: 42, color: '#f2a93b' },
];

export const HEADER_META = {
  title: 'Market Radar',
  subtitle: '零售市场扫描与机会发现',
  searchPlaceholder: '搜索国家、零售商或数据源',
  dateRange: '2022-05-01 ~ 2025-04-30',
  scanLabel: '开始扫描',
};
