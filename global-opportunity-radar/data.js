(function () {
  const solutionMap = {
    store: "门店管理系统",
    pos: "POS / 智能收银",
    replenish: "库存管理 / 智能补货",
    markdown: "AI 出清 / 动态定价",
    omni: "全渠道中台",
    loyalty: "会员运营 / 用户触达",
    supply: "供应链管理 / WMS / TMS",
    insight: "数据洞察 / 经营分析"
  };

  const makeCustomer = (name, type, stores, score, signal, modules, risk = "中") => ({
    name,
    type,
    stores,
    score,
    signal,
    modules: modules.map((key) => solutionMap[key]),
    risk
  });

  const makeCountry = (config) => ({
    priority: config.score >= 84 ? "P1" : config.score >= 76 ? "P2" : "P3",
    signalCount: Math.round(config.score * 1.35),
    demand: config.score >= 84 ? "强" : config.score >= 76 ? "中高" : "中",
    entry: config.entry || "中等",
    segments: config.segments || ["商超", "便利店"],
    opportunities: config.opportunities || [
      "连锁零售持续扩张，统一门店系统的价值开始显现",
      "库存准确率与补货效率成为公开经营议题",
      "会员与全渠道体验存在可量化的升级空间"
    ],
    recommendations: config.recommendations || [
      "从 20 家门店的轻量试点切入，先验证库存与门店效率 ROI",
      "优先触达 COO、CIO 与供应链负责人，避免一开始销售全套系统",
      "用同业案例建立可信度，并提前确认本地实施伙伴与合规边界"
    ],
    pilot: config.pilot || "20 家门店 / 90 天",
    ...config
  });

  const countries = {
    philippines: makeCountry({
      id: "philippines", iso: "608", name: "菲律宾", en: "Philippines", region: "asia",
      coord: [121.8, 13.2], score: 86, entry: "中等", pipeline: "¥ 3,800 万",
      segments: ["商超", "便利店", "生鲜超市"],
      tagline: "扩店与全渠道升级信号叠加，适合从门店效率切入",
      marketBrief: "连锁零售扩张活跃，岛屿型市场对库存协同、门店运营和履约效率提出更高要求。Agent 判断当前窗口期适合以 POS 与智能补货形成首个样板。",
      opportunities: ["近 12 个月持续扩店，门店系统标准化需求增强", "招聘数字化转型与数据岗位，全渠道建设进入执行期", "库存周转与跨岛履约压力推动补货能力升级"],
      customers: [
        makeCustomer("SM Retail", "综合零售集团", "3,600+", 91, "扩店 + 数字化岗位招聘", ["store", "replenish", "omni"], "中"),
        makeCustomer("Robinsons Retail", "商超 / 药妆", "2,400+", 87, "会员升级 + 并购整合", ["loyalty", "insight", "store"], "中"),
        makeCustomer("Puregold", "大众商超", "700+", 82, "供应链效率 + 到家业务", ["pos", "replenish", "supply"], "低")
      ]
    }),
    malaysia: makeCountry({
      id: "malaysia", iso: "458", name: "马来西亚", en: "Malaysia", region: "asia",
      coord: [102.1, 4.2], score: 82, pipeline: "¥ 2,900 万",
      segments: ["药妆", "便利店", "专业零售"],
      tagline: "数字基础好、业态多元，会员和门店效率是优先切口",
      marketBrief: "零售业态成熟且多元，消费者数字化接受度较高。适合围绕会员运营、加盟管理和库存准确率建立模块化进入路径。",
      opportunities: ["便利店与药妆网络密集，门店运营标准化价值明确", "会员体系多但数据分散，统一用户触达空间较大", "多品牌、多语言环境需要灵活的中台与本地化能力"],
      customers: [
        makeCustomer("MR D.I.Y.", "专业零售", "4,000+", 88, "跨区域扩张 + 供应链复杂度", ["replenish", "supply", "insight"], "中"),
        makeCustomer("99 Speed Mart", "便利店", "2,800+", 85, "高速扩店 + 加盟管理", ["store", "pos", "replenish"], "低"),
        makeCustomer("Guardian Malaysia", "药妆", "500+", 79, "会员升级 + 全渠道", ["loyalty", "omni", "insight"], "中")
      ]
    }),
    india: makeCountry({
      id: "india", iso: "356", name: "印度", en: "India", region: "asia",
      coord: [79.1, 22.8], score: 84, entry: "高", pipeline: "¥ 5,200 万",
      segments: ["商超", "会员店", "连锁零售"],
      tagline: "规模巨大但复杂度高，先以区域试点验证复制性",
      marketBrief: "零售规模与数字化潜力突出，但区域差异、税制和本地生态提高了进入难度。建议选择单一业态与区域，建立 90 天可复制样板。",
      customers: [
        makeCustomer("Reliance Retail", "综合零售集团", "18,000+", 90, "全渠道 + 门店网络扩张", ["store", "omni", "insight"], "高"),
        makeCustomer("DMart", "大众商超", "400+", 83, "库存效率 + 稳健扩店", ["replenish", "pos", "supply"], "中"),
        makeCustomer("Spencer's Retail", "商超", "150+", 76, "门店提效 + 会员运营", ["store", "loyalty"], "中")
      ]
    }),
    japan: makeCountry({
      id: "japan", iso: "392", name: "日本", en: "Japan", region: "asia",
      coord: [138.2, 37.4], score: 77, entry: "高", pipeline: "¥ 2,100 万",
      segments: ["便利店", "药妆", "生鲜超市"],
      tagline: "成熟市场重在 AI 出清与精细运营，客单价值高",
      marketBrief: "零售数字化基础成熟，新增价值需要来自更精细的补货、损耗控制与动态定价。销售切口应聚焦可量化的单点领先能力。",
      customers: [
        makeCustomer("Life Corporation", "生鲜超市", "300+", 80, "生鲜损耗 + 自动化", ["markdown", "replenish", "insight"], "中"),
        makeCustomer("Welcia", "药妆", "2,700+", 78, "会员整合 + 门店效率", ["loyalty", "store"], "高"),
        makeCustomer("Trial Holdings", "科技零售", "300+", 75, "AI 零售 + 智能门店", ["pos", "insight", "replenish"], "中")
      ]
    }),
    uae: makeCountry({
      id: "uae", iso: "784", name: "阿联酋", en: "United Arab Emirates", region: "asia",
      coord: [54.4, 24.3], score: 78, entry: "中高", pipeline: "¥ 2,600 万",
      segments: ["大型商超", "购物中心零售", "会员店"],
      tagline: "适合作为中东样板市场，需前置解决本地化与合规",
      marketBrief: "高客单与国际化零售集团集中，具备中东区域样板价值。建议以本地伙伴协同实施，围绕全渠道与经营洞察建立试点。",
      customers: [
        makeCustomer("LuLu Retail", "大型商超", "240+", 84, "跨国扩张 + 供应链协同", ["supply", "replenish", "insight"], "中"),
        makeCustomer("Union Coop", "合作社商超", "25+", 79, "全渠道 + 会员升级", ["omni", "loyalty", "pos"], "中"),
        makeCustomer("Grandiose", "精品商超", "40+", 74, "高速扩店 + 生鲜运营", ["store", "markdown", "replenish"], "低")
      ]
    }),
    poland: makeCountry({
      id: "poland", iso: "616", name: "波兰", en: "Poland", region: "europe",
      coord: [19.1, 52.1], score: 75, entry: "中等", pipeline: "¥ 1,900 万",
      segments: ["折扣店", "便利店", "大型零售集团"],
      tagline: "中东欧枢纽价值突出，可从大型零售集团生态延展",
      marketBrief: "折扣零售和便利业态竞争活跃，连锁密度高。适合用门店效率、智能补货与数据洞察切入，并向中东欧周边市场复制。",
      customers: [
        makeCustomer("Żabka", "便利店", "10,000+", 83, "门店自动化 + 加盟网络", ["store", "replenish", "insight"], "中"),
        makeCustomer("Dino Polska", "社区商超", "2,500+", 80, "高速扩店 + 供应链", ["supply", "replenish", "pos"], "低"),
        makeCustomer("Eurocash", "批零集团", "15,000+ 网络", 74, "加盟协同 + 数据整合", ["store", "insight", "loyalty"], "高")
      ]
    }),
    germany: makeCountry({
      id: "germany", iso: "276", name: "德国", en: "Germany", region: "europe",
      coord: [10.4, 51.1], score: 79, entry: "高", pipeline: "¥ 3,400 万",
      segments: ["折扣店", "大型商超", "药妆"],
      tagline: "高价值成熟市场，供应链与门店自动化需求稳定",
      marketBrief: "客户规模大、运营成熟，对产品可靠性、数据合规和集成能力要求高。更适合以单点能力与联合创新项目进入。",
      customers: [
        makeCustomer("REWE Group", "综合零售集团", "12,000+", 85, "自动化 + 全渠道", ["omni", "replenish", "insight"], "高"),
        makeCustomer("dm-drogerie markt", "药妆", "4,000+", 81, "会员体验 + 门店效率", ["loyalty", "store", "pos"], "中"),
        makeCustomer("Globus", "大型商超", "90+", 73, "生鲜损耗 + 系统升级", ["markdown", "replenish"], "中")
      ]
    }),
    uk: makeCountry({
      id: "uk", iso: "826", name: "英国", en: "United Kingdom", region: "europe",
      coord: [-2.5, 54.2], score: 81, entry: "高", pipeline: "¥ 3,600 万",
      segments: ["大型商超", "便利店", "线上零售"],
      tagline: "全渠道成熟，AI 补货与利润优化更具说服力",
      marketBrief: "全渠道竞争和成本压力并存，客户更关注可验证的利润改善。AI 补货、出清和劳效优化可形成清晰商业案例。",
      customers: [
        makeCustomer("Co-op", "便利 / 社区零售", "2,400+", 86, "门店效率 + 供应链转型", ["store", "replenish", "insight"], "中"),
        makeCustomer("Morrisons", "大型商超", "500+", 82, "利润修复 + 全渠道", ["omni", "markdown", "supply"], "高"),
        makeCustomer("Iceland Foods", "冷冻食品零售", "900+", 78, "库存周转 + 到家业务", ["replenish", "omni", "pos"], "中")
      ]
    }),
    usa: makeCountry({
      id: "usa", iso: "840", name: "美国", en: "United States", region: "north_america",
      coord: [-99.5, 38.5], score: 88, entry: "高", pipeline: "¥ 8,600 万",
      segments: ["大型商超", "会员店", "区域连锁"],
      tagline: "商机体量最大，适合通过区域连锁与单模块建立突破口",
      marketBrief: "市场规模和客户预算突出，但竞争与系统集成复杂。Agent 建议绕开头部红海，从区域连锁的库存、劳效和会员场景建立可复制样板。",
      customers: [
        makeCustomer("H-E-B", "区域商超", "430+", 89, "门店创新 + 数字化体验", ["store", "loyalty", "insight"], "高"),
        makeCustomer("Giant Eagle", "区域商超", "470+", 84, "系统现代化 + 履约", ["omni", "replenish", "supply"], "中"),
        makeCustomer("Save Mart", "区域商超", "190+", 80, "利润优化 + 门店提效", ["markdown", "pos", "replenish"], "中")
      ]
    }),
    canada: makeCountry({
      id: "canada", iso: "124", name: "加拿大", en: "Canada", region: "north_america",
      coord: [-106, 56], score: 76, entry: "中高", pipeline: "¥ 2,200 万",
      segments: ["大型商超", "药妆", "专业零售"],
      tagline: "集中度高，适合用供应链和会员一体化打深",
      marketBrief: "大型集团主导、地理跨度大，供应链协同与统一会员体验具有价值。进入路径需要高层赞助和明确的合规方案。",
      customers: [
        makeCustomer("Empire Company", "综合零售集团", "1,500+", 82, "全渠道 + 门店现代化", ["omni", "store", "loyalty"], "高"),
        makeCustomer("Giant Tiger", "折扣零售", "260+", 77, "加盟协同 + 库存", ["replenish", "store", "insight"], "中"),
        makeCustomer("Longo's", "精品商超", "40+", 72, "生鲜运营 + 会员", ["markdown", "loyalty"], "低")
      ]
    }),
    mexico: makeCountry({
      id: "mexico", iso: "484", name: "墨西哥", en: "Mexico", region: "north_america",
      coord: [-102.4, 23.6], score: 80, entry: "中等", pipeline: "¥ 3,100 万",
      segments: ["大型商超", "便利店", "折扣店"],
      tagline: "连锁扩张与数字支付普及带来系统升级窗口",
      marketBrief: "门店网络扩张快、业态层次丰富，适合以 POS、门店管理和补货形成组合方案。需要前置适配税务、票据和支付生态。",
      customers: [
        makeCustomer("Chedraui", "大型商超", "500+", 85, "并购整合 + 系统统一", ["store", "pos", "insight"], "中"),
        makeCustomer("OXXO", "便利店", "20,000+", 83, "门店自动化 + 数据运营", ["store", "replenish", "insight"], "高"),
        makeCustomer("La Comer", "精品商超", "80+", 76, "全渠道 + 生鲜运营", ["omni", "markdown", "loyalty"], "低")
      ]
    }),
    brazil: makeCountry({
      id: "brazil", iso: "076", name: "巴西", en: "Brazil", region: "south_america",
      coord: [-52.5, -10.7], score: 83, entry: "中高", pipeline: "¥ 4,100 万",
      segments: ["大型商超", "现金批发", "药妆"],
      tagline: "拉美体量核心，现金批发与门店数字化机会突出",
      marketBrief: "区域体量最大、现金批发业态强势，客户对价格、库存和供应链效率敏感。建议以高 ROI 的补货与门店经营方案切入。",
      customers: [
        makeCustomer("Grupo Mateus", "商超 / 现金批发", "250+", 87, "扩店 + 供应链建设", ["supply", "replenish", "store"], "中"),
        makeCustomer("Assaí Atacadista", "现金批发", "290+", 84, "高速扩张 + 利润优化", ["pos", "replenish", "insight"], "中"),
        makeCustomer("DPSP Group", "药妆", "1,500+", 78, "会员 + 全渠道", ["loyalty", "omni", "insight"], "高")
      ]
    }),
    south_africa: makeCountry({
      id: "south_africa", iso: "710", name: "南非", en: "South Africa", region: "africa",
      coord: [24.7, -29.1], score: 79, entry: "中等", pipeline: "¥ 2,700 万",
      segments: ["大型商超", "折扣店", "专业零售"],
      tagline: "非洲区域总部价值高，供应链韧性是关键议题",
      marketBrief: "现代零售集中度较高，具备向非洲周边市场辐射的样板意义。供应链韧性、门店效率与价格优化是清晰切口。",
      customers: [
        makeCustomer("Shoprite", "大型商超", "3,000+", 88, "跨国网络 + 供应链韧性", ["supply", "replenish", "insight"], "中"),
        makeCustomer("Pick n Pay", "大型商超", "2,000+", 83, "利润修复 + 门店改造", ["store", "markdown", "pos"], "中"),
        makeCustomer("Dis-Chem", "药妆", "280+", 76, "会员增长 + 全渠道", ["loyalty", "omni"], "低")
      ]
    }),
    nigeria: makeCountry({
      id: "nigeria", iso: "566", name: "尼日利亚", en: "Nigeria", region: "africa",
      coord: [8.7, 9.1], score: 72, entry: "高", pipeline: "¥ 1,200 万",
      segments: ["商超", "社区零售", "购物中心零售"],
      tagline: "成长性与进入风险并存，更适合伙伴驱动的轻量试点",
      marketBrief: "人口与城市化带来长期机会，但支付、基础设施与实施复杂度较高。建议通过本地伙伴，以云端轻量模块验证市场。",
      customers: [
        makeCustomer("Market Square", "商超", "30+", 77, "区域扩店 + 门店效率", ["store", "pos", "replenish"], "中"),
        makeCustomer("FoodCo", "商超 / 娱乐零售", "20+", 72, "会员 + 经营分析", ["loyalty", "insight"], "低"),
        makeCustomer("Prince Ebeano", "社区商超", "15+", 68, "系统升级 + 库存", ["pos", "replenish"], "中")
      ]
    }),
    australia: makeCountry({
      id: "australia", iso: "036", name: "澳大利亚", en: "Australia", region: "oceania",
      coord: [134.5, -25.5], score: 80, entry: "高", pipeline: "¥ 3,000 万",
      segments: ["大型商超", "药妆", "专业零售"],
      tagline: "高成熟市场适合以 AI 补货、出清和经营分析切入",
      marketBrief: "大型零售集团数字基础成熟，劳动力与运营成本压力提升 AI 能力价值。进入必须以可量化的单点创新和安全合规为前提。",
      customers: [
        makeCustomer("Metcash", "批零集团", "1,600+ 网络", 84, "加盟协同 + 供应链", ["supply", "store", "insight"], "中"),
        makeCustomer("Chemist Warehouse", "药妆", "600+", 82, "国际扩张 + 库存效率", ["replenish", "loyalty", "pos"], "中"),
        makeCustomer("Harris Farm Markets", "生鲜超市", "30+", 74, "生鲜损耗 + 会员", ["markdown", "loyalty", "insight"], "低")
      ]
    })
  };

  const regions = {
    asia: {
      id: "asia", name: "亚洲", en: "Asia", center: [96, 26], score: 84,
      pipeline: "¥ 1.64 亿", signalCount: 486, demand: "强", entry: "中高",
      color: "#F47C61", countryIds: ["philippines", "malaysia", "india", "japan", "uae"],
      headline: "增长与数字化窗口叠加，是最值得优先投入的区域",
      summary: "便利店、商超与专业零售扩张活跃。Agent 建议把菲律宾与马来西亚作为快速样板，把印度作为中长期规模市场，把阿联酋作为中东门户。",
      opportunities: ["东南亚连锁扩店与加盟网络标准化", "库存周转、到家履约与门店劳效提升", "会员与全渠道系统进入集中升级期"]
    },
    europe: {
      id: "europe", name: "欧洲", en: "Europe", center: [13, 51], score: 78,
      pipeline: "¥ 8,900 万", signalCount: 264, demand: "中高", entry: "高",
      color: "#7BA7A2", countryIds: ["poland", "germany", "uk"],
      headline: "成熟市场需要单点领先能力，中东欧更适合快速突破",
      summary: "零售数字化成熟、合规要求高。波兰具有中东欧扩散价值；德国与英国更适合用 AI 补货、出清和经营洞察形成联合创新。",
      opportunities: ["成本压力推动自动化与利润优化", "折扣与便利业态的门店网络升级", "以波兰样板向中东欧复制"]
    },
    north_america: {
      id: "north_america", name: "北美洲", en: "North America", center: [-102, 39], score: 82,
      pipeline: "¥ 1.39 亿", signalCount: 318, demand: "强", entry: "高",
      color: "#E6B655", countryIds: ["usa", "canada", "mexico"],
      headline: "客户价值高但竞争激烈，区域连锁是更现实的进入路径",
      summary: "美国与加拿大适合从区域连锁和单点 AI 能力切入；墨西哥的扩店与系统升级信号更集中，可形成北美的第二增长曲线。",
      opportunities: ["区域连锁的系统现代化窗口", "人工与履约成本推动自动化", "墨西哥连锁扩张与支付数字化"]
    },
    south_america: {
      id: "south_america", name: "南美洲", en: "South America", center: [-60, -17], score: 77,
      pipeline: "¥ 5,200 万", signalCount: 142, demand: "中高", entry: "中高",
      color: "#78A96D", countryIds: ["brazil"],
      headline: "巴西是区域核心，先打透现金批发与大型商超",
      summary: "区域机会集中在巴西，价格、库存与供应链效率是高频经营议题。建议以高 ROI 模块切入并建立葡语实施能力。",
      opportunities: ["现金批发业态持续扩张", "价格敏感环境下的智能补货与出清", "区域集团的供应链协同"]
    },
    africa: {
      id: "africa", name: "非洲", en: "Africa", center: [20, 4], score: 72,
      pipeline: "¥ 3,900 万", signalCount: 106, demand: "中", entry: "高",
      color: "#C79667", countryIds: ["south_africa", "nigeria"],
      headline: "南非可做区域样板，其余市场以伙伴驱动的轻量方案为主",
      summary: "现代零售增长可期，但基础设施与实施复杂度差异大。南非适合建立区域总部样板，尼日利亚应采用本地伙伴与轻量试点。",
      opportunities: ["供应链韧性与跨区域协同", "城市化带来的现代零售增长", "轻量云模块替代重型项目"]
    },
    oceania: {
      id: "oceania", name: "大洋洲", en: "Oceania", center: [139, -25], score: 74,
      pipeline: "¥ 3,000 万", signalCount: 78, demand: "中高", entry: "高",
      color: "#6CA7BD", countryIds: ["australia"],
      headline: "成熟客户需要 AI 能力证明，适合高价值联合创新",
      summary: "大型客户数字基础成熟，对安全、集成与 ROI 要求高。AI 补货、出清和加盟协同具备差异化价值。",
      opportunities: ["高人工成本推动自动化", "生鲜损耗与利润优化", "批零集团的加盟网络协同"]
    }
  };

  const continentFeatures = [
    { type: "Feature", properties: { id: "north_america" }, geometry: { type: "Polygon", coordinates: [[[-168,72],[-145,70],[-125,54],[-110,49],[-96,50],[-82,45],[-62,48],[-54,60],[-74,75],[-105,82],[-145,78],[-168,72],[-166,58],[-140,54],[-130,42],[-118,32],[-106,23],[-97,16],[-86,18],[-82,26],[-74,37],[-63,46],[-82,45],[-96,50],[-110,49],[-125,54],[-145,70],[-168,72]]] } },
    { type: "Feature", properties: { id: "south_america" }, geometry: { type: "Polygon", coordinates: [[[-81,12],[-70,10],[-58,7],[-48,1],[-38,-10],[-42,-24],[-52,-35],[-64,-55],[-73,-50],[-75,-35],[-70,-20],[-80,-5],[-81,12]]] } },
    { type: "Feature", properties: { id: "europe" }, geometry: { type: "Polygon", coordinates: [[[-11,36],[2,35],[14,39],[27,41],[40,48],[35,60],[25,70],[5,71],[-10,58],[-11,36]]] } },
    { type: "Feature", properties: { id: "africa" }, geometry: { type: "Polygon", coordinates: [[[-18,36],[2,37],[18,33],[35,30],[51,12],[43,-12],[34,-28],[18,-35],[4,-30],[-7,-10],[-15,12],[-18,36]]] } },
    { type: "Feature", properties: { id: "asia" }, geometry: { type: "Polygon", coordinates: [[[28,40],[42,55],[65,72],[100,77],[140,68],[179,58],[170,42],[145,33],[125,20],[112,2],[98,7],[82,22],[69,25],[53,16],[42,28],[28,40]]] } },
    { type: "Feature", properties: { id: "oceania" }, geometry: { type: "MultiPolygon", coordinates: [[[[111,-10],[130,-8],[154,-20],[151,-39],[135,-44],[116,-34],[111,-10]]],[[[165,-34],[179,-36],[178,-48],[166,-47],[165,-34]]]] } }
  ];

  const agentSteps = ["市场雷达", "客户池", "客户画像", "商机信号", "准入评估", "证据链", "能力匹配", "风险评估", "研究 Brief"];

  Object.assign(window, {
    OPPORTUNITY_DATA: { regions, countries, solutionMap, continentFeatures, agentSteps }
  });
})();
