/**
 * 东南亚五国国旗（内联 SVG，18x13，圆角 2px）
 * 为保证跨平台一致渲染，不使用 emoji 旗帜。
 */

const CLIP = (id: string) =>
  `<clipPath id="${id}"><rect width="18" height="13" rx="2"/></clipPath>`;

const wrap = (id: string, body: string) =>
  `<svg class="flag" width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">` +
  `<defs>${CLIP(id)}</defs><g clip-path="url(#${id})">${body}</g></svg>`;

const FLAGS: Record<string, string> = {
  // 越南：红底 + 黄色五角星
  VN: wrap(
    'fvn',
    '<rect width="18" height="13" fill="#da251d"/>' +
      '<path d="M9 3.1l1.02 2.24 2.44.19-1.87 1.55.57 2.35L9 8.1l-2.16 1.33.57-2.35-1.87-1.55 2.44-.19z" fill="#ffde00"/>'
  ),
  // 印尼：上红下白
  ID: wrap(
    'fid',
    '<rect width="18" height="13" fill="#fff"/>' + '<rect width="18" height="6.5" fill="#e70011"/>'
  ),
  // 泰国：红-白-蓝(双)-白-红 横条
  TH: wrap(
    'fth',
    '<rect width="18" height="13" fill="#a51931"/>' +
      '<rect y="2.17" width="18" height="8.66" fill="#f4f5f8"/>' +
      '<rect y="4.34" width="18" height="4.32" fill="#2d2a4a"/>'
  ),
  // 马来西亚：红白条纹 + 蓝色 Canton + 黄色新月星
  MY: wrap(
    'fmy',
    '<rect width="18" height="13" fill="#fff"/>' +
      '<g fill="#cc0001">' +
      '<rect y="0" width="18" height="1.86"/><rect y="3.72" width="18" height="1.86"/>' +
      '<rect y="7.44" width="18" height="1.86"/><rect y="11.16" width="18" height="1.86"/>' +
      '</g>' +
      '<rect width="9.5" height="7.44" fill="#010066"/>' +
      '<circle cx="4" cy="3.72" r="2.1" fill="#fc0"/>' +
      '<circle cx="4.85" cy="3.72" r="1.85" fill="#010066"/>' +
      '<path d="M7.3 2.5l.32.7.76.08-.57.5.16.74-.67-.4-.67.4.16-.74-.57-.5.76-.08z" fill="#fc0"/>'
  ),
  // 菲律宾：上蓝下红 + 左侧白三角 + 金色太阳
  PH: wrap(
    'fph',
    '<rect width="18" height="6.5" fill="#0038a8"/>' +
      '<rect y="6.5" width="18" height="6.5" fill="#ce1126"/>' +
      '<polygon points="0,0 7.5,6.5 0,13" fill="#fff"/>' +
      '<circle cx="2.4" cy="6.5" r="1.1" fill="#fcd116"/>'
  ),
};

export function flag(code: string): string {
  return FLAGS[code] ?? '';
}
