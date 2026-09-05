/** 东南亚五国国旗（内联 SVG，18x13，移植自参考实现） */
const FLAGS: Record<string, string> = {
  VN: '<rect width="18" height="13" fill="#da251d"/><path d="M9 3.1l1.02 2.24 2.44.19-1.87 1.55.57 2.35L9 8.1l-2.16 1.33.57-2.35-1.87-1.55 2.44-.19z" fill="#ffde00"/>',
  ID: '<rect width="18" height="13" fill="#fff"/><rect width="18" height="6.5" fill="#e70011"/>',
  TH: '<rect width="18" height="13" fill="#a51931"/><rect y="2.17" width="18" height="8.66" fill="#f4f5f8"/><rect y="4.34" width="18" height="4.32" fill="#2d2a4a"/>',
  MY: '<rect width="18" height="13" fill="#fff"/><g fill="#cc0001"><rect y="0" width="18" height="1.86"/><rect y="3.72" width="18" height="1.86"/><rect y="7.44" width="18" height="1.86"/><rect y="11.16" width="18" height="1.86"/></g><rect width="9.5" height="7.44" fill="#010066"/><circle cx="4" cy="3.72" r="2.1" fill="#fc0"/><circle cx="4.85" cy="3.72" r="1.85" fill="#010066"/><path d="M7.3 2.5l.32.7.76.08-.57.5.16.74-.67-.4-.67.4.16-.74-.57-.5.76-.08z" fill="#fc0"/>',
  PH: '<rect width="18" height="6.5" fill="#0038a8"/><rect y="6.5" width="18" height="6.5" fill="#ce1126"/><polygon points="0,0 7.5,6.5 0,13" fill="#fff"/><circle cx="2.4" cy="6.5" r="1.1" fill="#fcd116"/>',
};

function flagEmoji(code: string): string {
  const normalized = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🌐";
  return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
}

export function Flag({ code }: { code: string }): React.JSX.Element {
  const body = FLAGS[code.toUpperCase()];
  if (body === undefined) {
    return <span className="flag" role="img" aria-label={`${code.toUpperCase()} flag`}>{flagEmoji(code)}</span>;
  }
  return (
    <svg
      className="flag"
      width="18"
      height="13"
      viewBox="0 0 18 13"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: `<defs><clipPath id="f${code}"><rect width="18" height="13" rx="2"/></clipPath></defs><g clip-path="url(#f${code})">${body}</g>`,
      }}
    />
  );
}

export const COUNTRY_META: Record<string, { name: string; color: string }> = {
  cty_vn: { name: "越南", color: "#2fbb74" },
  cty_id: { name: "印尼", color: "#5b8def" },
  cty_th: { name: "泰国", color: "#a78bfa" },
  cty_my: { name: "马来西亚", color: "#f2b64b" },
  cty_ph: { name: "菲律宾", color: "#3bbdb6" },
  cty_sa: { name: "沙特阿拉伯", color: "#16a34a" },
  cty_ae: { name: "阿联酋", color: "#ef4444" },
  cty_qa: { name: "卡塔尔", color: "#8b1e3f" },
  cty_kw: { name: "科威特", color: "#22c55e" },
  cty_om: { name: "阿曼", color: "#dc2626" },
  cty_mx: { name: "墨西哥", color: "#15803d" },
  cty_br: { name: "巴西", color: "#eab308" },
  cty_co: { name: "哥伦比亚", color: "#facc15" },
  cty_cl: { name: "智利", color: "#2563eb" },
  cty_pe: { name: "秘鲁", color: "#dc2626" },
  cty_eg: { name: "埃及", color: "#ef4444" },
  cty_ma: { name: "摩洛哥", color: "#b91c1c" },
  cty_dz: { name: "阿尔及利亚", color: "#16a34a" },
  cty_tn: { name: "突尼斯", color: "#e11d48" },
  cty_ly: { name: "利比亚", color: "#111827" },
};
