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
      signals: [
        "2Q26 电商销售同比增长 14.6%",
        "约 3,100 万活跃忠诚客户",
        "1,255 台自助结账设备",
        "CencoDay 2026 披露区域商业决策引擎和客户数据平台"
      ],
      sources: [
        { title: "Cencosud 2025 Integrated Annual Report", url: "https://www.cencosud.com/cencosud/site/docs/20260410/20260410085306/integrated_report_cencosud_2025.pdf", level: "A" },
        { title: "Cencosud CencoDay 2026", url: "https://www.cencosud.com/cencosud/site/docs/20260114/20260114114256/1__ceo___cencoday_2026_1.pdf", level: "A" },
        { title: "Cencosud 2Q26 Earnings Release", url: "https://www.cencosud.com/cencosud/site/docs/20260610/20260610154219/press_release_cencosud_2q26__eng_.pdf", level: "A" }
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
      signals: [
        "2025 年 2 月 Sigma 与 Chemist Warehouse 完成合并",
        "FY2026 Chemist Warehouse 全球约 659 家门店",
        "Dynamics 365 Finance/SCM/Commerce/POS 已有官方案例",
        "全国温控设施、Schedule 8、XML 和 Integration Services 已确认"
      ],
      sources: [
        { title: "Sigma Healthcare FY26 Release", url: "https://investorcentre.sigmahealthcare.com.au/static-files/afe6b331-0ca1-44ae-97c9-d823cbd4b8dd", level: "A" },
        { title: "Microsoft: Chemist Warehouse cloud transformation", url: "https://news.microsoft.com/en-au/features/chemist-warehouse-prescribes-cloud-transformation-to-boost-customer-wellbeing/", level: "A" },
        { title: "Manhattan: Chemist Warehouse inventory success", url: "https://www.manh.com/en-sg/resources/press-releases/2018/10/25/manhattan-associates-delivers-prescription-chemist-warehouse", level: "A" },
        { title: "Sigma 3PL/4PL and Integration Services", url: "https://sigmahealthcare.com.au/logistics/", level: "A" }
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
      signals: [
        "FY2025 新开 77 家门店",
        "2026 年计划约 70 家新店和 191 家翻新",
        "与 Google 合作推进 AI Mode、Gemini 和 Vertex AI",
        "Caledon 自动化配送中心建设中"
      ],
      sources: [
        { title: "Loblaw 2025 Annual Report", url: "https://dis-prod.assetful.loblaw.ca/content/dam/loblaw-companies-limited/creative-assets/loblaw-ca/investor-relations-reports/annual/2025/LCL_2025%20Annual%20Report.pdf", level: "A" },
        { title: "Loblaw Google AI Commerce", url: "https://www.loblaw.ca/en/loblaw-accelerates-the-adoption-of-ai-driven-digital-commerce-in-canada-with-google-collaboration/", level: "A" },
        { title: "Oracle: Loblaw SAP systems on OCI", url: "https://www.prnewswire.com/news-releases/loblaw-rings-up-oracle-cloud-infrastructure-to-modernize-its-it-infrastructure-301929743.html", level: "A" },
        { title: "Groceryshop 2026 speaker list", url: "https://groceryshop.com/speaker-list", level: "A" }
      ],
      recommendations: [
        "确认 AI Mode/UCP、PC Express OMS 和自动化 DC 系统边界",
        "以 Open Platform、履约编排或库存服务的单点能力切入",
        "不得宣称替换 SAP、OCI、Google 或 Loblaw 内部数字团队"
      ]
    }
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
      entry: "待 Agent 分析",
      segments: company.formats,
      tagline: `${company.name} · ${stores}`,
      marketBrief: note,
      opportunities: company.signals,
      recommendations: company.recommendations,
      pilot: "由 Agent 基于证据生成",
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
        risk: company.risk
      }]
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
    uae: makeCountry({ id: "uae", iso: "784", name: "阿联酋", en: "United Arab Emirates", region: "asia", coord: [54.4, 24.3], stores: "与中国合计 5 家", companyKey: "sigma", note: "Sigma FY2026 公告仅披露阿联酋与中国合计 5 家，未拆分国家数量。" }),
    china: makeCountry({ id: "china", iso: "156", name: "中国", en: "China", region: "asia", coord: [104.2, 35.8], stores: "与阿联酋合计 5 家", companyKey: "sigma", note: "Sigma FY2026 公告仅披露中国与阿联酋合计 5 家；中国实体店逐步关闭，未来侧重线上业务。" })
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
      id: "asia", name: "亚洲 / 中东", en: "Asia & Middle East", center: [78, 28], score: null, badge: "2 国",
      color: "#F47C61", countryIds: ["china", "uae"],
      customerNames: ["Sigma / Chemist Warehouse"], evidenceCount: 1, lastUpdated: "2026-08-27",
      headline: "Chemist Warehouse 小规模国际网络",
      summary: "Sigma FY2026 仅披露阿联酋与中国合计 5 家门店，未拆分国家数量；中国实体店未来侧重线上业务。",
      opportunities: ["线上业务转型", "多国家 D365 与库存边界", "药房合规和本地化"]
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

  const agentSteps = ["市场雷达", "客户池", "客户画像", "商机信号", "准入评估", "证据链", "能力匹配", "风险评估", "研究 Brief"];

  Object.assign(window, {
    OPPORTUNITY_DATA: { regions, countries, companyProfiles, continentFeatures, liveSignals, agentSteps }
  });
})();
