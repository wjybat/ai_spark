/**
 * Market Radar — 领域模型类型定义
 */

export type Priority = 'P1' | 'P2' | 'P3';

export type IconName =
  | 'radar'
  | 'scan'
  | 'search'
  | 'calendar'
  | 'chevronDown'
  | 'chevronsLeft'
  | 'home'
  | 'globe'
  | 'store'
  | 'database'
  | 'task'
  | 'robot'
  | 'building'
  | 'chip'
  | 'info'
  | 'refresh'
  | 'sparkles'
  | 'target'
  | 'external'
  | 'arrowUp'
  | 'shield';

/** 侧边导航项 */
export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

/** 顶部筛选字段 */
export interface FilterField {
  id: string;
  label: string;
  icon: IconName;
  value: string;
  options: string[];
}

/** KPI 迷你图规格 */
export type SparkSpec =
  | { type: 'bars'; values: number[]; color: string }
  | { type: 'area'; values: number[]; color: string }
  | { type: 'line'; values: number[]; color: string }
  | { type: 'target' };

/** KPI 卡片 */
export interface Kpi {
  id: string;
  label: string;
  value: string;
  valueColor?: string;
  delta: string;
  deltaType: 'up' | 'flat';
  icon: IconName;
  iconBg: string;
  iconColor: string;
  spark: SparkSpec;
}

/** 国家机会数据（表格 + 气泡图共用） */
export interface Country {
  /** 旗帜代码: VN / ID / TH / MY / PH */
  code: string;
  name: string;
  /** 机会指数 0-100 */
  opportunity: number;
  /** 增长 0-100 */
  growth: number;
  /** 数字化 0-100 */
  digital: number;
  /** 客户价值 0-100 */
  customerValue: number;
  /** 进入难度 0-100（越高越难） */
  entryDifficulty: number;
  priority: Priority;
  /** 气泡颜色 */
  color: string;
  /** 气泡图 X: 进入难度 0-100 */
  x: number;
  /** 气泡图 Y: 市场吸引力 0-100 */
  y: number;
}

/** 越南详情横向条形 */
export interface BarMetric {
  label: string;
  value: number;
  color?: string;
}

/** AI Agent 洞察内容 */
export interface AgentInsight {
  userQuestion: string;
  bullets: string[];
  chips: string[];
}
