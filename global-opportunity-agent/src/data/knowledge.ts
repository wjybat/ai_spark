import type { CustomerRecord, EvidenceRecord, ProductCapability, RegionRecord } from "../types/domain.js";

const retrievedAt = "2026-08-27";

export const customers: CustomerRecord[] = [
  {
    id: "cencosud",
    name: "Cencosud",
    aliases: ["Jumbo", "Santa Isabel", "SPID", "Paris", "Easy", "Wong", "Metro"],
    headquarters: "智利圣地亚哥",
    countries: ["智利", "阿根廷", "巴西", "秘鲁", "哥伦比亚", "美国"],
    regionId: "south-america",
    formats: ["超市", "百货", "家居改善", "购物中心", "金融服务"],
    storeCount: 1398,
    storeCountLabel: "1,398 家零售门店/地点（FY2025 年末）",
    revenueUsd: 18_207_651_712,
    revenueLabel: "约 182.08 亿美元",
    revenuePeriod: "FY2025",
    businessAreas: ["多国家零售生态", "区域电商", "Prime 订阅", "Cenco Media", "暗店履约", "自助结账"],
    digitalFoundation: ["区域客户与数据平台战略", "LTM 电商 16.81 亿美元", "3,100 万活跃忠诚客户", "1,255 台自助结账设备"],
    knownSystems: ["SAP ERP/FICO", "SAP HANA", "SAP Ariba", "Fiori", "区域平台与本地系统"],
    itTeamEvidence: "CencoDay 2026 公布区域技术平台、数据治理、安全与跨职能平台化组织。",
    managementSignals: ["Regional Commercial Decision Engine", "Customer & Data Platform", "Regional Security and Resilience"],
    expansionSignals: ["Costanera 暗店月订单超过 15 万", "Easy 新配送中心", "St. Marche 并购整合潜在线索"],
    knownDecisionRoles: ["CIO", "COO", "Regional Technology Lead", "E-commerce & Fulfilment Lead"],
    currentUnknowns: ["当前 POS/OMS/WMS/CDP 供应商与版本", "区域平台的上线国家和系统边界", "并购整合项目预算与时间表", "采购与决策链"],
    strategicSummary: "区域平台化与多国家复制是主线，Dmall 应以 OMS/WMS、库存服务和 Open Platform 外围集成切入，而非宣称替换 SAP。"
  },
  {
    id: "sigma-chemist",
    name: "Sigma Healthcare / Chemist Warehouse",
    aliases: ["Sigma", "Chemist Warehouse", "CWG", "Amcal", "Discount Drug Stores"],
    headquarters: "澳大利亚墨尔本",
    countries: ["澳大利亚", "新西兰", "爱尔兰", "阿联酋", "中国"],
    regionId: "oceania",
    formats: ["零售药房", "药品批发", "加盟零售", "3PL/4PL", "健康服务"],
    storeCount: 659,
    storeCountLabel: "约 659 家 Chemist Warehouse 全球门店（FY2026）",
    revenueUsd: 4_309_200_000,
    revenueLabel: "约 43.09 亿美元法定合并收入",
    revenuePeriod: "FY2025 合并口径",
    businessAreas: ["药品批发与全国配送", "加盟药房", "线上商城", "Click & Collect", "国际扩张", "温控物流"],
    digitalFoundation: ["Dynamics 365 Finance/SCM/Commerce/POS", "XML/EDI 集成", "全国温控设施", "超过 5.32 亿件年度配送处理量"],
    knownSystems: ["Dynamics 365", "历史 Manhattan SCALE", "Manhattan Active Inventory", "Sigma Integration Services", "Pharmx/SPS Commerce"],
    itTeamEvidence: "Microsoft 案例和 Sigma 官方物流资料确认其具备核心系统、集成服务与技术团队。",
    managementSignals: ["2025 年 2 月合并完成", "澳新及国际扩张", "药房、批发、物流和健康服务整合"],
    expansionSignals: ["新西兰和爱尔兰扩张", "英国合资进入计划", "加盟与批发网络整合"],
    knownDecisionRoles: ["Group CIO", "COO", "Head of Supply Chain", "Head of Digital Commerce", "Pharmacy Operations Lead"],
    currentUnknowns: ["D365 当前版本、实例与法人映射", "Manhattan 当前生产状态", "药房系统与 WMS 的责任边界", "受控药品和冷链能力适配差距", "预算和采购周期"],
    strategicSummary: "药房合规履约、仓店协同和 EDI 共存是最现实切口；D365 与既有 WMS 应作为集成边界而非替换目标。"
  },
  {
    id: "loblaw",
    name: "Loblaw Companies Limited",
    aliases: ["Loblaw", "PC Express", "PC Optimum", "No Frills", "Maxi", "Shoppers Drug Mart"],
    headquarters: "加拿大安大略省布兰普顿",
    countries: ["加拿大"],
    regionId: "canada",
    formats: ["食品零售", "药房", "健康服务", "折扣零售", "零售媒体", "电商"],
    storeCount: 2504,
    storeCountLabel: "2,504 家门店（FY2025 年末）",
    revenueUsd: 46_176_307_800,
    revenueLabel: "约 461.76 亿美元零售收入",
    revenuePeriod: "FY2025（53 周）",
    businessAreas: ["食品与药房双网络", "PC Express", "PC Optimum", "Loblaw Advance", "AI Commerce", "自动化配送中心"],
    digitalFoundation: ["SAP/OCI", "Google Vertex AI", "内部 Loblaw Digital", "PC Optimum 1,800 万+活跃会员", "PC Express"],
    knownSystems: ["SAP ERP/SAP for Retail", "Oracle Exadata on OCI", "Google Vertex AI", "Shakudo", "自动化 DC 系统（供应商待确认）"],
    itTeamEvidence: "Loblaw Digital、PC Express、PC Optimum、Loblaw Advance 与 Connected Healthcare 构成明确数字能力体系。",
    managementSignals: ["Google AI Mode/Gemini 商业合作", "扩大 Vertex AI 覆盖商品、供应链和门店", "2026 年约 17.34 亿美元投资计划"],
    expansionSignals: ["2025 年新开 77 家", "2026 年计划 70 家新店和 191 家翻新", "Caledon 自动化 DC 建设"],
    knownDecisionRoles: ["CIO", "COO", "Stores & Merchandising Solutions VP", "Supply Chain Technology Lead", "Loblaw Digital Lead"],
    currentUnknowns: ["AI Mode/UCP 实际上线范围", "PC Express 是否有统一 OMS/DOM", "自动化 DC 的 WMS/WCS/ASRS 与集成商", "各省隐私和健康数据边界", "预算、RFP 与采购周期"],
    strategicSummary: "Open Platform、OMS/履约、库存服务和自动化 DC 上层编排匹配度高，但必须与 SAP/OCI/Google 和内部数字团队共存。"
  }
];

