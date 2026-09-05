import type { BarMetric, Country, SparkSpec } from './types';

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

const fmt = (n: number): string => n.toFixed(2).replace(/\.?0+$/, '');

/** Catmull-Rom → 三次贝塞尔平滑路径 */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return '';
  let d = `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

/** 把数值序列映射到 w×h 坐标（含 padding，底部留 2px） */
function mapPoints(values: number[], w: number, h: number, pad = 3): Array<[number, number]> {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);
  return values.map((v, i) => [
    pad + i * stepX,
    pad + (1 - (v - min) / span) * (h - pad * 2 - 2),
  ]);
}

/* ------------------------------------------------------------------ */
/* KPI 迷你图                                                          */
/* ------------------------------------------------------------------ */

function sparkBars(values: number[], color: string, w: number, h: number): string {
  const max = Math.max(...values);
  const bw = (w / values.length) * 0.58;
  const gap = w / values.length;
  const bars = values
    .map((v, i) => {
      const bh = Math.max(2, (v / max) * (h - 2));
      const x = i * gap + (gap - bw) / 2;
      return `<rect x="${fmt(x)}" y="${fmt(h - bh)}" width="${fmt(bw)}" height="${fmt(bh)}" rx="1.5" fill="${color}"/>`;
    })
    .join('');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`;
}

function sparkArea(values: number[], color: string, w: number, h: number, gid: string): string {
  const pts = mapPoints(values, w, h);
  const line = smoothPath(pts);
  const area = `${line} L ${fmt(pts[pts.length - 1][0])} ${h} L ${fmt(pts[0][0])} ${h} Z`;
  const [ex, ey] = pts[pts.length - 1];
  return (
    `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${color}" stop-opacity=".28"/>` +
    `<stop offset="1" stop-color="${color}" stop-opacity=".02"/>` +
    `</linearGradient></defs>` +
    `<path d="${area}" fill="url(#${gid})"/>` +
    `<path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="${fmt(ex)}" cy="${fmt(ey)}" r="3.2" fill="#fff" stroke="${color}" stroke-width="2"/>` +
    `</svg>`
  );
}

function sparkLine(values: number[], color: string, w: number, h: number): string {
  const pts = mapPoints(values, w, h);
  const line = smoothPath(pts);
  const [ex, ey] = pts[pts.length - 1];
  return (
    `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="${fmt(ex)}" cy="${fmt(ey)}" r="3.2" fill="#fff" stroke="${color}" stroke-width="2"/>` +
    `</svg>`
  );
}

/** KPI 卡片右侧迷你图分发 */
export function sparkline(spec: SparkSpec, uid: string): string {
  switch (spec.type) {
    case 'bars':
      return sparkBars(spec.values, spec.color, 74, 44);
    case 'area':
      return sparkArea(spec.values, spec.color, 92, 44, `g-${uid}`);
    case 'line':
      return sparkLine(spec.values, spec.color, 92, 44);
    case 'target':
      return '';
  }
}

/* ------------------------------------------------------------------ */
/* 气泡图：市场吸引力 × 进入难度                                        */
/* ------------------------------------------------------------------ */

export function bubbleChart(countries: Country[]): string {
  const W = 300;
  const H = 262;
  const px = { l: 34, r: 10, t: 16, b: 38 };
  const x0 = px.l;
  const y0 = px.t;
  const x1 = W - px.r;
  const y1 = H - px.b;
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;

  const cx = (v: number) => x0 + (v / 100) * (x1 - x0);
  const cy = (v: number) => y1 - (v / 100) * (y1 - y0);

  const bubbles = countries
    .map((c) => {
      const r = 10 + c.opportunity * 0.21; // 气泡大小 ∝ 综合机会指数
      const bx = cx(c.x);
      const by = cy(c.y);
      const fontSize = c.name.length > 2 ? 9.5 : 11;
      return (
        `<g class="bubble" data-code="${c.code}">` +
        `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(r)}" fill="${c.color}" fill-opacity=".88"/>` +
        `<text x="${fmt(bx)}" y="${fmt(by + 3.5)}" text-anchor="middle" font-size="${fontSize}" ` +
        `font-weight="600" fill="#fff">${c.name}</text>` +
        `</g>`
      );
    })
    .join('');

  return (
    `<svg class="bubble-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="市场吸引力与进入难度气泡图">` +
    // 象限虚线
    `<line x1="${midX}" y1="${y0}" x2="${midX}" y2="${y1}" stroke="#dfe5ee" stroke-dasharray="4 4"/>` +
    `<line x1="${x0}" y1="${midY}" x2="${x1}" y2="${midY}" stroke="#dfe5ee" stroke-dasharray="4 4"/>` +
    // Y 轴（带箭头）
    `<line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y0 - 4}" stroke="#c4cddb" stroke-width="1.2"/>` +
    `<path d="M ${x0 - 3} ${y0 + 1} L ${x0} ${y0 - 6} L ${x0 + 3} ${y0 + 1}" fill="none" stroke="#c4cddb" stroke-width="1.2"/>` +
    // X 轴（带箭头）
    `<line x1="${x0}" y1="${y1}" x2="${x1 + 4}" y2="${y1}" stroke="#c4cddb" stroke-width="1.2"/>` +
    `<path d="M ${x1 - 1} ${y1 - 3} L ${x1 + 6} ${y1} L ${x1 - 1} ${y1 + 3}" fill="none" stroke="#c4cddb" stroke-width="1.2"/>` +
    // 轴刻度文字
    `<text x="${x0 - 8}" y="${y0 + 3}" text-anchor="end" font-size="10" fill="#8a94a6">高</text>` +
    `<text x="${x0 - 8}" y="${y1 + 3}" text-anchor="end" font-size="10" fill="#8a94a6">低</text>` +
    `<text x="${x0}" y="${y1 + 14}" text-anchor="middle" font-size="10" fill="#8a94a6">容易</text>` +
    `<text x="${x1}" y="${y1 + 14}" text-anchor="middle" font-size="10" fill="#8a94a6">困难</text>` +
    // 轴标题
    `<text x="${(x0 + x1) / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#5b6b84">进入难度</text>` +
    `<text transform="translate(10 ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="#5b6b84">市场吸引力</text>` +
    bubbles +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* 越南详情：横向条形                                                   */
/* ------------------------------------------------------------------ */

export function detailBars(bars: BarMetric[]): string {
  return bars
    .map((b) => {
      const color = b.color ?? '#3b82f6';
      const pct = Math.min(100, Math.max(0, b.value));
      return (
        `<div class="bar-row">` +
        `<span class="bar-label">${b.label}</span>` +
        `<span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>` +
        `<span class="bar-value">${b.value}</span>` +
        `</div>`
      );
    })
    .join('');
}
