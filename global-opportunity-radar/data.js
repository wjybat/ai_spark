(function () {
  const companyProfiles = {
    cencosud: {
      id: "cencosud",
      name: "Cencosud",
      type: "多国家、多业态零售集团",
      groupStores: "1,398 家零售门店/地点（FY2025）",
      revenue: "约 182.08 亿美元（FY2025）",
      formats: ["超市", "百货", "家居改善", "购物中心", "金融服务"],
      modules: ["Open Platform", "OMS / 全渠道履约", "WMS / 智能补货", "区域商品与库存服务"],
      risk: "已有 SAP、区域平台和本地系统；POS/OMS/WMS/CDP 版本及供应商待确认",
      headquarters: "智利圣地亚哥",
      countries: ["智利", "阿根廷", "巴西", "秘鲁", "哥伦比亚", "美国"],
      businessAreas: ["多国家零售生态", "区域电商", "Prime 订阅", "Cenco Media", "暗店履约", "自助结账"],
      digitalFoundation: ["区域客户与数据平台战略", "LTM 电商 16.81 亿美元", "3,100 万活跃忠诚客户", "1,255 台自助结账设备"],
      knownSystems: ["SAP ERP/FICO", "SAP HANA", "SAP Ariba", "Fiori", "区域平台与本地系统"],
      organization: "CencoDay 2026 公布区域技术平台、数据治理、安全与跨职能平台化组织。",
      recentDynamics: ["Costanera 暗店月订单超过 15 万", "Easy 新配送中心", "St. Marche 并购整合潜在线索", "Regional Commercial Decision Engine", "Customer & Data Platform", "Regional Security and Resilience"],
      decisionRoles: ["CIO", "COO", "Regional Technology Lead", "E-commerce & Fulfilment Lead"],
      unknowns: ["当前 POS/OMS/WMS/CDP 供应商与版本", "区域平台的上线国家和系统边界", "并购整合项目预算与时间表", "采购与决策链"],
      strategicSummary: "区域平台化与多国家复制是主线，适合从 OMS/WMS、库存服务和 Open Platform 外围集成切入。",
      signals: [
        "2Q26 电商销售同比增长 14.6%",
        "约 3,100 万活跃忠诚客户",
        "1,255 台自助结账设备",
        "CencoDay 2026 披露区域商业决策引擎和客户数据平台"
      ],
      sources: [
        { title: "Cencosud 2025 Integrated Annual Report", url: "https://www.cencosud.com/cencosud/site/docs/20260410/20260410085306/integrated_report_cencosud_2025.pdf", level: "A", excerpt: "披露 FY2025 收入及年末 1,398 家零售门店/地点。" },
        { title: "Cencosud CencoDay 2026", url: "https://www.cencosud.com/cencosud/site/docs/20260114/20260114114256/1__ceo___cencoday_2026_1.pdf", level: "A", excerpt: "披露区域商业决策引擎、客户与数据平台及区域安全韧性方向。" },
        { title: "Cencosud 2Q26 Earnings Release", url: "https://www.cencosud.com/cencosud/site/docs/20260610/20260610154219/press_release_cencosud_2q26__eng_.pdf", level: "A", excerpt: "披露电商增长、活跃忠诚客户和自助结账设备等经营数据。" }
      ],
      recommendations: [
        "确认区域商业决策引擎、暗店、新配送中心和现有系统边界",
        "以单一国家、单一履约场景验证 Open Platform + OMS/WMS 外围集成",
        "不得宣称替换 SAP 或已进入采购流程"
      ]
    },
    sigma: {
      id: "sigma-chemist",
      name: "Sigma Healthcare / Chemist Warehouse",
      type: "药房零售、批发、加盟和物流集团",
      groupStores: "约 659 家 Chemist Warehouse 全球门店（FY2026）",
      revenue: "约 43.09 亿美元法定合并收入",
      formats: ["零售药房", "药品批发", "加盟零售", "3PL/4PL", "健康服务"],
      modules: ["药房履约", "WMS / 智能补货", "订单与库存协同", "EDI / Open Platform"],
      risk: "D365、Manhattan 和自有 Integration Services 的生产边界待确认；药品、冷链和健康数据合规门槛高",
      headquarters: "澳大利亚墨尔本",
      countries: ["澳大利亚", "新西兰", "爱尔兰", "阿联酋"],
      businessAreas: ["药品批发与全国配送", "加盟药房", "线上商城", "Click & Collect", "国际扩张", "温控物流"],
      digitalFoundation: ["Dynamics 365 Finance/SCM/Commerce/POS", "XML/EDI 集成", "全国温控设施", "超过 5.32 亿件年度配送处理量"],
      knownSystems: ["Dynamics 365", "历史 Manhattan SCALE", "Manhattan Active Inventory", "Sigma Integration Services", "Pharmx/SPS Commerce"],
      organization: "Microsoft 案例和 Sigma 官方物流资料确认其具备核心系统、集成服务与技术团队。",
      recentDynamics: ["2025 年 2 月合并完成", "澳新及国际扩张", "新西兰和爱尔兰扩张", "英国合资进入计划", "药房、批发、物流和健康服务整合"],
      decisionRoles: ["Group CIO", "COO", "Head of Supply Chain", "Head of Digital Commerce", "Pharmacy Operations Lead"],
      unknowns: ["D365 当前版本、实例与法人映射", "Manhattan 当前生产状态", "药房系统与 WMS 的责任边界", "受控药品和冷链能力适配差距", "预算和采购周期"],
      strategicSummary: "药房合规履约、仓店协同和 EDI 共存是现实切口，D365 与既有 WMS 应作为集成边界。",
      signals: [
        "2025 年 2 月 Sigma 与 Chemist Warehouse 完成合并",
        "FY2026 Chemist Warehouse 全球约 659 家门店",
        "Dynamics 365 Finance/SCM/Commerce/POS 已有官方案例",
        "全国温控设施、Schedule 8、XML 和 Integration Services 已确认"
      ],
      sources: [
        { title: "Sigma Healthcare FY26 Release", url: "https://investorcentre.sigmahealthcare.com.au/static-files/afe6b331-0ca1-44ae-97c9-d823cbd4b8dd", level: "A", excerpt: "披露合并后的集团收入、全球门店规模及国际业务布局。" },
        { title: "Microsoft: Chemist Warehouse cloud transformation", url: "https://news.microsoft.com/en-au/features/chemist-warehouse-prescribes-cloud-transformation-to-boost-customer-wellbeing/", level: "A", excerpt: "确认 Dynamics 365 Finance、SCM、Commerce 与 POS 转型基础。" },
        { title: "Manhattan: Chemist Warehouse inventory success", url: "https://www.manh.com/en-sg/resources/press-releases/2018/10/25/manhattan-associates-delivers-prescription-chemist-warehouse", level: "A", excerpt: "确认 Manhattan SCALE 与 Active Inventory 的库存和补货实践。" },
        { title: "Sigma 3PL/4PL and Integration Services", url: "https://sigmahealthcare.com.au/logistics/", level: "A", excerpt: "确认温控、药品合规、XML/EDI 与自有集成服务能力。" }
      ],
      recommendations: [
        "确认 D365 实例、Manhattan 当前状态和各集成系统责任边界",
        "以药房履约、批次效期、冷链或仓店协同中的单一场景试点",
        "不得宣称替换 D365 或未经验证具备处方药合规能力"
      ]
    },
    loblaw: {
      id: "loblaw",
      name: "Loblaw Companies Limited",
      type: "加拿大食品、药房、健康与数字零售集团",
      groupStores: "2,504 家门店（FY2025）",
      revenue: "约 461.76 亿美元零售收入（FY2025）",
      formats: ["食品零售", "药房", "健康服务", "折扣零售", "电商", "零售媒体"],
      modules: ["Open Platform", "OMS / 全渠道履约", "库存服务", "自动化 DC 上层编排"],
      risk: "SAP/OCI、Google/Vertex AI、Shakudo 与内部数字团队并行；各省隐私和健康数据边界待确认",
      headquarters: "加拿大安大略省布兰普顿",
      countries: ["加拿大"],
      businessAreas: ["食品与药房双网络", "PC Express", "PC Optimum", "Loblaw Advance", "AI Commerce", "自动化配送中心"],
      digitalFoundation: ["SAP/OCI", "Google Vertex AI", "内部 Loblaw Digital", "PC Optimum 1,800 万+活跃会员", "PC Express"],
      knownSystems: ["SAP ERP/SAP for Retail", "Oracle Exadata on OCI", "Google Vertex AI", "Shakudo", "自动化 DC 系统（供应商待确认）"],
      organization: "Loblaw Digital、PC Express、PC Optimum、Loblaw Advance 与 Connected Healthcare 构成明确数字能力体系。",
      recentDynamics: ["2025 年新开 77 家", "2026 年计划 70 家新店和 191 家翻新", "Caledon 自动化 DC 建设", "Google AI Mode/Gemini 商业合作", "扩大 Vertex AI 覆盖商品、供应链和门店"],
      decisionRoles: ["CIO", "COO", "Stores & Merchandising Solutions VP", "Supply Chain Technology Lead", "Loblaw Digital Lead"],
      unknowns: ["AI Mode/UCP 实际上线范围", "PC Express 是否有统一 OMS/DOM", "自动化 DC 的 WMS/WCS/ASRS 与集成商", "各省隐私和健康数据边界", "预算、RFP 与采购周期"],
      strategicSummary: "Open Platform、OMS/履约、库存服务和自动化 DC 上层编排匹配度高，但必须与现有平台和内部数字团队共存。",
      signals: [
        "FY2025 新开 77 家门店",
        "2026 年计划约 70 家新店和 191 家翻新",
        "与 Google 合作推进 AI Mode、Gemini 和 Vertex AI",
        "Caledon 自动化配送中心建设中"
      ],
      sources: [
        { title: "Loblaw 2025 Annual Report", url: "https://dis-prod.assetful.loblaw.ca/content/dam/loblaw-companies-limited/creative-assets/loblaw-ca/investor-relations-reports/annual/2025/LCL_2025%20Annual%20Report.pdf", level: "A", excerpt: "披露 FY2025 零售收入、2,504 家门店、会员规模及扩店计划。" },
        { title: "Loblaw Google AI Commerce", url: "https://www.loblaw.ca/en/loblaw-accelerates-the-adoption-of-ai-driven-digital-commerce-in-canada-with-google-collaboration/", level: "A", excerpt: "确认 Google AI Mode、Gemini 和 Vertex AI 的商业合作与应用方向。" },
        { title: "Oracle: Loblaw SAP systems on OCI", url: "https://www.prnewswire.com/news-releases/loblaw-rings-up-oracle-cloud-infrastructure-to-modernize-its-it-infrastructure-301929743.html", level: "A", excerpt: "确认 SAP 数据库迁移至 Oracle Exadata Database Service on OCI。" },
        { title: "Groceryshop 2026 speaker list", url: "https://groceryshop.com/speaker-list", level: "A", excerpt: "提供零售媒体业务相关管理角色的公开活动触达线索。" }
      ],
      recommendations: [
        "确认 AI Mode/UCP、PC Express OMS 和自动化 DC 系统边界",
        "以 Open Platform、履约编排或库存服务的单点能力切入",
        "不得宣称替换 SAP、OCI、Google 或 Loblaw 内部数字团队"
      ]
    }
  };

  const candidateSources = {
    "SMU / Unimarc": ["SMU 官方门店公告", "https://assets.ctfassets.net/63tonbtz0lhl/4DpvyJHwWKhedDXS3SpzE5/0ee85c29ff19cf5709231b6f5ed00988/SMU_Opening_Unimarc_Concon_2025-08-29_eng.pdf"],
    "Falabella Retail": ["Falabella Retail 官方门店页", "https://falabellaretail.falabella.com/tiendas/"],
    "Carrefour Argentina": ["Carrefour Argentina 官方门店页", "https://www.carrefour.com.ar/stores"],
    "Coto": ["Coto 官方门店页", "https://www.coto.com.ar/sucursales/"],
    "Grupo Mateus": ["Grupo Mateus 官网", "https://grupomateus.com.br/"],
    "Assaí Atacadista": ["Assaí 官网", "https://www.assai.com.br/"],
    "InRetail Food Retail": ["InRetail 官方业务页", "https://www.inretail.pe/Unidades%20de%20Negocio/90/"],
    "Tottus Perú": ["Tottus Perú 官方门店页", "https://www.tottus.com.pe/tottus-pe/content/horario-tiendas"],
    "Grupo Éxito": ["Grupo Éxito 官方门店页", "https://www.grupoexito.com.co/en/customers/find-us"],
    "Olímpica": ["Olímpica 官方门店页", "https://www.olimpica.com/nuestras-tiendas/"],
    "H-E-B": ["H-E-B 官网", "https://www.heb.com/"],
    "Giant Eagle": ["Giant Eagle 官网", "https://www.gianteagle.com/"],
    "Empire Company": ["Empire Company 官网", "https://www.empireco.ca/"],
    "Giant Tiger": ["Giant Tiger 官方资料", "https://press.gianttiger.com/overview"],
    "Metcash": ["Metcash 官网", "https://www.metcash.com/"],
    "Harris Farm Markets": ["Harris Farm 官方门店页", "https://www.harrisfarm.com.au/pages/our-stores"],
    "Foodstuffs": ["Foodstuffs 官网", "https://www.foodstuffs.co.nz/"],
    "Woolworths New Zealand": ["Woolworths NZ 公司页", "https://www.woolworths.co.nz/info/about/woolworths-nz"],
    "Musgrave / SuperValu": ["Musgrave 官网", "https://musgravegroup.com/"],
    "Dunnes Stores": ["Dunnes Stores 官网", "https://www.dunnesstores.com/"],
    "LuLu Retail": ["LuLu Retail 年报", "https://www.luluretail.com/investors/results-reports/integrated-annual-report/"],
    "Union Coop": ["Union Coop 官网", "https://corporate.unioncoop.ae/"],
  };

  const makeCandidate = (name, type, stores, signal, modules) => ({
    name, type, stores, signal, modules,
    sourceLevel: "A级",
    sourceTitle: candidateSources[name][0],
    sourceUrl: candidateSources[name][1],
    selectable: false,
    risk: "现有系统、项目边界与采购节奏需要在客户沟通中进一步确认"
  });

  // Candidates stay read-only at customer level; all three dossiers enter country-brief synthesis.
  const candidateProfiles = {
    chile: [
      makeCandidate("SMU / Unimarc", "食品零售集团", "298 家 Unimarc", "门店扩张与全渠道运营", ["门店运营", "库存协同"]),
      makeCandidate("Falabella Retail", "百货与全渠道零售", "102 家（智利/秘鲁/哥伦比亚合计）", "区域全渠道与数据协同", ["全渠道", "经营分析"])
    ],
    argentina: [
      makeCandidate("Carrefour Argentina", "大型商超 / 便利业态", "全国门店网络", "多业态门店与履约协同", ["门店运营", "全渠道"]),
      makeCandidate("Coto", "商超 / 零售服务", "全国门店网络", "库存与门店效率", ["智能补货", "门店运营"])
    ],
    brazil: [
      makeCandidate("Grupo Mateus", "商超 / 现金批发", "全国门店网络", "扩店 + 供应链建设", ["供应链管理", "智能补货"]),
      makeCandidate("Assaí Atacadista", "现金批发", "全国门店网络", "高速扩张 + 利润优化", ["POS / 智能收银", "经营分析"])
    ],
    peru: [
      makeCandidate("InRetail Food Retail", "多品牌食品零售", "1,604 家（集团口径）", "多品牌门店与库存协同", ["库存协同", "经营分析"]),
      makeCandidate("Tottus Perú", "大型商超 / 全渠道", "全国门店网络", "全渠道与会员运营", ["全渠道", "会员运营"])
    ],
    colombia: [
      makeCandidate("Grupo Éxito", "多品牌食品零售", "全国门店网络", "多业态门店与数据协同", ["门店运营", "经营分析"]),
      makeCandidate("Olímpica", "商超 / 药房零售", "400+", "区域门店网络与供应链", ["供应链管理", "智能补货"])
    ],
    usa: [
      makeCandidate("H-E-B", "区域商超", "区域门店网络", "门店创新 + 数字化体验", ["门店管理", "会员运营"]),
      makeCandidate("Giant Eagle", "区域商超", "区域门店网络", "系统现代化 + 履约", ["全渠道", "供应链管理"])
    ],
    canada: [
      makeCandidate("Empire Company", "综合零售集团", "多品牌门店网络", "全渠道 + 门店现代化", ["全渠道", "门店运营"]),
      makeCandidate("Giant Tiger", "折扣零售", "260+", "加盟协同 + 库存", ["智能补货", "经营分析"])
    ],
    australia: [
      makeCandidate("Metcash", "批零集团", "独立零售网络", "加盟协同 + 供应链", ["供应链管理", "门店运营"]),
      makeCandidate("Harris Farm Markets", "生鲜超市", "33 家门店", "生鲜损耗 + 会员", ["动态定价", "会员运营"])
    ],
    new_zealand: [
      makeCandidate("Foodstuffs", "食品零售合作社", "300+ 北岛门店", "合作社门店与供应链协同", ["门店运营", "供应链管理"]),
      makeCandidate("Woolworths New Zealand", "大型商超 / 加盟网络", "191 家核心门店", "全渠道与门店现代化", ["全渠道", "经营分析"])
    ],
    ireland: [
      makeCandidate("Musgrave / SuperValu", "加盟食品零售", "222 家 SuperValu", "加盟门店与供应链协同", ["门店运营", "供应链管理"]),
      makeCandidate("Dunnes Stores", "食品 / 百货零售", "全国门店网络", "会员与全渠道运营", ["会员运营", "全渠道"])
    ],
    uae: [
      makeCandidate("LuLu Retail", "大型商超", "277 家泛海湾门店（2026-03）", "跨国扩张 + 供应链协同", ["供应链管理", "智能补货"]),
      makeCandidate("Union Coop", "合作社商超", "区域门店网络", "全渠道 + 会员升级", ["全渠道", "会员运营"])
    ]
  };

  const makeCountry = ({ id, iso, name, en, region, coord, stores, companyKey, note }) => {
    const company = companyProfiles[companyKey];
    return {
      id, iso, name, en, region, coord,
      score: null,
      priority: "已核验",
      pipeline: company.revenue,
      storeCount: stores,
      signalCount: company.signals.length,
      sourceCount: company.sources.length,
      demand: "真实资料",
      entry: "待智能体分析",
      segments: company.formats,
      tagline: `${company.name} · ${stores}`,
      marketBrief: note,
      opportunities: company.signals,
      recommendations: company.recommendations,
      pilot: "由智能体基于证据生成",
      sources: company.sources,
      companyId: company.id,
      customers: [{
        name: company.name,
        type: company.type,
        stores: company.groupStores,
        score: null,
        sourceLevel: "A级",
        signal: company.signals[0],
        modules: company.modules,
        risk: company.risk,
        selectable: true
      }, ...(candidateProfiles[id] || []).slice(0, 2)]
    };
  };

  const countries = {
    chile: makeCountry({ id: "chile", iso: "152", name: "智利", en: "Chile", region: "south_america", coord: [-71.5, -33.5], stores: "379 家", companyKey: "cencosud", note: "Cencosud 总部市场；官方业务单元网页截至 2026-06-30 披露 379 家门店。" }),
    argentina: makeCountry({ id: "argentina", iso: "032", name: "阿根廷", en: "Argentina", region: "south_america", coord: [-64.2, -34.6], stores: "349 家", companyKey: "cencosud", note: "Cencosud 官方业务单元网页截至 2026-06-30 披露 349 家门店。" }),
    brazil: makeCountry({ id: "brazil", iso: "076", name: "巴西", en: "Brazil", region: "south_america", coord: [-52.5, -10.7], stores: "272 家", companyKey: "cencosud", note: "Cencosud 官方业务单元网页截至 2026-06-30 披露 272 家门店，覆盖 Prezunic、Bretas、GBarbosa 等品牌。" }),
    peru: makeCountry({ id: "peru", iso: "604", name: "秘鲁", en: "Peru", region: "south_america", coord: [-75.0, -9.2], stores: "88 家", companyKey: "cencosud", note: "Cencosud 官方业务单元网页披露 Wong 20 家、Metro 68 家，合计 88 家。" }),
    colombia: makeCountry({ id: "colombia", iso: "170", name: "哥伦比亚", en: "Colombia", region: "south_america", coord: [-74.2, 4.5], stores: "134 家", companyKey: "cencosud", note: "Cencosud 官方业务单元网页截至 2026-06-30 披露 134 家门店。" }),
    usa: makeCountry({ id: "usa", iso: "840", name: "美国", en: "United States", region: "north_america", coord: [-99.5, 38.5], stores: "174 家", companyKey: "cencosud", note: "Cencosud 官方网页披露美国 174 家门店，其中 The Fresh Market 173 家。" }),
    canada: makeCountry({ id: "canada", iso: "124", name: "加拿大", en: "Canada", region: "north_america", coord: [-106, 56], stores: "2,504 家", companyKey: "loblaw", note: "Loblaw FY2025 年报披露 2,504 家门店，包括直营、加盟和 Associate-owned 药房。" }),
    australia: makeCountry({ id: "australia", iso: "036", name: "澳大利亚", en: "Australia", region: "oceania", coord: [134.5, -25.5], stores: "561 家 CW 门店", companyKey: "sigma", note: "Sigma FY2026 公告披露澳大利亚 561 家 Chemist Warehouse 门店；另有 Amcal 和 Discount Drug Stores 加盟网络。" }),
    new_zealand: makeCountry({ id: "new_zealand", iso: "554", name: "新西兰", en: "New Zealand", region: "oceania", coord: [172.5, -41.2], stores: "75 家 CW 门店", companyKey: "sigma", note: "Sigma FY2026 公告披露新西兰 75 家 Chemist Warehouse 门店。" }),
    ireland: makeCountry({ id: "ireland", iso: "372", name: "爱尔兰", en: "Ireland", region: "europe", coord: [-8.0, 53.2], stores: "18 家 CW 门店", companyKey: "sigma", note: "Sigma FY2026 公告披露爱尔兰 18 家 Chemist Warehouse 门店。" }),
    uae: makeCountry({ id: "uae", iso: "784", name: "阿联酋", en: "United Arab Emirates", region: "asia", coord: [54.4, 24.3], stores: "5 家以内（官方合并口径）", companyKey: "sigma", note: "Sigma FY2026 公告披露阿联酋药房零售样例；原始资料未单列该国门店数量。" })
  };

  const regions = {
    south_america: {
      id: "south_america", name: "南美洲", en: "South America", center: [-64, -18], score: null, badge: "5 国",
      color: "#78A96D", countryIds: ["chile", "argentina", "brazil", "peru", "colombia"],
      customerNames: ["Cencosud"], evidenceCount: 3, lastUpdated: "2026-08-27",
      headline: "Cencosud 多国家真实经营网络",
      summary: "调研资料确认 Cencosud 在智利、阿根廷、巴西、秘鲁和哥伦比亚运营，FY2025 年末集团共 1,398 家零售门店/地点。",
      opportunities: ["区域商业决策引擎与客户数据平台", "暗店、电商和区域履约", "新配送中心与跨国家复制"]
    },
    north_america: {
      id: "north_america", name: "北美洲", en: "North America", center: [-100, 45], score: null, badge: "2 国",
      color: "#E6B655", countryIds: ["canada", "usa"],
      customerNames: ["Loblaw", "Cencosud / The Fresh Market"], evidenceCount: 7, lastUpdated: "2026-08-27",
      headline: "Loblaw 全国网络与 Cencosud 美国业务",
      summary: "加拿大样例为 Loblaw 2,504 家门店网络；美国样例来自 Cencosud 旗下 The Fresh Market 业务。",
      opportunities: ["AI Commerce 与 PC Express 履约", "自动化配送中心", "食品、药房与会员数据协同"]
    },
    oceania: {
      id: "oceania", name: "大洋洲", en: "Oceania", center: [150, -28], score: null, badge: "2 国",
      color: "#6CA7BD", countryIds: ["australia", "new_zealand"],
      customerNames: ["Sigma / Chemist Warehouse"], evidenceCount: 4, lastUpdated: "2026-08-27",
      headline: "药房、批发、加盟和物流真实网络",
      summary: "Sigma FY2026 资料确认澳大利亚 561 家、新西兰 75 家 Chemist Warehouse 门店。",
      opportunities: ["药房履约与仓店协同", "批次效期、冷链和受控药品", "D365、Manhattan 与 EDI 共存"]
    },
    europe: {
      id: "europe", name: "欧洲", en: "Europe", center: [-8, 53], score: null, badge: "1 国",
      color: "#7BA7A2", countryIds: ["ireland"],
      customerNames: ["Sigma / Chemist Warehouse"], evidenceCount: 1, lastUpdated: "2026-08-27",
      headline: "Chemist Warehouse 爱尔兰扩张样例",
      summary: "Sigma FY2026 公告确认爱尔兰 18 家 Chemist Warehouse 门店；英国仍处进入计划阶段，不作为现有门店展示。",
      opportunities: ["国际门店复制", "D365 多国家实例边界", "药房本地法规与履约"]
    },
    asia: {
      id: "asia", name: "亚洲 / 中东", en: "Asia & Middle East", center: [54.4, 24.3], score: null, badge: "1 国",
      color: "#F47C61", countryIds: ["uae"],
      customerNames: ["Sigma / Chemist Warehouse"], evidenceCount: 1, lastUpdated: "2026-08-27",
      headline: "Chemist Warehouse 小规模国际网络",
      summary: "Sigma / Chemist Warehouse 在阿联酋的药房零售扩张样例；原始资料未单列当地门店数量。",
      opportunities: ["国际门店复制", "D365 与库存边界", "药房合规和本地化"]
    }
  };

  const continentFeatures = [
    { type: "Feature", properties: { id: "north_america" }, geometry: { type: "Polygon", coordinates: [[[-168,72],[-145,70],[-125,54],[-110,49],[-96,50],[-82,45],[-62,48],[-54,60],[-74,75],[-105,82],[-145,78],[-168,72],[-166,58],[-140,54],[-130,42],[-118,32],[-106,23],[-97,16],[-86,18],[-82,26],[-74,37],[-63,46],[-82,45],[-96,50],[-110,49],[-125,54],[-145,70],[-168,72]]] } },
    { type: "Feature", properties: { id: "south_america" }, geometry: { type: "Polygon", coordinates: [[[-81,12],[-70,10],[-58,7],[-48,1],[-38,-10],[-42,-24],[-52,-35],[-64,-55],[-73,-50],[-75,-35],[-70,-20],[-80,-5],[-81,12]]] } },
    { type: "Feature", properties: { id: "europe" }, geometry: { type: "Polygon", coordinates: [[[-11,36],[2,35],[14,39],[27,41],[40,48],[35,60],[25,70],[5,71],[-10,58],[-11,36]]] } },
    { type: "Feature", properties: { id: "asia" }, geometry: { type: "Polygon", coordinates: [[[28,40],[42,55],[65,72],[100,77],[140,68],[179,58],[170,42],[145,33],[125,20],[112,2],[98,7],[82,22],[69,25],[53,16],[42,28],[28,40]]] } },
    { type: "Feature", properties: { id: "oceania" }, geometry: { type: "MultiPolygon", coordinates: [[[[111,-10],[130,-8],[154,-20],[151,-39],[135,-44],[116,-34],[111,-10]]],[[[165,-34],[179,-36],[178,-48],[166,-47],[165,-34]]]] } }
  ];

  const liveSignals = [
    { countryId: "brazil", country: "南美洲", customer: "Cencosud", signal: "2Q26 电商同比 +14.6%" },
    { countryId: "chile", country: "智利", customer: "Cencosud", signal: "区域商业决策引擎与客户数据平台" },
    { countryId: "australia", country: "澳大利亚", customer: "Sigma / CW", signal: "FY2026 全球约 659 家 CW 门店" },
    { countryId: "new_zealand", country: "新西兰", customer: "Chemist Warehouse", signal: "已确认 75 家门店" },
    { countryId: "canada", country: "加拿大", customer: "Loblaw", signal: "2026 计划 70 家新店、191 家翻新" },
    { countryId: "canada", country: "加拿大", customer: "Loblaw", signal: "Google AI Commerce 与自动化 DC" }
  ];

  const agentSteps = ["市场雷达", "客户池", "客户画像", "商机信号", "准入评估", "证据链", "能力匹配", "风险评估", "客户简报"];

  Object.assign(window, {
    OPPORTUNITY_DATA: { regions, countries, companyProfiles, continentFeatures, liveSignals, agentSteps }
  });
})();