export const regions: RegionRecord[] = [
  {
    id: "global",
    name: "全球重点真实样例",
    countries: ["加拿大", "美国", "澳大利亚", "新西兰", "爱尔兰", "阿联酋", "智利", "巴西", "秘鲁", "阿根廷", "哥伦比亚"],
    customerIds: ["loblaw", "sigma-chemist", "cencosud"],
    marketSummary: "首批真实样例覆盖北美、大洋洲、欧洲、中东和南美，分别代表全国性食品药房网络、药房批发加盟生态和多国家多业态零售集团。",
    digitalDemand: 88,
    marketAttractiveness: 90,
    entryFriction: 75,
    evidenceConfidence: 91,
    regulationNotes: ["按国家/省份处理数据、健康、支付、税务和消费者保护", "所有采购、预算和系统替换判断均需人工确认"]
  },
  {
    id: "canada",
    name: "加拿大",
    countries: ["加拿大"],
    customerIds: ["loblaw"],
    marketSummary: "全国性零售网络、AI Commerce 和自动化 DC 投资带来机会，但省级隐私、健康信息和供应商治理复杂。",
    digitalDemand: 94,
    marketAttractiveness: 92,
    entryFriction: 82,
    evidenceConfidence: 94,
    regulationNotes: ["各省隐私要求", "健康数据隔离", "跨境运维和第三方 SaaS", "营销同意管理"]
  },
  {
    id: "oceania",
    name: "澳大利亚 / 新西兰",
    countries: ["澳大利亚", "新西兰"],
    customerIds: ["sigma-chemist"],
    marketSummary: "药房、批发、加盟和物流场景明确；药品批次、效期、召回、温控和 EDI 是关键门槛。",
    digitalDemand: 89,
    marketAttractiveness: 87,
    entryFriction: 78,
    evidenceConfidence: 92,
    regulationNotes: ["受控药品 Schedule 8", "GMP/GWP/GDP", "冷链温控与召回", "处方和健康数据"]
  },
  {
    id: "ireland",
    name: "爱尔兰",
    countries: ["爱尔兰"],
    customerIds: ["sigma-chemist"],
    marketSummary: "Sigma FY2026 资料披露爱尔兰 18 家 Chemist Warehouse 门店；当前可围绕药房零售、库存和履约协同评估机会，但当地系统边界和采购计划仍需确认。",
    digitalDemand: 81,
    marketAttractiveness: 79,
    entryFriction: 82,
    evidenceConfidence: 83,
    regulationNotes: ["欧盟 GDPR 与健康数据", "药品批次、效期和召回", "本地药房监管", "跨境数据与系统部署"]
  },
  {
    id: "uae",
    name: "阿联酋",
    countries: ["阿联酋"],
    customerIds: ["sigma-chemist"],
    marketSummary: "Sigma FY2026 资料确认 Chemist Warehouse 已进入阿联酋，但未单列当地门店数量、系统架构或采购计划；当前应以药房零售和履约场景的市场验证为主。",
    digitalDemand: 80,
    marketAttractiveness: 82,
    entryFriction: 85,
    evidenceConfidence: 74,
    regulationNotes: ["药品零售与进口许可", "健康和个人数据保护", "税务、支付与电子发票", "阿拉伯语本地化与本地部署边界"]
  },
  {
    id: "usa",
    name: "美国",
    countries: ["美国"],
    customerIds: ["cencosud"],
    marketSummary: "Cencosud 官方资料披露其美国业务包含 The Fresh Market 门店网络；市场机会应聚焦美国业务的门店、库存和履约场景，不沿用南美洲国家结论。",
    digitalDemand: 86,
    marketAttractiveness: 88,
    entryFriction: 79,
    evidenceConfidence: 86,
    regulationNotes: ["州级隐私与消费者保护", "支付和税务规则", "食品零售合规", "现有美国业务系统与集团平台边界"]
  },
  {
    id: "south-america",
    name: "南美洲",
    countries: ["智利", "巴西", "秘鲁", "阿根廷", "哥伦比亚"],
    customerIds: ["cencosud"],
    marketSummary: "Cencosud 的区域平台、跨国复制、并购整合和零售媒体战略形成明确窗口，需逐国处理税务、支付和数据规则。",
    digitalDemand: 91,
    marketAttractiveness: 90,
    entryFriction: 80,
    evidenceConfidence: 91,
    regulationNotes: ["逐国税务和电子发票", "支付与消费者保护", "数据驻留", "多币种和多语言"]
  }
];

