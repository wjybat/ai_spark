// Presentation snapshot. Scenario counts and analyst scores are deliberately
// separate from sourced country/company facts and the Agent's customer pool.
(function () {
  const data = window.OPPORTUNITY_DATA;
  const source = (title, url) => ({ title, url });
  const cencosud = data.companyProfiles.cencosud.sources;
  const sigma = data.companyProfiles.sigma.sources;
  const loblaw = data.companyProfiles.loblaw.sources;
  const event = (name, start, end, city, theme, followUp, url) => ({ name, start, end, city, theme, followUp, source: source(`${name} · 活动资料`, url) });
  const dimension = (key, label, score, verdict, detail) => ({ key, label, score, verdict, detail });
  const signal = (type, title, detail, action, evidence) => ({ type, title, detail, action, source: evidence });
  const risk = (title, detail, response) => ({ title, detail, response });
  const continentCounts = (name, companies, outlets) => [
    { key: "companies", scope: "continent", label: `${name}零售企业`, value: companies, meta: "家 · 大洲口径" },
    { key: "outlets", scope: "continent", label: `${name}零售经营网点`, value: outlets, meta: "个 · 大洲口径" }
  ];
  const markets = {
    south_america: {
      thesis: "从区域龙头切入，把单国试点复制到多国网络",
      summary: "南美既有跨国经营的大型零售集团，也有服务社区的中小商户。超市、批发零售和药房是值得关注的客户类型。消费者重视价格和促销，零售商需要控制采购成本、减少缺货和商品损耗，并提高线上订单的配送效率。",
      structure: "开发巴西客户时，可优先关注大型超市和批发零售商，了解它们如何管理多个仓库和门店。对于 Cencosud 这类总部位于智利、业务覆盖多个国家的集团，可先与总部确认合作方向，再选择一个国家试点。到哥伦比亚、秘鲁开展业务时，则要逐家核实开店计划和系统需求。",
      companies: "280 万", outlets: "320 万", countNote: "南美洲 12 国零售企业与经营网点。", posture: "优先联系大型零售集团",
      countMetrics: continentCounts("南美洲", "280 万", "320 万"),
      geography: { total: 12, names: ["阿根廷", "玻利维亚", "巴西", "智利", "哥伦比亚", "厄瓜多尔", "圭亚那", "巴拉圭", "秘鲁", "苏里南", "乌拉圭", "委内瑞拉"], scope: "按 12 个主权国家统计，不含属地；已收录资料数单独列示。", source: source("联合国数字图书馆 · 南美洲国家范围", "https://digitallibrary.un.org/record/4025087/files/1386802EN.pdf") },
      formats: ["食品超市", "批发零售", "药房", "便利店", "百货与家居"],
      focus: [{ name: "巴西", reason: "规模与多业态" }, { name: "智利", reason: "区域总部决策" }, { name: "哥伦比亚 / 秘鲁", reason: "连锁与履约升级" }],
      retailers: ["Cencosud", "Carrefour Brasil", "Assaí", "Grupo Éxito", "Falabella"],
      snapshot: { value: "1.1451 万亿", unit: "巴西雷亚尔（BRL）", label: "巴西食品零售行业 · 2025 年营收", scope: "统计期：2025 年全年；发布版本：ABRAS 2026。食品零售门店 439,728 家。", currencyNote: "巴西雷亚尔：巴西本币，货币符号 R$。", source: source("ABRAS 2026 · 2025 年行业规模与门店数据", "https://static.abras.com.br/pdf/ranking/grandes-numeros-ranking-smartmarket-abras-2026.pdf") },
      dimensions: [
        dimension("activity", "市场活跃度", 78, "活跃", "折扣消费与线上履约共同拉动经营升级，市场对降本增效较敏感。"),
        dimension("digital", "数字化水平", 65, "分层明显", "区域龙头已有核心系统，中小连锁在库存、会员和数据协同上仍有空白。"),
        dimension("expansion", "扩张信号", 80, "多国复制", "集团扩店与业态整合带来商品、门店和供应链标准化需求。"),
        dimension("risk", "进入风险", 68, "中高", "汇率波动、跨国税务差异及本地交付能力影响项目节奏。")
      ],
      signals: [
        signal("数字化", "区域平台进入集团议程", "项目收录的 CencoDay 2026 材料提出区域商业决策引擎与客户数据平台。", "以商品与库存协同为切口，确认各国系统的统一边界。", cencosud[1]),
        signal("扩张", "多国家、多品牌网络可复制", "Cencosud 的南美经营网络覆盖项目中已收录的五个国家。", "先对接智利总部，再选择单国业务场景验证。", cencosud[0]),
        signal("经营升级", "批发零售与食品连锁是切入主场", "ABRAS 2026 披露 2025 年巴西食品零售行业规模及头部集团排名。", "优先展示补货、促销和仓店库存一体化方案。", source("ABRAS · Ranking 2026", "https://www.abras.com.br/eventos/ranking-abras/2026"))
      ],
      risks: [risk("多国业务差异", "税务、促销和商品规则难以直接跨国复用。", "保留国家规则层，先复制核心流程。"), risk("存量系统与交付", "集团既有系统复杂，本地支持能力决定落地速度。", "先验证接口与本地合作伙伴。")],
      nextStep: "以智利总部为入口，在巴西或智利选择一个库存与履约场景，形成可跨国复制的试点方案。",
      events: [
        event("Beauty Fair 2026", "2026-09-05", "2026-09-08", "巴西 · 圣保罗", "美妆零售 / 商超 / 药房 / 电商（含零售专区）", "聚焦零售专区的美妆连锁、药房和分销商，核实商品与会员系统需求。", "https://negociosdebeleza.beautyfair.com.br/beauty-fair-2026-marcas-transformam-estandes-em-plataformas-de-experiencia-relacionamento-e-negocios/"),
        event("Beauty Fair 2025", "2025-09-06", "2025-09-09", "巴西 · 圣保罗", "美妆零售 / 品牌分销 / 零售专区", "回看零售专区及品牌资料，筛选美妆连锁和分销合作伙伴。", "https://negociosdebeleza.beautyfair.com.br/tudo-sobre-a-beauty-fair-2025-a-edicao-historica-que-promete-transformar-o-mercado-da-beleza/"),
        event("SuperAgos 2025", "2025-09-16", "2025-09-18", "巴西 · 戈亚尼亚", "区域超市 / 食品零售 / 烘焙", "从戈亚斯州及中西部超市展商与议程中筛选补货和门店管理线索。", "https://www.superagos.com.br/super-agos/"),
        event("ACAPS Trade Show 2025", "2025-09-16", "2025-09-18", "巴西 · 塞拉（圣埃斯皮里图州）", "区域超市 / 零售运营 / 供应商服务", "梳理当地超市与服务商名单，评估库存、促销及门店技术合作。", "https://acapstradeshow.com.br/noticias/participe-da-maior-feira-de-negocios-do-varejo-capixaba/"),
        event("Expo Supermercados 2026", "2026-04-07", "2026-04-09", "巴西 · 圣保罗", "社区超市 / 邻里零售 / 示范门店（Anuga Brazil 内举办）", "关注社区超市的库存、自助收银和损耗管理案例；不将同期分论坛重复计场。", "https://www.exposupermercados.com.br/post/expo-supermercados-2026-negocios-experiencias-e-inovacoes-para-o-seu-supermercado"),
        event("SRE Super Rio Expofood 2026", "2026-03-17", "2026-03-19", "巴西 · 里约热内卢", "超市 / 食品零售 / 餐饮供应", "筛选超市业务相关参展商和零售议程，识别食品库存与供应链合作方向。", "https://sretradeshow.com.br/seja-um-patrocinador/"),
        event("Superminas 2026", "2026-10-27", "2026-10-29", "巴西 · 贝洛奥里藏特", "超市 / 烘焙零售 / 门店效率", "提前筛选区域超市与供应商，准备补货和损耗管理方案。", "https://superminas.org.br/"),
        event("Latam Retail Show 2026", "2026-09-15", "2026-09-17", "巴西 · 圣保罗", "零售创新 / AI / 全渠道经营", "依据议程预约集团数字化与运营负责人。", "https://latamretailshow.com/"),
        event("Expoagas 2026", "2026-08-18", "2026-08-20", "巴西 · 阿雷格里港", "超市 / 商品供应 / 零售服务", "回看展商与区域连锁资料，识别仓店协同合作机会。", "https://www.agas.com.br/site/default.asp?SecaoID=0&SubsecaoID=0&TroncoID=918182"),
        event("APAS SHOW 2026", "2026-05-18", "2026-05-21", "巴西 · 圣保罗", "食品零售 / 供应链 / 门店技术", "按超市集团与物流服务商筛选参展名单。", "https://schedule.apas.com.br/calendar2/externo/index.php?ano=2026"),
        event("Latam Retail Show 2025", "2025-09-16", "2025-09-18", "巴西 · 圣保罗", "零售创新 / 数据 / 消费趋势", "回看集团演讲，提取区域数字化议题。", "https://www.idv.org.br/agenda-de-eventos")
      ]
    },
    north_america: {
      thesis: "用可量化的经营收益，进入成熟零售商的升级预算",
      summary: "北美是消费规模大、连锁化程度高的成熟零售市场。美国的多业态集团、加拿大的食品与药房网络，以及墨西哥的现代零售与便利店体系，共同形成层次丰富的客户版图。",
      structure: "头部企业已有电商、会员和核心业务系统，采购重点正在转向更精准的补货、更低的履约成本和更高的会员价值。新方案需要融入现有生态，并给出清晰的投入产出。",
      companies: "180 万", outlets: "280 万", posture: "聚焦成熟客户增量价值",
      countNote: "北美洲 23 国（含中美洲与加勒比）零售企业与经营网点。",
      countMetrics: continentCounts("北美洲", "180 万", "280 万"),
      formats: ["大型超市", "会员仓储", "药房", "便利店", "专业零售"],
      focus: [{ name: "美国", reason: "技术预算与场景规模" }, { name: "加拿大", reason: "食品药房与会员协同" }, { name: "墨西哥", reason: "便利店与现代零售" }],
      retailers: ["Walmart", "Costco", "Loblaw", "Kroger", "OXXO"],
      snapshot: { value: "1.9865 万亿", unit: "美元（USD）", label: "美国季度零售销售额", scope: "2026 年第二季度 · Census 季调数据；同比增长 6.7%。", source: source("Census · 2026 Q2 零售与电商", "https://www.census.gov/retail/ecommerce.html") },
      dimensions: [
        dimension("activity", "市场活跃度", 86, "高度活跃", "成熟消费市场持续投资会员、零售媒体和全渠道经营。"),
        dimension("digital", "数字化水平", 91, "成熟", "云、数据与自动化基础较完善，竞争重点在业务效果和系统协同。"),
        dimension("expansion", "扩张信号", 74, "新店与翻新并行", "门店优化、自动化配送中心和新业态是增量线索。"),
        dimension("risk", "进入风险", 58, "中等", "竞争门槛高、供应商审查较长，需清晰证明差异化。")
      ],
      signals: [
        signal("扩张", "新店与翻新带来项目窗口", "项目资料记录 Loblaw 2026 年计划约 70 家新店和 191 家翻新。", "围绕新店上线、老店改造和门店运营标准化建立方案。", loblaw[0]),
        signal("合作", "AI 商业应用进入零售主流程", "Loblaw 与 Google 合作推进 AI 驱动的数字商业。", "关注商品数据质量与履约协同，判断可合作的业务边界。", loblaw[1]),
        signal("供应链", "自动化仓配需要更好的仓店协同", "项目年报资料收录 Caledon 自动化配送中心建设线索。", "从库存可视化、补货异常和履约效率切入。", loblaw[0])
      ],
      risks: [risk("成熟厂商竞争", "核心系统替换成本高，采购方已有长期合作伙伴。", "先做可独立验收的业务模块。"), risk("采购与安全审查", "大型集团通常有多部门评估和供应商准入流程。", "提前准备安全材料和集成验证。"), risk("价值证明", "人工、库存和履约成本改善需要可核对的基线。", "与业务团队共同确定试点指标。")],
      nextStep: "以加拿大食品与药房客户为首批样本，围绕补货和全渠道履约建立收益测算，再进入采购评估。",
      events: [
        event("NACS Show 2026（展览）", "2026-10-07", "2026-10-09", "美国 · 拉斯维加斯", "便利店 / 门店设备 / 商品与运营（会议：10 月 6–9 日）", "按便利店与加油站零售网络预约设备、运营和供应链团队。", "https://www.nacsshow.com/Exhibit/Documents/Booth-Selection-Packet"),
        event("Shoptalk Fall 2026", "2026-09-29", "2026-10-01", "美国 · 纳什维尔", "全渠道 / B2B 商业 / 零售战略", "预约零售集团决策者，讨论下一年度经营与系统升级计划。", "https://fall.shoptalk.com/attendee-hub"),
        event("Groceryshop 2026", "2026-09-22", "2026-09-24", "美国 · 拉斯维加斯", "食品与日用零售 / AI / 零售媒体", "优先对接超市、便利店和药房的商品与履约负责人。", "https://groceryshop.com/home"),
        event("Shoptalk Spring 2026", "2026-03-24", "2026-03-26", "美国 · 拉斯维加斯", "AI 商业 / 全渠道 / 消费体验", "从议程与参会企业识别会员、数据和履约负责人。", "https://spring.shoptalk.com/agendas/2026-agenda"),
        event("NRF 2026: Retail’s Big Show", "2026-01-11", "2026-01-13", "美国 · 纽约", "零售科技 / 门店运营 / 供应链", "回看零售商案例，建立技术伙伴与客户名单。", "https://nrf.com/blog/what-to-expect-at-nrf-2026-retails-big-show")
      ]
    },
    oceania: {
      thesis: "围绕澳新头部连锁，深耕药房与仓店协同",
      summary: "大洋洲的现代零售需求主要集中在澳大利亚和新西兰。食品超市、药房、家居与专业零售具有较强连锁特征；人口分散、配送距离长，使库存效率和供应链可靠性成为核心议题。",
      structure: "市场体量相对有限，但头部客户的业务网络和数字化基础适合形成标杆。应围绕药房、加盟网络和全渠道履约切入，重视与现有系统共存和本地服务能力。",
      companies: "18 万", outlets: "22 万", posture: "深耕少数标杆客户",
      countNote: "大洋洲 14 国零售企业与经营网点。",
      countMetrics: continentCounts("大洋洲", "18 万", "22 万"),
      formats: ["食品超市", "连锁药房", "家居建材", "专业零售", "便利店"],
      focus: [{ name: "澳大利亚", reason: "集团总部与药房网络" }, { name: "新西兰", reason: "区域复制与仓配协同" }, { name: "太平洋岛国", reason: "分销与基础库存管理" }],
      retailers: ["Woolworths", "Coles", "Chemist Warehouse", "Bunnings", "Foodstuffs"],
      snapshot: { value: "6,655.63 亿", unit: "澳元（AUD）", label: "澳大利亚零售业年度营业收入", scope: "2024–25 财年 · ABS Australian Industry；同比增长 2.8%。", source: source("ABS · 2024–25 财年零售业", "https://www.abs.gov.au/statistics/industry/industry-overview/australian-industry/2024-25/81550TSSDIVG.xlsx") },
      dimensions: [
        dimension("activity", "市场活跃度", 73, "稳健", "头部连锁的效率改善需求强，整体市场适合深耕。"),
        dimension("digital", "数字化水平", 85, "较成熟", "云系统、仓储与库存平台已有较好基础。"),
        dimension("expansion", "扩张信号", 70, "精选扩张", "药房与加盟网络的复制、整合带来协同空间。"),
        dimension("risk", "进入风险", 43, "中低", "客户集中、交付成本高，药房场景专业要求较强。")
      ],
      signals: [
        signal("扩张", "澳新药房形成区域复制网络", "项目收录的 Sigma FY2026 资料列示澳大利亚 561 家、新西兰 75 家 Chemist Warehouse 门店。", "关注总部、门店与加盟体系之间的库存协作。", sigma[0]),
        signal("数字化", "云转型提供集成边界", "Microsoft 官方案例介绍 Chemist Warehouse 的 Dynamics 365 转型。", "先确认既有财务、供应链和门店系统的职责。", sigma[1]),
        signal("供应链", "药品物流与集成服务构成基础", "Sigma 提供药品物流、温控设施及集成服务。", "以批次效期、补货与异常追踪为场景开展验证。", sigma[3])
      ],
      risks: [risk("客户集中", "可触达的大型集团数量有限，单一项目依赖较高。", "同时布局食品、药房和专业零售。"), risk("药房专业要求", "温控、批次效期与特殊药品流程影响方案设计。", "先与本地行业团队确认业务要求。"), risk("远距离交付", "物流半径与本地人力成本影响服务模式。", "优先远程配置与本地合作交付。")],
      nextStep: "围绕澳大利亚药房客户验证仓店协同，再以同一集团的新西兰网络评估跨市场复制。",
      events: [
        event("Retail Show Australia 2026", "2026-09-22", "2026-09-24", "澳大利亚 · 墨尔本", "零售技术 / 门店设计 / 运营", "预约澳新零售商与技术伙伴，展示库存及门店协同方案。", "https://www.retail-show.com.au/retail-show-australia-returns-in-2026"),
        event("Fine Food Australia 2026", "2026-08-31", "2026-09-03", "澳大利亚 · 墨尔本", "食品零售 / 餐饮供应 / 商用设备", "筛选食品零售相关展商，关注鲜食供应和库存损耗场景。", "https://finefoodaustralia.com.au/"),
        event("Online Retailer 2026", "2026-07-22", "2026-07-23", "澳大利亚 · 悉尼", "电商 / 营销 / 全渠道履约", "寻找电商运营与供应链负责人，回看履约案例。", "https://www.onlineretailer.com/en-gb/exhibit-or-sponsor/enquire-to-exhibit/rebook-for-or2026.html"),
        event("Retail Fest 2026", "2026-05-05", "2026-05-07", "澳大利亚 · 黄金海岸", "电商 / 零售增长 / 技术服务", "回看零售品牌与技术商案例，梳理全渠道增长及集成需求。", "https://retailglobal.com/retail-fest-hosted/"),
        event("Retail Show Australia 2025", "2025-10-03", "2025-10-05", "澳大利亚 · 墨尔本", "门店设备 / 零售技术 / 消费场景", "从展后回顾筛选门店技术伙伴与零售品牌。", "https://www.retail-show.com.au/news/class/?catid=130&myord=dtime&page=1")
      ]
    },
    europe: {
      thesis: "以门店效率为起点，在成熟市场做精细化升级",
      summary: "欧洲零售成熟且国家差异明显，食品超市、折扣店、药房与美妆连锁形成主要商业网络。西欧强调存量门店效率与全渠道体验，中东欧则兼具现代零售扩张和系统升级空间。",
      structure: "零售商更关注人工效率、鲜食损耗、库存周转和能源成本。多语言、多币种以及各国业务规则使本地化成为交付重点，适合与区域合作伙伴共同进入。",
      companies: "350 万", outlets: "450 万", posture: "以效率场景建立标杆",
      countNote: "欧洲 44 国零售企业与经营网点。",
      countMetrics: continentCounts("欧洲", "350 万", "450 万"),
      formats: ["食品超市", "折扣店", "药房与美妆", "便利店", "时尚与百货"],
      focus: [{ name: "德国 / 法国", reason: "门店效率与供应链" }, { name: "英国 / 爱尔兰", reason: "全渠道与药房网络" }, { name: "中东欧", reason: "连锁复制与系统升级" }],
      retailers: ["Schwarz Group", "Aldi", "Carrefour", "Tesco", "Ahold Delhaize"],
      snapshot: { value: "+2.3%", label: "欧盟 2025 年零售贸易量增长", scope: "Eurostat 年均零售贸易量相对 2024 年的变化；欧盟口径，不代表全欧洲销售金额。", source: source("Eurostat · 2025 零售贸易量", "https://ec.europa.eu/eurostat/en/web/products-euro-indicators/w/4-05022026-AP") },
      dimensions: [
        dimension("activity", "市场活跃度", 75, "稳中升级", "增长较温和，降本、翻新和精细化运营构成持续需求。"),
        dimension("digital", "数字化水平", 86, "较成熟", "总部系统完善，门店与跨渠道数据仍有整合空间。"),
        dimension("expansion", "扩张信号", 66, "结构性扩张", "折扣与专业连锁的国家复制值得关注。"),
        dimension("risk", "进入风险", 57, "中等", "本地业务与数据要求复杂，系统替换和采购周期较长。")
      ],
      signals: [
        signal("扩张", "专业连锁的国际化样本", "项目资料收录 Chemist Warehouse 在爱尔兰的 18 家门店。", "评估新市场门店模板、商品与供应链的复制需求。", sigma[0]),
        signal("展会", "零售技术与门店改造同场聚集", "EuroShop 2026 将零售技术、门店设计与设备供应商集中展示。", "按补货、门店运营和集成能力筛选合作伙伴。", source("EuroShop · 官方访客指南", "https://www.euroshop-tradefair.com/en/Visit")),
        signal("经营升级", "温和增长强化效率诉求", "Eurostat 披露欧盟 2025 年零售贸易量年均增长 2.3%。", "将鲜食损耗、库存周转和人工效率作为价值论证重点。", source("Eurostat · 2025 零售贸易量", "https://ec.europa.eu/eurostat/en/web/products-euro-indicators/w/4-05022026-AP"))
      ],
      risks: [risk("本地化复杂", "各国语言、税务和门店流程存在差异。", "从一个国家和一个业态开始验证。"), risk("数据与组织边界", "集团、国家公司和门店对数据使用及系统职责要求不同。", "提前厘清数据范围与责任主体。"), risk("替换成本", "成熟供应商和既有系统增加全面替换难度。", "优先模块接入，先验证经营收益。")],
      nextStep: "以爱尔兰药房样本或西欧食品连锁为入口，联合本地伙伴准备库存效率与门店运营演示。",
      events: [
        event("eCommerce Expo 2026", "2026-09-23", "2026-09-24", "英国 · 伦敦", "电商 / 客户体验 / 商业技术", "依据展商和议程预约电商运营、客户体验与技术团队。", "https://www.ecommerceexpo.co.uk/?azletter=E"),
        event("NRF 2026: Retail’s Big Show Europe", "2026-09-15", "2026-09-17", "法国 · 巴黎", "零售创新 / 全渠道 / 数据", "提前筛选欧洲零售集团，安排全渠道与门店升级交流。", "https://www.nrfbigshoweurope.com/exhibit"),
        event("Retail Technology Show 2026", "2026-04-22", "2026-04-23", "英国 · 伦敦", "零售技术 / 门店运营 / 数字化", "从展商与演讲资料寻找英国零售技术生态伙伴。", "https://www.retailtechnologyshow.com/news/registrations-open-retail-technology-show-retails-flagship-event-prepares-deliver-disco-digital-transformation-rts-2026"),
        event("EuroShop 2026", "2026-02-22", "2026-02-26", "德国 · 杜塞尔多夫", "零售技术 / 门店设计 / 设备", "从展商目录寻找零售商生态伙伴与门店升级议题。", "https://origin-www.euroshop-tradefair.com/en/Exhibit/Information/At_a_glance"),
        event("NRF 2025: Retail’s Big Show Europe", "2025-09-16", "2025-09-18", "法国 · 巴黎", "统一商业 / 数据 / 供应链", "回看欧洲集团分享，识别跨国经营与全渠道方向。", "https://nrf.com/media-center/press-releases/nrf-and-comexposium-expand-retails-big-show-europe")
      ]
    },
    asia: {
      thesis: "沿着连锁扩张进入，以本地化能力复制门店与供应链",
      summary: "亚洲横跨成熟零售市场与高增长的新兴市场。东亚的电商和门店数字化基础较深，东南亚与南亚的现代连锁仍有扩展空间，海湾市场则汇聚区域集团与国际品牌。",
      structure: "便利店、超市、药房和美妆是值得关注的场景。移动消费、即时零售与跨国品牌复制带来门店上线、商品管理和履约需求，但各国支付、语言与配送条件差异较大。",
      companies: "1,800 万", outlets: "2,200 万", posture: "扩张驱动，分国落地",
      countNote: "亚洲 48 国（含中东亚洲国家）零售企业与经营网点。",
      countMetrics: continentCounts("亚洲 / 中东", "1,800 万", "2,200 万"),
      formats: ["便利店", "食品超市", "药房", "美妆", "电商与即时零售"],
      focus: [{ name: "东南亚", reason: "便利店与区域连锁" }, { name: "海湾市场", reason: "国际品牌与多语运营" }, { name: "东亚 / 南亚", reason: "数字化升级与消费规模" }],
      retailers: ["AEON", "Seven & i", "CP ALL", "LuLu Retail", "Reliance Retail"],
      snapshot: { value: "8,500 名", label: "NRF APAC 2026 注册参与者", scope: "主办方披露来自 60 个国家，反映展会交流活跃度；不是零售公司或连锁品牌总量。", source: source("NRF APAC · 2026 展后回顾", "https://nrfbigshowapac.nrf.com/") },
      dimensions: [
        dimension("activity", "市场活跃度", 90, "高度活跃", "多层次消费市场与快速演变的商业模式提供较多需求入口。"),
        dimension("digital", "数字化水平", 76, "成熟与升级并存", "头部集团数字化较深，中小连锁仍需要门店和库存基础能力。"),
        dimension("expansion", "扩张信号", 88, "扩张强", "便利店、药房和国际品牌复制适合形成标准化门店方案。"),
        dimension("risk", "进入风险", 64, "中高", "市场差异大，区域平均判断不能替代单国调研。")
      ],
      signals: [
        signal("扩张", "海湾药房网络提供进入样本", "项目收录 Sigma / Chemist Warehouse 的阿联酋经营样本，尚未单列当地门店数量。", "先明确当地运营主体，再核实门店复制与库存需求。", sigma[0]),
        signal("展会", "区域零售技术交流活跃", "NRF APAC 2026 在新加坡聚集零售商、品牌和技术服务商。", "按国家与业态筛选参会企业，形成区域合作名单。", source("NRF APAC · 展后回顾", "https://nrfbigshowapac.nrf.com/")),
        signal("场景研判", "跨国连锁需要统一模板与本地规则", "根据区域经营特征，商品、促销、会员和支付本地化是潜在需求；尚未对应具体采购项目。", "制作多语言门店与区域库存演示，再验证客户实际痛点。")
      ],
      risks: [risk("国家差异大", "同一套流程在支付、税务、语言和物流上需要适配。", "按国家拆分方案，优先选一个区域支点。"), risk("价格与竞争", "本地软件商和集团自研团队都可能参与竞争。", "强调可复制的业务能力与交付效率。"), risk("伙伴与交付", "跨国项目对本地服务及总部协调要求较高。", "确认本地伙伴、试点门店与集团决策路径。")],
      nextStep: "以阿联酋现有样本和东南亚连锁场景准备两套演示，优先验证多语言门店、区域商品与库存协同。",
      events: [
        event("Seamless Digital Commerce Middle East 2026", "2026-09-22", "2026-09-24", "阿联酋 · 迪拜", "数字商业 / 电商 / 配送与营销", "按最新议程预约海湾零售商和本地全渠道合作伙伴。", "https://terrapinn.com/exhibition/seamless-middle-east/agenda.stm"),
        event("NRF 2026: Retail’s Big Show APAC", "2026-06-02", "2026-06-04", "新加坡 · 滨海湾金沙", "零售创新 / AI / 全渠道", "筛选东南亚零售商与区域合作伙伴。", "https://nrfbigshowapac.nrf.com/hubfs/2026/Files/EN%20-%202026%20EXHIBITOR%20PROSPECTUS.pdf"),
        event("In-store Asia 2026", "2026-05-21", "2026-05-23", "印度 · 孟买", "门店设计 / 视觉陈列 / 零售技术", "关注印度连锁门店升级与本地技术合作伙伴。", "https://www.euroshop-tradefair.com/en/media-news/news/newsticker/retail-design-in-india-finding-inspiration-at-in-store-asia-2026"),
        event("CHINASHOP 2026", "2026-04-15", "2026-04-17", "中国 · 杭州", "门店技术 / 智能设备 / 供应链", "梳理可出海的技术伙伴与零售场景。", "https://www.chinashop.cc/2026/buytickets/guide"),
        event("eCommerce Expo | DMEXCO Asia 2025", "2025-10-08", "2025-10-09", "新加坡 · 滨海湾金沙", "电商 / 数字营销 / 商业技术", "回看区域电商与技术展商，建立东南亚合作伙伴名单。", "https://www.ecommerceexpo-dmexco.asia/ecommerce-expo-a-dmexco-asia-events-calendar")
      ]
    }
  };

  data.continentMeta = {
    asOf: "2026-09-05", windowStart: "2025-09-01", windowEnd: "2026-12-31",
    countMethod: "顶部规模卡片统一采用大洲维度：零售企业按零售经营主体统计，零售经营网点按实体营业地点统计。国家数量按联合国 193 个会员国及 2 个观察员国统计，按 M49 地理分区归属；北美洲合并北部美洲、中美洲与加勒比国家。",
    scoreMethod: "四维评分为演示研判（0–100），用于表达相对特征。活跃度、数字化与扩张分数越高表示程度越高；风险分数越高表示进入风险越大。不是统计指数或已确认采购意向。",
    scopeNote: "沿用项目原有的亚洲 / 中东、欧洲、北美洲、南美洲和大洋洲五个区域。亚洲包含中东亚洲国家；北美包含中美洲与加勒比。顶部企业和网点数覆盖对应大洲的全部国家；国家页中的公开统计、当前已收录国家和客户样本均为独立口径。展会按举办地归洲，收录 2025 年 9 月至 2026 年 12 月的代表性活动，默认显示 5 场，可展开全部已收录活动；按开始日期从未来到过去排列。已收录数量不代表全年总数或穷尽检索。综合展仅在明确包含零售专区或零售议题时收录，同一展会的同期分论坛不重复计场。日期依据对应届次主办方或行业协会资料，官网可能已切换至下一届；举办状态按浏览器当前日期与已公布日程判断。"
  };
  data.getContinentEventStatus = (item, today) => {
    if (!today) {
      const now = new Date();
      today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    return today < item.start ? "upcoming" : today > item.end ? "ended" : "ongoing";
  };
  const geographyMembers = {
    south_america: markets.south_america.geography.names,
    north_america: ["加拿大", "美国", "墨西哥", "伯利兹", "哥斯达黎加", "萨尔瓦多", "危地马拉", "洪都拉斯", "尼加拉瓜", "巴拿马", "安提瓜和巴布达", "巴哈马", "巴巴多斯", "古巴", "多米尼克", "多米尼加", "格林纳达", "海地", "牙买加", "圣基茨和尼维斯", "圣卢西亚", "圣文森特和格林纳丁斯", "特立尼达和多巴哥"],
    europe: ["阿尔巴尼亚", "安道尔", "奥地利", "白俄罗斯", "比利时", "波斯尼亚和黑塞哥维那", "保加利亚", "克罗地亚", "捷克", "丹麦", "爱沙尼亚", "芬兰", "法国", "德国", "希腊", "梵蒂冈（圣座）", "匈牙利", "冰岛", "爱尔兰", "意大利", "拉脱维亚", "列支敦士登", "立陶宛", "卢森堡", "马耳他", "摩尔多瓦", "摩纳哥", "黑山", "荷兰", "北马其顿", "挪威", "波兰", "葡萄牙", "罗马尼亚", "俄罗斯", "圣马力诺", "塞尔维亚", "斯洛伐克", "斯洛文尼亚", "西班牙", "瑞典", "瑞士", "乌克兰", "英国"],
    asia: ["阿富汗", "亚美尼亚", "阿塞拜疆", "巴林", "孟加拉国", "不丹", "文莱", "柬埔寨", "中国", "塞浦路斯", "格鲁吉亚", "印度", "印度尼西亚", "伊朗", "伊拉克", "以色列", "日本", "约旦", "哈萨克斯坦", "科威特", "吉尔吉斯斯坦", "老挝", "黎巴嫩", "马来西亚", "马尔代夫", "蒙古", "缅甸", "尼泊尔", "朝鲜", "阿曼", "巴基斯坦", "巴勒斯坦", "菲律宾", "卡塔尔", "沙特阿拉伯", "新加坡", "韩国", "斯里兰卡", "叙利亚", "塔吉克斯坦", "泰国", "东帝汶", "土耳其", "土库曼斯坦", "阿联酋", "乌兹别克斯坦", "越南", "也门"],
    oceania: ["澳大利亚", "新西兰", "巴布亚新几内亚", "斐济", "所罗门群岛", "瓦努阿图", "萨摩亚", "汤加", "图瓦卢", "基里巴斯", "瑙鲁", "帕劳", "马绍尔群岛", "密克罗尼西亚联邦"]
  };
  for (const [id, market] of Object.entries(markets)) {
    market.geography = { total: geographyMembers[id].length, names: geographyMembers[id], scope: "按联合国会员国及观察员国统计，采用 M49 地理分区；北美洲含中美洲与加勒比。", source: source("联合国统计司 · M49 地理分区", "https://unstats.un.org/unsd/methodology/m49/") };
    market.events = market.events.filter(item => item.start <= data.continentMeta.windowEnd && item.end >= data.continentMeta.windowStart).sort((a, b) => b.start.localeCompare(a.start));
    Object.assign(data.regions[id], { market, headline: market.thesis, summary: market.summary });
    data.regions[id].badge = market.geography ? `${market.geography.total} 国` : `资料 ${data.regions[id].countryIds.length} 国`;
  }
})();
