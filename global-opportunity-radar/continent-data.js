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
  const markets = {
    south_america: {
      thesis: "从区域龙头切入，把单国试点复制到多国网络",
      summary: "南美零售呈现大型区域集团与本地商户并存的格局。食品超市、批发零售、药房是高频消费主场，价格敏感推动折扣业态和自有品牌发展；电商与即时履约正在改写仓店分工。",
      structure: "巴西提供规模，智利提供区域总部与集团决策入口，哥伦比亚和秘鲁提供连锁扩张空间。机会集中在多品牌商品协同、库存可视化和区域会员经营。",
      companies: "约 280 万", brands: "约 8,500", posture: "优先突破区域集团",
      formats: ["食品超市", "批发零售", "药房", "便利店", "百货与家居"],
      focus: [{ name: "巴西", reason: "规模与多业态" }, { name: "智利", reason: "区域总部决策" }, { name: "哥伦比亚 / 秘鲁", reason: "连锁与履约升级" }],
      retailers: ["Cencosud", "Carrefour Brasil", "Assaí", "Grupo Éxito", "Falabella"],
      snapshot: { value: "R$ 1.067 万亿", label: "巴西食品零售行业营收", scope: "ABRAS 2025 排名披露的 2024 年行业口径，仅代表巴西食品零售。", source: source("ABRAS · Ranking 2025", "https://www.abras.com.br/dados-ranking-2025") },
      dimensions: [
        dimension("activity", "市场活跃度", 78, "活跃", "折扣消费与线上履约共同拉动经营升级，市场对降本增效较敏感。"),
        dimension("digital", "数字化水平", 65, "分层明显", "区域龙头已有核心系统，中小连锁在库存、会员和数据协同上仍有空白。"),
        dimension("expansion", "扩张信号", 80, "多国复制", "集团扩店与业态整合带来商品、门店和供应链标准化需求。"),
        dimension("risk", "进入风险", 68, "中高", "汇率波动、跨国税务差异及本地交付能力影响项目节奏。")
      ],
      signals: [
        signal("数字化", "区域平台进入集团议程", "项目收录的 CencoDay 2026 材料提出区域商业决策引擎与客户数据平台。", "以商品与库存协同为切口，确认各国系统的统一边界。", cencosud[1]),
        signal("扩张", "多国家、多品牌网络可复制", "Cencosud 的南美经营网络覆盖项目中已收录的五个国家。", "先对接智利总部，再选择单国业务场景验证。", cencosud[0]),
        signal("经营升级", "批发零售与食品连锁是切入主场", "ABRAS 排名反映巴西食品零售规模与头部集团格局。", "优先展示补货、促销和仓店库存一体化方案。", source("ABRAS · Ranking 2025", "https://www.abras.com.br/dados-ranking-2025"))
      ],
      risks: [risk("汇率与回款", "本币收入和外币项目成本可能错配。", "分阶段交付，及早确认结算安排。"), risk("多国业务差异", "税务、促销和商品规则难以直接跨国复用。", "保留国家规则层，先复制核心流程。"), risk("存量系统与交付", "集团既有系统复杂，本地支持能力决定落地速度。", "先验证接口与本地合作伙伴。")],
      nextStep: "以智利总部为入口，在巴西或智利选择一个库存与履约场景，形成可跨国复制的试点方案。",
      events: [
        event("APAS SHOW 2026", "2026-05-18", "2026-05-21", "巴西 · 圣保罗", "食品零售 / 供应链 / 门店技术", "按超市集团与物流服务商筛选参展名单。", "https://apasshow.com/?page_id=107"),
        event("Latam Retail Show 2025", "2025-09-16", "2025-09-18", "巴西 · 圣保罗", "零售创新 / 数据 / 消费趋势", "回看集团演讲，提取区域数字化议题。", "https://www.latamretailshow.com.br/imprensa/latam-retail-show-reune-lideres-para-debater-o-papel-da-tecnologia-na-transformacao-do-varejo")
      ]
    },
    north_america: {
      thesis: "用可量化的经营收益，进入成熟零售商的升级预算",
      summary: "北美是消费规模大、连锁化程度高的成熟零售市场。美国的多业态集团、加拿大的食品与药房网络，以及墨西哥的现代零售与便利店体系，共同形成层次丰富的客户版图。",
      structure: "头部企业已有电商、会员和核心业务系统，采购重点正在转向更精准的补货、更低的履约成本和更高的会员价值。新方案需要融入现有生态，并给出清晰的投入产出。",
      companies: "约 180 万", brands: "约 1.6 万", posture: "聚焦成熟客户增量价值",
      formats: ["大型超市", "会员仓储", "药房", "便利店", "专业零售"],
      focus: [{ name: "美国", reason: "技术预算与场景规模" }, { name: "加拿大", reason: "食品药房与会员协同" }, { name: "墨西哥", reason: "便利店与现代零售" }],
      retailers: ["Walmart", "Costco", "Loblaw", "Kroger", "OXXO"],
      snapshot: { value: "$5.6 万亿", label: "美国 2026 年零售销售预测", scope: "NRF 预测同比增长 4.4%；不含汽车经销商、加油站和餐饮，并非北美全口径总量。", source: source("NRF · 2026 零售预测", "https://nrf.com/research-insights/forecasts") },
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
        event("Shoptalk Spring 2026", "2026-03-24", "2026-03-26", "美国 · 拉斯维加斯", "AI 商业 / 全渠道 / 消费体验", "从议程与参会企业识别会员、数据和履约负责人。", "https://shoptalk.com/index.php/us"),
        event("NRF 2026: Retail’s Big Show", "2026-01-11", "2026-01-13", "美国 · 纽约", "零售科技 / 门店运营 / 供应链", "回看零售商案例，建立技术伙伴与客户名单。", "https://www.retailcouncil.org/events/nrf-2026-retails-big-show/")
      ]
    },
    oceania: {
      thesis: "围绕澳新头部连锁，深耕药房与仓店协同",
      summary: "大洋洲的现代零售需求主要集中在澳大利亚和新西兰。食品超市、药房、家居与专业零售具有较强连锁特征；人口分散、配送距离长，使库存效率和供应链可靠性成为核心议题。",
      structure: "市场体量相对有限，但头部客户的业务网络和数字化基础适合形成标杆。应围绕药房、加盟网络和全渠道履约切入，重视与现有系统共存和本地服务能力。",
      companies: "约 18 万", brands: "约 2,400", posture: "深耕少数标杆客户",
      formats: ["食品超市", "连锁药房", "家居建材", "专业零售", "便利店"],
      focus: [{ name: "澳大利亚", reason: "集团总部与药房网络" }, { name: "新西兰", reason: "区域复制与仓配协同" }, { name: "太平洋岛国", reason: "分销与基础库存管理" }],
      retailers: ["Woolworths", "Coles", "Chemist Warehouse", "Bunnings", "Foodstuffs"],
      snapshot: { value: "47.04 亿澳元", label: "澳大利亚月度线上零售额", scope: "ABS 2025 年 6 月季调值；为历史单月样本，并非当前增速或全洲年销售额。", source: source("ABS · Retail Trade, June 2025", "https://www.abs.gov.au/statistics/industry/retail-and-wholesale-trade/retail-trade-australia/latest-release") },
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
        event("Online Retailer 2026", "2026-07-22", "2026-07-23", "澳大利亚 · 悉尼", "电商 / 营销 / 全渠道履约", "寻找电商运营与供应链负责人，回看履约案例。", "https://www.onlineretailer.com/en-gb/about.html"),
        event("Retail Show Australia 2025", "2025-10-03", "2025-10-05", "澳大利亚 · 墨尔本", "门店设备 / 零售技术 / 消费场景", "从展后回顾筛选门店技术伙伴与零售品牌。", "https://www.retail-show.com.au/news/class/?catid=130&myord=dtime&page=1")
      ]
    },
    europe: {
      thesis: "以门店效率为起点，在成熟市场做精细化升级",
      summary: "欧洲零售成熟且国家差异明显，食品超市、折扣店、药房与美妆连锁形成主要商业网络。西欧强调存量门店效率与全渠道体验，中东欧则兼具现代零售扩张和系统升级空间。",
      structure: "零售商更关注人工效率、鲜食损耗、库存周转和能源成本。多语言、多币种以及各国业务规则使本地化成为交付重点，适合与区域合作伙伴共同进入。",
      companies: "约 350 万", brands: "约 2.2 万", posture: "以效率场景建立标杆",
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
        event("EuroShop 2026", "2026-02-22", "2026-02-26", "德国 · 杜塞尔多夫", "零售技术 / 门店设计 / 设备", "从展商目录寻找零售商生态伙伴与门店升级议题。", "https://www.euroshop-tradefair.com/en/Visit"),
        event("NRF 2025: Retail’s Big Show Europe", "2025-09-16", "2025-09-18", "法国 · 巴黎", "统一商业 / 数据 / 供应链", "回看欧洲集团分享，识别跨国经营与全渠道方向。", "https://www.nrfbigshoweurope.com/fr-FR/campagnes/pmax-paid-acquisition-visiteur-fr")
      ]
    },
    asia: {
      thesis: "沿着连锁扩张进入，以本地化能力复制门店与供应链",
      summary: "亚洲横跨成熟零售市场与高增长的新兴市场。东亚的电商和门店数字化基础较深，东南亚与南亚的现代连锁仍有扩展空间，海湾市场则汇聚区域集团与国际品牌。",
      structure: "便利店、超市、药房和美妆是值得关注的场景。移动消费、即时零售与跨国品牌复制带来门店上线、商品管理和履约需求，但各国支付、语言与配送条件差异较大。",
      companies: "约 1,800 万", brands: "约 5.5 万", posture: "扩张驱动，分国落地",
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
        event("NRF 2026: Retail’s Big Show APAC", "2026-06-02", "2026-06-04", "新加坡 · 滨海湾金沙", "零售创新 / AI / 全渠道", "筛选东南亚零售商与区域合作伙伴。", "https://nrfbigshowapac.nrf.com/"),
        // Seamless Middle East moved to 22–24 September 2026 and is outside this snapshot window.
        event("In-store Asia 2026", "2026-05-21", "2026-05-23", "印度 · 孟买", "门店设计 / 视觉陈列 / 零售技术", "关注印度连锁门店升级与本地技术合作伙伴。", "https://www.euroshop-tradefair.com/en/media-news/news/newsticker/retail-design-in-india-finding-inspiration-at-in-store-asia-2026"),
        event("CHINASHOP 2026", "2026-04-15", "2026-04-17", "中国 · 杭州", "门店技术 / 智能设备 / 供应链", "梳理可出海的技术伙伴与零售场景。", "https://global.chinashop.cc/")
      ]
    }
  };

  data.continentMeta = {
    asOf: "2026-09-04", windowStart: "2025-09-04", windowEnd: "2026-09-04",
    countMethod: "公司数与连锁品牌数为展示量级设置的演示假设值，未进行企业名录汇总或官方统计校准。公司按零售经营主体理解（含独立商户），品牌按两家及以上门店的品牌网络理解；二者不是门店数，也不是已识别客户数。同一品牌跨洲可重复计入，禁止跨洲加总为全球去重总量。",
    scoreMethod: "四维评分为演示研判（0–100），用于表达相对特征。活跃度、数字化与扩张分数越高表示程度越高；风险分数越高表示进入风险越大。不是统计指数或已确认采购意向。",
    scopeNote: "沿用项目原有的亚洲 / 中东、欧洲、北美洲、南美洲和大洋洲五个区域。亚洲包含中东亚洲国家；北美包含中美洲与加勒比。展会按举办地归洲，仅列近 12 个月已收录的代表性活动；日期以对应届次官方资料为依据，官网可能已切换至下一届。"
  };
  for (const [id, market] of Object.entries(markets)) {
    market.events = market.events.filter(item => item.start <= data.continentMeta.windowEnd && item.end >= data.continentMeta.windowStart).sort((a, b) => b.start.localeCompare(a.start));
    Object.assign(data.regions[id], { market, headline: market.thesis, summary: market.summary });
  }
})();