export const capabilities: ProductCapability[] = [
  {
    id: "open-platform",
    name: "Open Platform",
    layer: "集成与互操作",
    description: "提供商品、价格、库存、订单、会员、促销与数据 API，连接 SAP、D365、OCI、EDI、AI 和本地系统。",
    targetSignals: ["多供应商", "区域平台", "系统整合", "AI Commerce", "EDI"],
    targetScenarios: ["既有 ERP 共存", "跨国家复制", "并购系统整合", "UCP/AI 适配层"],
    prerequisites: ["确认主数据系统", "确认 API/EDI 合同", "数据安全与审计方案"],
    deliveryComplexity: "medium",
    avoidClaims: ["替换 SAP", "替换 D365", "替换 OCI/Google", "已进入采购流程"]
  },
  {
    id: "oms-fulfilment",
    name: "OMS / 全渠道履约",
    layer: "订单与履约",
    description: "订单聚合、库存承诺、分单、门店/暗店拣货、配送、自提和售后编排。",
    targetSignals: ["电商增长", "Click & Collect", "暗店", "PC Express", "到家服务"],
    targetScenarios: ["门店发货", "到店自提", "暗店履约", "即时/次日配送"],
    prerequisites: ["实时库存可用", "订单和门店接口", "配送与支付边界"],
    deliveryComplexity: "medium",
    avoidClaims: ["替换客户全部电商平台", "在未验证时承诺全渠道统一库存"]
  },
  {
    id: "wms-replenishment",
    name: "WMS / 智能补货",
    layer: "供应链",
    description: "DC/暗店/仓店协同、预测补货、安全库存、批次效期、波次、质检和库存可视化。",
    targetSignals: ["新配送中心", "自动化 DC", "库存压力", "药品物流", "暗店"],
    targetScenarios: ["DC 与门店补货", "药房批次效期", "仓店协同", "自动化 DC 上层编排"],
    prerequisites: ["确认现有 WMS/WCS/ASRS", "确认批次效期与召回规则", "获取历史销售和库存数据"],
    deliveryComplexity: "high",
    avoidClaims: ["替换 WCS/ASRS 控制层", "未经验证承诺受控药品合规"]
  },
  {
    id: "store-pos",
    name: "门店运营 / POS",
    layer: "门店",
    description: "门店任务、人工/自助收银、支付、促销、会员与异常处理。",
    targetSignals: ["自助结账", "加盟网络", "门店扩张", "多业态"],
    targetScenarios: ["门店标准化", "自助结账", "加盟运营", "移动门店任务"],
    prerequisites: ["确认现有 POS", "本地支付和税务适配", "门店设备与离线策略"],
    deliveryComplexity: "high",
    avoidClaims: ["自助结账设备等于 POS 替换项目", "普通 POS 支持处方配药"]
  },
  {
    id: "data-cloud",
    name: "Data Cloud / 经营分析",
    layer: "数据",
    description: "指标、实时/离线数据服务、数据治理、经营驾驶舱、会员与供应商分析。",
    targetSignals: ["区域数据平台", "客户数据", "零售媒体", "多 banner", "数据治理"],
    targetScenarios: ["总部—区域—门店分析", "单一客户视图", "会员分群", "供应商营销"],
    prerequisites: ["数据定义和权限", "健康/会员数据分域", "现有 BI/CDP 边界"],
    deliveryComplexity: "medium",
    avoidClaims: ["重建客户已有 CDP", "跨域使用健康数据"]
  }
];

