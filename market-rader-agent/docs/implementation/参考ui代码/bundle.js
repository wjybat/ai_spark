"use strict";
(() => {
  // src/charts.ts
  var fmt = (n) => n.toFixed(2).replace(/\.?0+$/, "");
  function smoothPath(pts) {
    if (pts.length < 2) return "";
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
  function mapPoints(values, w, h, pad = 3) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    const stepX = (w - pad * 2) / (values.length - 1);
    return values.map((v, i) => [
      pad + i * stepX,
      pad + (1 - (v - min) / span) * (h - pad * 2 - 2)
    ]);
  }
  function sparkBars(values, color, w, h) {
    const max = Math.max(...values);
    const bw = w / values.length * 0.58;
    const gap = w / values.length;
    const bars = values.map((v, i) => {
      const bh = Math.max(2, v / max * (h - 2));
      const x = i * gap + (gap - bw) / 2;
      return `<rect x="${fmt(x)}" y="${fmt(h - bh)}" width="${fmt(bw)}" height="${fmt(bh)}" rx="1.5" fill="${color}"/>`;
    }).join("");
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`;
  }
  function sparkArea(values, color, w, h, gid) {
    const pts = mapPoints(values, w, h);
    const line = smoothPath(pts);
    const area = `${line} L ${fmt(pts[pts.length - 1][0])} ${h} L ${fmt(pts[0][0])} ${h} Z`;
    const [ex, ey] = pts[pts.length - 1];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity=".02"/></linearGradient></defs><path d="${area}" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/><circle cx="${fmt(ex)}" cy="${fmt(ey)}" r="3.2" fill="#fff" stroke="${color}" stroke-width="2"/></svg>`;
  }
  function sparkLine(values, color, w, h) {
    const pts = mapPoints(values, w, h);
    const line = smoothPath(pts);
    const [ex, ey] = pts[pts.length - 1];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/><circle cx="${fmt(ex)}" cy="${fmt(ey)}" r="3.2" fill="#fff" stroke="${color}" stroke-width="2"/></svg>`;
  }
  function sparkline(spec, uid) {
    switch (spec.type) {
      case "bars":
        return sparkBars(spec.values, spec.color, 74, 44);
      case "area":
        return sparkArea(spec.values, spec.color, 92, 44, `g-${uid}`);
      case "line":
        return sparkLine(spec.values, spec.color, 92, 44);
      case "target":
        return "";
    }
  }
  function bubbleChart(countries) {
    const W = 300;
    const H = 262;
    const px = { l: 34, r: 10, t: 16, b: 38 };
    const x0 = px.l;
    const y0 = px.t;
    const x1 = W - px.r;
    const y1 = H - px.b;
    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;
    const cx = (v) => x0 + v / 100 * (x1 - x0);
    const cy = (v) => y1 - v / 100 * (y1 - y0);
    const bubbles = countries.map((c) => {
      const r = 10 + c.opportunity * 0.21;
      const bx = cx(c.x);
      const by = cy(c.y);
      const fontSize = c.name.length > 2 ? 9.5 : 11;
      return `<g class="bubble" data-code="${c.code}"><circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(r)}" fill="${c.color}" fill-opacity=".88"/><text x="${fmt(bx)}" y="${fmt(by + 3.5)}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#fff">${c.name}</text></g>`;
    }).join("");
    return `<svg class="bubble-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="\u5E02\u573A\u5438\u5F15\u529B\u4E0E\u8FDB\u5165\u96BE\u5EA6\u6C14\u6CE1\u56FE"><line x1="${midX}" y1="${y0}" x2="${midX}" y2="${y1}" stroke="#dfe5ee" stroke-dasharray="4 4"/><line x1="${x0}" y1="${midY}" x2="${x1}" y2="${midY}" stroke="#dfe5ee" stroke-dasharray="4 4"/><line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y0 - 4}" stroke="#c4cddb" stroke-width="1.2"/><path d="M ${x0 - 3} ${y0 + 1} L ${x0} ${y0 - 6} L ${x0 + 3} ${y0 + 1}" fill="none" stroke="#c4cddb" stroke-width="1.2"/><line x1="${x0}" y1="${y1}" x2="${x1 + 4}" y2="${y1}" stroke="#c4cddb" stroke-width="1.2"/><path d="M ${x1 - 1} ${y1 - 3} L ${x1 + 6} ${y1} L ${x1 - 1} ${y1 + 3}" fill="none" stroke="#c4cddb" stroke-width="1.2"/><text x="${x0 - 8}" y="${y0 + 3}" text-anchor="end" font-size="10" fill="#8a94a6">\u9AD8</text><text x="${x0 - 8}" y="${y1 + 3}" text-anchor="end" font-size="10" fill="#8a94a6">\u4F4E</text><text x="${x0}" y="${y1 + 14}" text-anchor="middle" font-size="10" fill="#8a94a6">\u5BB9\u6613</text><text x="${x1}" y="${y1 + 14}" text-anchor="middle" font-size="10" fill="#8a94a6">\u56F0\u96BE</text><text x="${(x0 + x1) / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#5b6b84">\u8FDB\u5165\u96BE\u5EA6</text><text transform="translate(10 ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="#5b6b84">\u5E02\u573A\u5438\u5F15\u529B</text>` + bubbles + `</svg>`;
  }
  function detailBars(bars) {
    return bars.map((b) => {
      var _a;
      const color = (_a = b.color) != null ? _a : "#3b82f6";
      const pct = Math.min(100, Math.max(0, b.value));
      return `<div class="bar-row"><span class="bar-label">${b.label}</span><span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span><span class="bar-value">${b.value}</span></div>`;
    }).join("");
  }

  // src/data.ts
  var NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: "home" },
    { id: "countries", label: "Countries", icon: "globe" },
    { id: "retailers", label: "Retailers", icon: "store" },
    { id: "sources", label: "Sources", icon: "database" },
    { id: "tasks", label: "Tasks", icon: "task" },
    { id: "agent", label: "Agent", icon: "robot" }
  ];
  var FILTERS = [
    {
      id: "region",
      label: "\u626B\u63CF\u533A\u57DF",
      icon: "globe",
      value: "\u4E1C\u5357\u4E9A",
      options: ["\u4E1C\u5357\u4E9A", "\u4E2D\u4E1C", "\u62C9\u7F8E", "\u5317\u975E"]
    },
    {
      id: "format",
      label: "\u76EE\u6807\u4E1A\u6001",
      icon: "store",
      value: "\u4FBF\u5229\u5E97 / Mini Mart",
      options: ["\u4FBF\u5229\u5E97 / Mini Mart", "\u5927\u578B\u5546\u8D85 / Hypermarket", "\u836F\u5986\u5E97 / Pharmacy", "\u4E13\u5356\u8FDE\u9501"]
    },
    {
      id: "product",
      label: "\u6211\u4EEC\u7684\u4EA7\u54C1",
      icon: "chip",
      value: "AI\u89C6\u9891\u5206\u6790 / \u667A\u6167\u95E8\u5E97",
      options: ["AI\u89C6\u9891\u5206\u6790 / \u667A\u6167\u95E8\u5E97", "\u667A\u80FD\u8D27\u67B6 / RFID", "\u4F1A\u5458\u8425\u9500 / CRM"]
    },
    {
      id: "customer",
      label: "\u76EE\u6807\u5BA2\u6237",
      icon: "building",
      value: "\u8FDE\u9501\u96F6\u552E\u4F01\u4E1A",
      options: ["\u8FDE\u9501\u96F6\u552E\u4F01\u4E1A", "\u54C1\u724C\u76F4\u8425\u95E8\u5E97", "\u533A\u57DF\u7ECF\u9500\u5546"]
    },
    {
      id: "period",
      label: "\u6570\u636E\u65F6\u95F4",
      icon: "calendar",
      value: "\u6700\u8FD13\u5E74",
      options: ["\u6700\u8FD11\u5E74", "\u6700\u8FD13\u5E74", "\u6700\u8FD15\u5E74"]
    }
  ];
  var KPIS = [
    {
      id: "countries",
      label: "\u9AD8\u6F5C\u56FD\u5BB6",
      value: "3",
      delta: "\u2191 1 \u8F83\u4E0A\u671F",
      deltaType: "up",
      icon: "globe",
      iconBg: "#e8f1fe",
      iconColor: "#3b82f6",
      spark: { type: "bars", color: "#5b8def", values: [9, 14, 11, 17, 13, 20, 16, 23, 26] }
    },
    {
      id: "opportunity",
      label: "\u7EFC\u5408\u673A\u4F1A\u6307\u6570",
      value: "84",
      delta: "\u2191 6 \u8F83\u4E0A\u671F",
      deltaType: "up",
      icon: "radar",
      iconBg: "#e7f8f0",
      iconColor: "#10b981",
      spark: { type: "area", color: "#22c38e", values: [14, 20, 16, 24, 19, 28, 24, 33, 38] }
    },
    {
      id: "confidence",
      label: "\u6570\u636E\u53EF\u4FE1\u5EA6",
      value: "89%",
      delta: "\u2191 4% \u8F83\u4E0A\u671F",
      deltaType: "up",
      icon: "shield",
      iconBg: "#f0ebfe",
      iconColor: "#8b5cf6",
      spark: { type: "line", color: "#8b5cf6", values: [24, 15, 26, 17, 30, 20, 33, 22, 30] }
    },
    {
      id: "priority",
      label: "\u5EFA\u8BAE\u4F18\u5148\u7EA7",
      value: "P1",
      valueColor: "#f59e0b",
      delta: "\u2014 \u6301\u5E73\u4E0A\u671F",
      deltaType: "flat",
      icon: "building",
      iconBg: "#f2f4f8",
      iconColor: "#8a94a6",
      spark: { type: "target" }
    }
  ];
  var COUNTRIES = [
    {
      code: "VN",
      name: "\u8D8A\u5357",
      opportunity: 86,
      growth: 92,
      digital: 78,
      customerValue: 88,
      entryDifficulty: 42,
      priority: "P1",
      color: "#2fbb74",
      x: 27,
      y: 84
    },
    {
      code: "ID",
      name: "\u5370\u5C3C",
      opportunity: 84,
      growth: 91,
      digital: 72,
      customerValue: 94,
      entryDifficulty: 63,
      priority: "P1",
      color: "#5b8def",
      x: 73,
      y: 63
    },
    {
      code: "TH",
      name: "\u6CF0\u56FD",
      opportunity: 78,
      growth: 72,
      digital: 89,
      customerValue: 82,
      entryDifficulty: 35,
      priority: "P2",
      color: "#a78bfa",
      x: 21,
      y: 46
    },
    {
      code: "MY",
      name: "\u9A6C\u6765\u897F\u4E9A",
      opportunity: 73,
      growth: 65,
      digital: 91,
      customerValue: 75,
      entryDifficulty: 30,
      priority: "P2",
      color: "#f2b64b",
      x: 23,
      y: 19
    },
    {
      code: "PH",
      name: "\u83F2\u5F8B\u5BBE",
      opportunity: 69,
      growth: 82,
      digital: 63,
      customerValue: 67,
      entryDifficulty: 55,
      priority: "P3",
      color: "#3bbdb6",
      x: 71,
      y: 23
    }
  ];
  var INSIGHT = {
    userQuestion: "\u4E3A\u4EC0\u4E48\u8D8A\u5357\u6392\u540D\u7B2C\u4E00?",
    bullets: [
      "\u73B0\u4EE3\u96F6\u552E\u6E17\u900F\u7387\u6301\u7EED\u63D0\u5347",
      "\u4FBF\u5229\u5E97\u4E0E Mini Mart \u6269\u5F20\u901F\u5EA6\u5FEB",
      "\u5934\u90E8\u8FDE\u9501\u4F01\u4E1A\u96C6\u4E2D\u5EA6\u8F83\u9AD8",
      "\u9002\u5408\u667A\u6167\u95E8\u5E97\u89C4\u6A21\u5316\u843D\u5730"
    ],
    chips: ["\u6BD4\u8F83\u8D8A\u5357\u548C\u5370\u5C3C", "\u67E5\u770B\u4E3B\u8981\u96F6\u552E\u5546", "\u6309\u9632\u635F\u573A\u666F\u91CD\u7B97"]
  };
  var VIETNAM_BARS = [
    { label: "\u5E02\u573A\u89C4\u6A21", value: 82 },
    { label: "\u5E02\u573A\u589E\u957F", value: 93 },
    { label: "\u8FDE\u9501\u6269\u5F20", value: 94 },
    { label: "\u6570\u5B57\u5316\u6C34\u5E73", value: 78 },
    { label: "\u6F5C\u5728\u5BA2\u6237\u5BC6\u5EA6", value: 88 },
    { label: "\u8FDB\u5165\u96BE\u5EA6", value: 42, color: "#f2a93b" }
  ];
  var HEADER_META = {
    title: "Market Radar",
    subtitle: "\u96F6\u552E\u5E02\u573A\u626B\u63CF\u4E0E\u673A\u4F1A\u53D1\u73B0",
    searchPlaceholder: "\u641C\u7D22\u56FD\u5BB6\u3001\u96F6\u552E\u5546\u6216\u6570\u636E\u6E90",
    dateRange: "2022-05-01 ~ 2025-04-30",
    scanLabel: "\u5F00\u59CB\u626B\u63CF"
  };

  // src/flags.ts
  var CLIP = (id) => `<clipPath id="${id}"><rect width="18" height="13" rx="2"/></clipPath>`;
  var wrap = (id, body) => `<svg class="flag" width="18" height="13" viewBox="0 0 18 13" aria-hidden="true"><defs>${CLIP(id)}</defs><g clip-path="url(#${id})">${body}</g></svg>`;
  var FLAGS = {
    // 越南：红底 + 黄色五角星
    VN: wrap(
      "fvn",
      '<rect width="18" height="13" fill="#da251d"/><path d="M9 3.1l1.02 2.24 2.44.19-1.87 1.55.57 2.35L9 8.1l-2.16 1.33.57-2.35-1.87-1.55 2.44-.19z" fill="#ffde00"/>'
    ),
    // 印尼：上红下白
    ID: wrap(
      "fid",
      '<rect width="18" height="13" fill="#fff"/><rect width="18" height="6.5" fill="#e70011"/>'
    ),
    // 泰国：红-白-蓝(双)-白-红 横条
    TH: wrap(
      "fth",
      '<rect width="18" height="13" fill="#a51931"/><rect y="2.17" width="18" height="8.66" fill="#f4f5f8"/><rect y="4.34" width="18" height="4.32" fill="#2d2a4a"/>'
    ),
    // 马来西亚：红白条纹 + 蓝色 Canton + 黄色新月星
    MY: wrap(
      "fmy",
      '<rect width="18" height="13" fill="#fff"/><g fill="#cc0001"><rect y="0" width="18" height="1.86"/><rect y="3.72" width="18" height="1.86"/><rect y="7.44" width="18" height="1.86"/><rect y="11.16" width="18" height="1.86"/></g><rect width="9.5" height="7.44" fill="#010066"/><circle cx="4" cy="3.72" r="2.1" fill="#fc0"/><circle cx="4.85" cy="3.72" r="1.85" fill="#010066"/><path d="M7.3 2.5l.32.7.76.08-.57.5.16.74-.67-.4-.67.4.16-.74-.57-.5.76-.08z" fill="#fc0"/>'
    ),
    // 菲律宾：上蓝下红 + 左侧白三角 + 金色太阳
    PH: wrap(
      "fph",
      '<rect width="18" height="6.5" fill="#0038a8"/><rect y="6.5" width="18" height="6.5" fill="#ce1126"/><polygon points="0,0 7.5,6.5 0,13" fill="#fff"/><circle cx="2.4" cy="6.5" r="1.1" fill="#fcd116"/>'
    )
  };
  function flag(code) {
    var _a;
    return (_a = FLAGS[code]) != null ? _a : "";
  }

  // src/icons.ts
  var PATHS = {
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.4 5.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.6" cy="8.4" r="1" fill="currentColor" stroke="none"/>',
    scan: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M4 12h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-3.8-3.8"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronsLeft: '<path d="m11 7-5 5 5 5M18 7l-5 5 5 5"/>',
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.9 5.7 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.7-3.9-9s1.4-6.4 3.9-9z"/>',
    store: '<path d="M4 9l1.4-5h13.2L20 9"/><path d="M4 9h16"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M9.5 20v-5h5v5"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/><path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="4" r="1"/><circle cx="9.5" cy="13" r=".7" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r=".7" fill="currentColor" stroke="none"/><path d="M9.5 16.2h5"/><path d="M2.5 12v3M21.5 12v3"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10.5 21v-3h3v3"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="2"/><rect x="10.5" y="10.5" width="3" height="3"/><path d="M9.5 2.5v3M14.5 2.5v3M9.5 18.5v3M14.5 18.5v3M2.5 9.5h3M2.5 14.5h3M18.5 9.5h3M18.5 14.5h3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5"/><circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3.5V9h-5.5"/>',
    sparkles: '<path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/><path d="M18.6 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    external: '<path d="M13.5 5H19v5.5"/><path d="M19 5l-8.5 8.5"/><path d="M19 13.5V19H5V5h5.5"/>',
    arrowUp: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    shield: '<path d="M12 3l7 2.8v5.4c0 4.4-3 8.1-7 9.8-4-1.7-7-5.4-7-9.8V5.8z"/><path d="m9 11.8 2.2 2.2 3.8-4"/>'
  };
  function icon(name, size = 18, cls = "") {
    const clsAttr = cls ? ` ${cls}` : "";
    return `<svg class="ic${clsAttr}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
  }

  // src/components.ts
  function renderHeader() {
    return `<header class="header"><div class="logo"><span class="logo-mark">${icon("radar", 26)}</span><span class="logo-name">${HEADER_META.title}</span><span class="logo-sub">${HEADER_META.subtitle}</span></div><div class="header-right"><label class="search">${icon("search", 15)}<input type="text" placeholder="${HEADER_META.searchPlaceholder}" /></label><button class="daterange" type="button">${icon("calendar", 15)}<span>${HEADER_META.dateRange}</span>${icon("chevronDown", 13)}</button><div class="avatar">${avatarSvg()}${icon("chevronDown", 13, "ic-muted")}</div><button class="btn-scan" id="btn-scan" type="button">${icon("scan", 15)}<span>${HEADER_META.scanLabel}</span></button></div></header>`;
  }
  function avatarSvg() {
    return `<svg class="avatar-img" width="28" height="28" viewBox="0 0 28 28"><defs><linearGradient id="av" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7db4f7"/><stop offset="1" stop-color="#4a78e0"/></linearGradient></defs><circle cx="14" cy="14" r="14" fill="url(#av)"/><circle cx="14" cy="11" r="4.4" fill="#eaf2ff"/><path d="M6 24c1.6-4.4 4.8-6.4 8-6.4s6.4 2 8 6.4" fill="#eaf2ff"/></svg>`;
  }
  function renderSidebar(activeId) {
    const items = NAV_ITEMS.map(
      (n) => `<div class="nav-item${n.id === activeId ? " active" : ""}" data-nav="${n.id}" role="button" tabindex="0">${icon(n.icon, 19)}<span>${n.label}</span></div>`
    ).join("");
    return `<aside class="sidebar"><nav class="nav">${items}</nav><div class="sidebar-foot" id="collapse-btn" role="button" tabindex="0">${icon("chevronsLeft", 16)}<span>\u6536\u8D77\u83DC\u5355</span></div></aside>`;
  }
  function renderFilters() {
    const cells = FILTERS.map(
      (f) => `<div class="filter"><div class="filter-label">${f.label}</div><button class="filter-select" type="button" data-filter="${f.id}">${icon(f.icon, 15, "ic-muted")}<span class="filter-value">${f.value}</span>${icon("chevronDown", 13, "ic-muted")}</button></div>`
    ).join("");
    return `<section class="filters">${cells}</section>`;
  }
  function renderKpi(k) {
    const deltaCls = k.deltaType === "up" ? "delta-up" : "delta-flat";
    const valueStyle = k.valueColor ? ` style="color:${k.valueColor}"` : "";
    const right = k.spark.type === "target" ? `<span class="kpi-target">${icon("target", 40)}</span>` : `<span class="kpi-spark">${sparkline(k.spark, k.id)}</span>`;
    return `<div class="kpi"><span class="kpi-icon" style="background:${k.iconBg};color:${k.iconColor}">${icon(k.icon, 19)}</span><div class="kpi-main"><div class="kpi-label">${k.label}</div><div class="kpi-value"${valueStyle}>${k.value}</div><div class="kpi-delta ${deltaCls}">${k.delta}</div></div>` + right + `</div>`;
  }
  function renderKpis() {
    return `<section class="kpis">${KPIS.map(renderKpi).join("")}</section>`;
  }
  function renderBubbleCard() {
    return `<section class="card bubble-card"><div class="card-title">\u5E02\u573A\u5438\u5F15\u529B \xD7 \u8FDB\u5165\u96BE\u5EA6 ${icon("info", 14, "ic-muted")}</div><div class="bubble-wrap">${bubbleChart(COUNTRIES)}</div><div class="card-note center">\u6C14\u6CE1\u5927\u5C0F\u4EE3\u8868\u7EFC\u5408\u673A\u4F1A\u6307\u6570</div></section>`;
  }
  var PRIORITY_CLASS = {
    P1: "badge-p1",
    P2: "badge-p2",
    P3: "badge-p3"
  };
  function renderRow(c) {
    return `<tr><td><div class="cell-country">${flag(c.code)}<span>${c.name}</span></div></td><td class="num num-opp">${c.opportunity}</td><td class="num num-growth">${c.growth}</td><td class="num num-digital">${c.digital}</td><td class="num num-customer">${c.customerValue}</td><td class="num num-diff">${c.entryDifficulty}</td><td><span class="badge ${PRIORITY_CLASS[c.priority]}">${c.priority}</span></td></tr>`;
  }
  function renderRankingCard() {
    return `<section class="card ranking-card"><div class="card-title">\u56FD\u5BB6\u673A\u4F1A\u6392\u884C</div><table class="rank-table"><thead><tr><th>\u56FD\u5BB6</th><th>\u673A\u4F1A\u6307\u6570</th><th>\u589E\u957F</th><th>\u6570\u5B57\u5316</th><th>\u5BA2\u6237\u4EF7\u503C</th><th>\u8FDB\u5165\u96BE\u5EA6</th><th>\u5EFA\u8BAE</th></tr></thead><tbody>${COUNTRIES.map(renderRow).join("")}</tbody></table><div class="card-note">* \u6307\u6570\u8303\u56F4 0-100\uFF0C\u5206\u6570\u8D8A\u9AD8\u4EE3\u8868\u673A\u4F1A\u8D8A\u5927</div></section>`;
  }
  function renderAgentPanel() {
    const bullets = INSIGHT.bullets.map((b) => `<li>${b}</li>`).join("");
    const chips = INSIGHT.chips.map((c) => `<button class="chip" type="button" data-chip="${c}">${c}</button>`).join("");
    return `<section class="card agent-card"><div class="card-title"><span class="agent-title">${icon("sparkles", 16, "ic-primary")}AI Agent \u6D1E\u5BDF</span><button class="icon-btn" id="refresh-insight" type="button" title="\u91CD\u65B0\u751F\u6210">${icon("refresh", 15)}</button></div><div class="chat"><div class="msg-user-row"><span class="msg-user">${INSIGHT.userQuestion}</span><span class="msg-user-avatar"><svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#e8f1fe"/><circle cx="10" cy="8" r="3" fill="#4a78e0"/><path d="M4 17c1.2-3 3.4-4.4 6-4.4s4.8 1.4 6 4.4" fill="#4a78e0"/></svg></span></div><div class="msg-ai"><span class="ai-avatar">${icon("robot", 13)}</span><div class="ai-card"><ul>${bullets}</ul></div></div><div class="chips">${chips}</div></div><div class="detail"><div class="detail-head"><span class="detail-title"><i class="dot"></i>\u8D8A\u5357\u8BE6\u60C5</span><a class="detail-link" href="javascript:void 0" id="view-report">\u67E5\u770B\u62A5\u544A ${icon("external", 11)}</a></div><div class="detail-bars">${detailBars(VIETNAM_BARS)}</div><div class="detail-banner">\u7EFC\u5408\u673A\u4F1A 86 / 100\uFF0C\u5EFA\u8BAE\u4F18\u5148\u7EA7 P1</div></div></section>`;
  }
  function renderApp(activeNav2) {
    return renderHeader() + `<div class="layout">` + renderSidebar(activeNav2) + `<main class="main">` + renderFilters() + renderKpis() + `<div class="grid-main">` + renderBubbleCard() + renderRankingCard() + renderAgentPanel() + `</div></main></div><div class="toast" id="toast"></div>`;
  }

  // src/main.ts
  var app = document.getElementById("app");
  if (!app) {
    throw new Error("#app root not found");
  }
  var activeNav = "overview";
  var collapsed = false;
  var toastTimer;
  function mount() {
    app.innerHTML = renderApp(activeNav);
    app.classList.toggle("sidebar-collapsed", collapsed);
    bindEvents();
  }
  function bindEvents() {
    var _a, _b;
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        var _a2;
        activeNav = (_a2 = el.dataset.nav) != null ? _a2 : "overview";
        mount();
      });
    });
    (_a = document.getElementById("collapse-btn")) == null ? void 0 : _a.addEventListener("click", () => {
      collapsed = !collapsed;
      mount();
    });
    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = FILTERS.find((f) => f.id === btn.dataset.filter);
        if (!field) return;
        const idx = field.options.indexOf(field.value);
        field.value = field.options[(idx + 1) % field.options.length];
        const valueEl = btn.querySelector(".filter-value");
        if (valueEl) valueEl.textContent = field.value;
        toast(`\u5DF2\u5207\u6362\u300C${field.label}\u300D\u4E3A\uFF1A${field.value}`);
      });
    });
    const scanBtn = document.getElementById("btn-scan");
    scanBtn == null ? void 0 : scanBtn.addEventListener("click", () => {
      if (scanBtn.disabled) return;
      const originHtml = scanBtn.innerHTML;
      scanBtn.disabled = true;
      scanBtn.classList.add("scanning");
      scanBtn.innerHTML = '<span class="spinner"></span><span>\u626B\u63CF\u4E2D\u2026</span>';
      window.setTimeout(() => {
        scanBtn.disabled = false;
        scanBtn.classList.remove("scanning");
        scanBtn.innerHTML = originHtml;
        toast("\u626B\u63CF\u5B8C\u6210\uFF1A\u5DF2\u66F4\u65B0 5 \u4E2A\u56FD\u5BB6\u7684\u6700\u65B0\u673A\u4F1A\u6570\u636E");
      }, 1400);
    });
    const refreshBtn = document.getElementById("refresh-insight");
    refreshBtn == null ? void 0 : refreshBtn.addEventListener("click", () => {
      refreshBtn.classList.add("spin");
      window.setTimeout(() => {
        refreshBtn.classList.remove("spin");
        toast("AI \u6D1E\u5BDF\u5DF2\u57FA\u4E8E\u6700\u65B0\u6570\u636E\u91CD\u65B0\u751F\u6210");
      }, 800);
    });
    document.querySelectorAll("[data-chip]").forEach((chip) => {
      chip.addEventListener("click", () => {
        toast(`\u5DF2\u53D1\u8D77\u5206\u6790\uFF1A${chip.dataset.chip}`);
      });
    });
    (_b = document.getElementById("view-report")) == null ? void 0 : _b.addEventListener("click", () => {
      toast("\u6B63\u5728\u751F\u6210\u300A\u8D8A\u5357\u5E02\u573A\u673A\u4F1A\u62A5\u544A\u300B\u2026");
    });
  }
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove("show"), 2200);
  }
  mount();
})();