export const evidence: EvidenceRecord[] = [
  {
    id: "cencosud-annual-2025", customerId: "cencosud", regionId: "south-america", category: "financial",
    title: "Cencosud 2025 Integrated Annual Report", excerpt: "FY2025 收入约 182.08 亿美元；年末披露 1,398 家零售门店/地点。",
    sourceUrl: "https://www.cencosud.com/cencosud/site/docs/20260410/20260410085306/integrated_report_cencosud_2025.pdf",
    sourceType: "annual_report", sourceLevel: "A", publishedAt: "2026-04-10", retrievedAt, confidence: "high", kind: "fact", tags: ["收入", "门店", "规模"]
  },
  {
    id: "cencosud-cencoday-2026", customerId: "cencosud", regionId: "south-america", category: "digital",
    title: "Cencosud CencoDay 2026", excerpt: "披露 Regional Commercial Decision Engine、Customer & Data Platform、区域安全与韧性、电商和零售媒体战略。",
    sourceUrl: "https://www.cencosud.com/cencosud/site/docs/20260114/20260114114256/1__ceo___cencoday_2026_1.pdf",
    sourceType: "investor_presentation", sourceLevel: "A", publishedAt: "2026-01-14", retrievedAt, confidence: "high", kind: "fact", tags: ["区域平台", "数据", "AI", "电商"]
  },
  {
    id: "cencosud-q2-2026", customerId: "cencosud", regionId: "south-america", category: "expansion",
    title: "Cencosud 2Q26 Earnings Release", excerpt: "2Q26 电商同比增长 14.6%，约 3,100 万活跃忠诚客户，1,255 台自助结账设备。",
    sourceUrl: "https://www.cencosud.com/cencosud/site/docs/20260610/20260610154219/press_release_cencosud_2q26__eng_.pdf",
    sourceType: "earnings_release", sourceLevel: "A", publishedAt: "2026-06-10", retrievedAt, confidence: "high", kind: "fact", tags: ["电商增长", "会员", "自助结账"]
  },
  {
    id: "cencosud-opportunity-inference", customerId: "cencosud", regionId: "south-america", category: "system",
    title: "区域商品/库存服务与 OMS/WMS 切入假设", excerpt: "区域平台化、暗店履约和新配送中心信号共同支持外围集成机会，但当前系统供应商和预算未公开。",
    sourceUrl: "https://www.cencosud.com/cencosud/site/docs/20260114/20260114114256/1__ceo___cencoday_2026_1.pdf",
    sourceType: "agent_inference", sourceLevel: "B", publishedAt: "2026-08-27", retrievedAt, confidence: "medium", kind: "inference", tags: ["OMS", "WMS", "Open Platform"]
  },
  {
    id: "sigma-fy26", customerId: "sigma-chemist", regionId: "oceania", category: "financial",
    title: "Sigma Healthcare FY26 Release", excerpt: "Chemist Warehouse 全球约 659 家门店；集团继续整合药房、批发、物流和国际业务。",
    sourceUrl: "https://investorcentre.sigmahealthcare.com.au/static-files/afe6b331-0ca1-44ae-97c9-d823cbd4b8dd",
    sourceType: "asx_release", sourceLevel: "A", publishedAt: "2026-08-27", retrievedAt, confidence: "high", kind: "fact", tags: ["门店", "合并", "国际扩张"]
  },
  {
    id: "sigma-microsoft-d365", customerId: "sigma-chemist", regionId: "oceania", category: "system",
    title: "Microsoft: Chemist Warehouse cloud transformation", excerpt: "确认从本地 Dynamics AX 走向 Dynamics 365 Finance、SCM、Commerce 和 POS。",
    sourceUrl: "https://news.microsoft.com/en-au/features/chemist-warehouse-prescribes-cloud-transformation-to-boost-customer-wellbeing/",
    sourceType: "vendor_case", sourceLevel: "A", publishedAt: "2021-01-01", retrievedAt, confidence: "high", kind: "fact", tags: ["Dynamics 365", "POS", "供应链", "电商"]
  },
  {
    id: "sigma-manhattan", customerId: "sigma-chemist", regionId: "oceania", category: "system",
    title: "Manhattan: Chemist Warehouse inventory success", excerpt: "2018 案例确认 Manhattan SCALE 和 Active Inventory，用于库存预测、补货和降低门店库存天数。",
    sourceUrl: "https://www.manh.com/en-sg/resources/press-releases/2018/10/25/manhattan-associates-delivers-prescription-chemist-warehouse",
    sourceType: "vendor_case", sourceLevel: "A", publishedAt: "2018-10-25", retrievedAt, confidence: "high", kind: "fact", tags: ["WMS", "补货", "库存"]
  },
  {
    id: "sigma-logistics", customerId: "sigma-chemist", regionId: "oceania", category: "digital",
    title: "Sigma 3PL/4PL and Integration Services", excerpt: "官方资料确认温控、Schedule 8、GMP/GWP/GDP、冷链、XML 与自有 Integration Services。",
    sourceUrl: "https://sigmahealthcare.com.au/logistics/",
    sourceType: "official_website", sourceLevel: "A", publishedAt: "2026-01-01", retrievedAt, confidence: "high", kind: "fact", tags: ["冷链", "药品", "EDI", "3PL"]
  },
  {
    id: "sigma-opportunity-inference", customerId: "sigma-chemist", regionId: "oceania", category: "system",
    title: "药房履约与仓店协同切入假设", excerpt: "D365、Manhattan 和自有 Integration Services 表明替换核心系统风险高，更适合 OMS/WMS 外围协同与 EDI 集成。",
    sourceUrl: "https://news.microsoft.com/en-au/features/chemist-warehouse-prescribes-cloud-transformation-to-boost-customer-wellbeing/",
    sourceType: "agent_inference", sourceLevel: "B", publishedAt: "2026-08-27", retrievedAt, confidence: "medium", kind: "inference", tags: ["共存", "OMS", "EDI"]
  },
  {
    id: "loblaw-annual-2025", customerId: "loblaw", regionId: "canada", category: "financial",
    title: "Loblaw 2025 Annual Report", excerpt: "FY2025 零售收入约 461.76 亿美元、2,504 家门店、1,800 万+ PC Optimum 活跃会员；2025 年新开 77 家。",
    sourceUrl: "https://dis-prod.assetful.loblaw.ca/content/dam/loblaw-companies-limited/creative-assets/loblaw-ca/investor-relations-reports/annual/2025/LCL_2025%20Annual%20Report.pdf",
    sourceType: "annual_report", sourceLevel: "A", publishedAt: "2026-02-01", retrievedAt, confidence: "high", kind: "fact", tags: ["收入", "门店", "会员", "扩张"]
  },
  {
    id: "loblaw-google-ai", customerId: "loblaw", regionId: "canada", category: "digital",
    title: "Loblaw Google AI Commerce", excerpt: "官方公告确认计划通过 Google AI Mode 和 Gemini 销售商品，并扩大 Vertex AI 在商品、供应链和门店的使用。",
    sourceUrl: "https://www.loblaw.ca/en/loblaw-accelerates-the-adoption-of-ai-driven-digital-commerce-in-canada-with-google-collaboration/",
    sourceType: "official_announcement", sourceLevel: "A", publishedAt: "2026-02-01", retrievedAt, confidence: "high", kind: "fact", tags: ["AI Commerce", "Vertex AI", "UCP", "商品"]
  },
  {
    id: "loblaw-oracle-oci", customerId: "loblaw", regionId: "canada", category: "system",
    title: "Loblaw SAP systems on OCI", excerpt: "2023 年将超过 180TB 的 SAP 数据库迁移到 Oracle Exadata Database Service on OCI，关键交易性能提升最高约 35%。",
    sourceUrl: "https://www.prnewswire.com/news-releases/loblaw-rings-up-oracle-cloud-infrastructure-to-modernize-its-it-infrastructure-301929743.html",
    sourceType: "vendor_announcement", sourceLevel: "A", publishedAt: "2023-09-18", retrievedAt, confidence: "high", kind: "fact", tags: ["SAP", "OCI", "云基础设施"]
  },
  {
    id: "loblaw-groceryshop", customerId: "loblaw", regionId: "canada", category: "event",
    title: "Groceryshop 2026 speaker evidence", excerpt: "Leanne Gibson（SVP Loblaw Advance）出现在 Groceryshop 2026 speaker evidence 中，形成可核验的活动触达线索。",
    sourceUrl: "https://groceryshop.com/speaker-list",
    sourceType: "event_speaker_list", sourceLevel: "A", publishedAt: "2026-08-01", retrievedAt, confidence: "high", kind: "fact", tags: ["活动", "决策人", "零售媒体"]
  },
  {
    id: "loblaw-opportunity-inference", customerId: "loblaw", regionId: "canada", category: "system",
    title: "Open Platform 与履约编排切入假设", excerpt: "AI Commerce、PC Express 和自动化 DC 形成接口与编排机会，但 SAP/OCI/Google 与内部数字团队边界需优先确认。",
    sourceUrl: "https://www.loblaw.ca/en/loblaw-accelerates-the-adoption-of-ai-driven-digital-commerce-in-canada-with-google-collaboration/",
    sourceType: "agent_inference", sourceLevel: "B", publishedAt: "2026-08-27", retrievedAt, confidence: "medium", kind: "inference", tags: ["Open Platform", "OMS", "自动化 DC"]
  }
];

export const customerById = new Map(customers.map((customer) => [customer.id, customer]));
export const regionById = new Map(regions.map((region) => [region.id, region]));
export const capabilityById = new Map(capabilities.map((capability) => [capability.id, capability]));

export function evidenceForCustomer(customerId: string): EvidenceRecord[] {
  return evidence.filter((record) => record.customerId === customerId);
}
