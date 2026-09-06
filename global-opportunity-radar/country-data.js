// National presentation layer. Does not alter the collected customer pool or Agent inputs.
(function () {
  const data = window.OPPORTUNITY_DATA;
  const source = (title, url) => ({ title, url });
  const refs = {
    chileRetail: source("CCS · 智利 2025 年超市销售", "https://www.ccs.cl/2026/02/03/ventas-supermercados-superan-us18500-millones-2025-confirman-recuperacion-moderada-consumo/"),
    peruOnline: source("CAPECE · 2024–2025 电商报告", "https://www.capece.org.pe/observatorio-ecommerce/"),
    colombiaAnnual: source("DANE · 2024 年商业年度调查", "https://www.dane.gov.co/files/operaciones/EAC/bol-EAC-2024.pdf"),
    usaBusinesses: source("Census · 2022 SUSB 零售企业统计", "https://www2.census.gov/programs-surveys/susb/tables/2022/us_state_naics_detailedsizes_2022.xlsx"),
    canadaBusinesses: source("加拿大 ISED / StatCan · 2025 零售经营网点", "https://ised-isde.canada.ca/app/ixb/cis/businesses-entreprises/44-45?wbdisable=true"),
    canadaAnnual: source("StatCan · 2024 年零售年度统计", "https://www150.statcan.gc.ca/n1/daily-quotidien/260211/dq260211b-eng.htm"),
    australiaBusinesses: source("ABS · 2026 年 6 月企业数量", "https://www.abs.gov.au/statistics/economy/business-indicators/counts-australian-businesses-including-entries-and-exits/jul2022-jun2026/8165DC01.xlsx"),
    australiaIndustry: source("ABS · 2024–25 财年零售业", "https://www.abs.gov.au/statistics/industry/industry-overview/australian-industry/2024-25/81550TSSDIVG.xlsx"),
    nzBusinesses: source("Stats NZ / Figure.NZ · 2025 零售企业", "https://figure.nz/chart/IW0xisEu03j4YW09-UsurOCrAC5B21Rax"),
    nzEmployment: source("Stats NZ / Figure.NZ · 2025 零售就业", "https://figure.nz/chart/tAQeOoJ0aDCZo3ER-Z7HnwwhTHCUh5nNh"),
    nzRetail: source("新西兰央行 / Stats NZ · 零售销售", "https://www.rbnz.govt.nz/en/statistics/series/economic-indicators/domestic-trade"),
    nzOnline: source("NZ Post · 2025 网购交易回顾", "https://www.nzpost.co.nz/about-us/media-centre/media-release/retail-spend-online-fuelled-by-strong-domestic-spending"),
    irelandBusiness: source("Eurostat · 爱尔兰 2024 零售业统计", "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_ovw_act?geo=IE&nace_r2=G47&time=2024&lang=EN&indic_sbs=ENT_NR&indic_sbs=EMP_NR&indic_sbs=NETTUR_MEUR"),
    uaeFood: source("迪拜商会 · 阿联酋 2025 食品零售", "https://www.dubaichambercommerce.com/en/w/dubai-international-chamber-showcases-growth-outlook-and-opportunities-in-local-food-sector-to-410-international-companies-during-gulfood-2026"),
    lulu2025: source("LuLu · 2025 年经营报告", "https://www.luluretail.com/media/sg3jybjo/lulu-retail-2025-mda_13022026.pdf"),
    chile: source("智利 INE · 2025 年商业活动", "https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2026/01/30/%C3%ADndice-de-actividad-del-comercio-aument%C3%B3-5-9-interanualmente-en-diciembre-de-2025"),
    argentina: source("阿根廷 INDEC · 2025 年 12 月超市调查", "https://www.indec.gob.ar/uploads/informesdeprensa/super_02_26C42BF73220.pdf"),
    brazil: source("巴西 IBGE · 2025 年零售增长 1.6%", "https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/45894-vendas-no-varejo-fecham-2025-com-alta-de-1-6"),
    brazilFood: source("ABRAS 2026 · 2025 年食品零售规模与门店数据", "https://static.abras.com.br/pdf/ranking/grandes-numeros-ranking-smartmarket-abras-2026.pdf"),
    brazilRetail: source("IBGE · PAC 2024 零售企业与经营网点", "https://sidra.ibge.gov.br/tabela/10645"),
    brazilFranchise: source("ABF · 2025 年度特许经营报告", "https://www.abf.com.br/wp-content/uploads/2026/03/Desempenho_do_Franchising_Brasileiro_4Tri_2025.pdf"),
    brazilOnline: source("IBGE · PAC 2024 零售销售渠道", "https://sidra.ibge.gov.br/tabela/10656"),
    peru: source("秘鲁 PRODUCE · 2025 年零售销售", "https://www.gob.pe/institucion/produce/noticias/1363668-ventas-de-comercio-minorista-crecieron-5-2-el-2025-y-alcanzaron-los-s-52-487-millones-por-impulso-de-campanas-online"),
    colombia: source("哥伦比亚 DANE · 2025 年 12 月零售调查", "https://www.dane.gov.co/files/operaciones/EMC/bol-EMC-dic2025.pdf"),
    usa: source("美国 Census · 2026 Q2 零售电商", "https://www.census.gov/retail/ecommerce.html"),
    canada: source("加拿大 StatCan · 2026 年 6 月零售", "https://www150.statcan.gc.ca/n1/daily-quotidien/260821/dq260821a-eng.pdf"),
    australia: source("澳大利亚 ABS · 2025 年 6 月零售", "https://www.abs.gov.au/statistics/industry/retail-and-wholesale-trade/retail-trade-australia/latest-release"),
    ireland: source("爱尔兰 CSO · 2025 年 12 月零售", "https://www.cso.ie/en/releasesandpublications/ep/p-rsi/retailsalesindexdecember2025provisionalandnovember2025final/"),
    uae: source("EZDubai · 2024 年阿联酋电商市场", "https://www.dubaisouth.ae/en/newsroom/ezdubai-uae-e-commerce-market-continues-to-grow-reaches-aed-323-billion-in-2024"),
    traders: source("Dubai DET · Dubai Traders 商家进展", "https://www.dubaidet.gov.ae/en/newsroom/press-releases/dubai-traders-new-sellers")
  };
  const signal = (type, period, title, detail, action, scope, evidence) => ({ type, period, title, detail, action, scope, source: evidence });
  const format = (name, detail) => ({ name, detail });
  const point = (title, detail) => ({ title, detail });
  const scenario = (name, scope, metric) => ({ name, scope, metric });
  const growth = (value, scope, period, evidence) => ({ label: "增长观察", value, scope, period, basis: "公开资料", source: evidence });
  const online = (value, scope, period, evidence) => ({ label: "线上销售占比", value, scope, period, basis: "公开资料", source: evidence });
  const signalPeriodKey = (period) => {
    const value = String(period || "");
    const date = value.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (date) return `${date[1]}-${date[2]}-${date[3]}`;
    const month = value.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
    if (month) return `${month[1]}-${String(month[2]).padStart(2, "0")}-31`;
    const quarter = value.match(/(\d{4})\s*Q([1-4])/i);
    if (quarter) return `${quarter[1]}-${String(Number(quarter[2]) * 3).padStart(2, "0")}-31`;
    const years = [...value.matchAll(/(?:FY)?(\d{4})/gi)].map(match => Number(match[1]));
    return years.length ? `${Math.max(...years)}-12-31` : "0000-00-00";
  };
  const cenco = data.companyProfiles.cencosud.sources;
  const sigma = data.companyProfiles.sigma.sources;
  const loblaw = data.companyProfiles.loblaw.sources;
  const profiles = {
    chile: {
      positioning: "南美集团决策入口", score: 82, verdict: "优先布局", priority: "区域总部突破",
      summary: "智利是规模适中、现代连锁基础较好的零售市场。超市、百货和家居集团拥有区域影响力，圣地亚哥兼具本国经营中心与南美总部角色，适合以单国试点争取集团复制。",
      structure: "头部连锁与社区零售并存；消费者重视价格、促销和线上便利。销售机会集中在成熟系统之间的协同，以及多品牌、线上线下的统一经营。",
      growth: growth("+1.2%", "超市销售实际增长，非全零售口径", "2025 全年", refs.chile),
      formats: [format("超市 / 大卖场", "Jumbo、Santa Isabel、Unimarc；补货与促销是高频场景。"), format("百货 / 家居", "Falabella、Paris、Easy；跨品类库存与售后更复杂。"), format("药房 / 便利", "社区高频需求，会员经营与单店效率更重要。")],
      dimensions: [[77,"基础较成熟","龙头已具备线上渠道，价值在跨系统协同。"],[70,"稳步升级","以门店改善与集团复制为主，重视存量效率。"],[78,"头部较强","本地集团与成熟软件生态抬高进入门槛。"],[52,"中等","需验证西语交付、总部授权与本地接口。"]],
      signals: [signal("消费 / 电商","2025 全年","线上增长快于超市实际销售","INE 披露零售电商现价指数全年增长 14.0%，超市实际销售增长 1.2%。两者价格口径不同。","优先交流线上订单与门店库存是否一致。","本国统计",refs.chile), signal("集团战略","CencoDay 2026","区域数据平台进入战略议程","项目收录材料提出区域商业决策引擎与客户数据平台；这是集团方向，尚未确认智利独立采购。","从总部厘清国家系统和集团平台的分工。","集团背景",cenco[1])],
      reasons: ["区域总部在本地，单次高层沟通可能连接多国业务。","项目已有 Cencosud 客户资料，进入研究与演示的准备成本较低。","市场成熟度允许围绕经营指标开展小范围试点。"],
      opportunities: [point("多品牌商品协同","统一商品、促销与门店库存视图，支撑集团运营。"),point("线上订单履约","以库存准确率和替代品流程降低取消单与人工沟通。"),point("区域样板门店","把智利试点沉淀为可复制的操作流程与数据模型。")],
      risks: [point("总部与本国预算分离","先明确谁负责试点、谁批准区域复制。"),point("已有平台集成","以接口可行性和数据质量评估确定范围。"),point("规模上限","用跨国复制价值支撑项目投入，避免只看本国门店量。")],
      scenarios: [scenario("超市全渠道库存","1 个品牌、10–20 家门店与一个线上渠道","缺货率 / 订单取消率"),scenario("集团促销协同","选择 2 类高频商品，联动总部与门店","促销执行率 / 毛利偏差"),scenario("门店任务执行","区域督导与试点店的日常任务闭环","任务完成时长 / 异常闭环率")],
      nextStep: "先约集团商业运营与 IT 团队共同交流，拿到一个品牌的库存流程图，再确定 90 天试点范围。"
    },
    argentina: {
      positioning: "价格与库存效率市场", score: 62, verdict: "选择性跟进", priority: "小步验证收益",
      summary: "阿根廷零售兼有大型连锁、折扣店和社区商户。价格敏感和经营波动使库存周转、促销准确性与现金效率成为比扩张规模更直接的经营议题。",
      structure: "布宜诺斯艾利斯及主要城市适合连锁试点。对市场增长的判断需要同时看实际销量与名义销售额，不能把价格上涨直接理解为需求扩张。",
      growth: growth("+0.5%", "超市实际销售同比；单月观察", "2025 年 12 月", refs.argentina),
      formats: [format("超市 / 折扣店", "Cencosud、Carrefour、Coto 等连锁关注成本与促销。"),format("社区食品零售","小店网络广，价格与高频补货影响消费者选择。"),format("家居 / 药房","耐用品周转与高频刚需分化，需要分别定义试点。")],
      dimensions: [[66,"头部领先","大型连锁已有线上与门店系统，中小商户差异较大。"],[48,"谨慎扩张","优先提升存量店表现，扩张假设需单独验证。"],[75,"价格竞争强","价格与促销压力压缩可分配的软件预算。"],[84,"较高","汇率、结算和需求波动影响商业方案稳定性。"]],
      signals: [signal("需求观察","2025 年 12 月","超市实际销售小幅增长","INDEC 披露超市实际销售同比增长 0.5%；这是单月超市样本，不代表所有业态全面复苏。","将试点收益锚定在损耗和库存周转。","本国统计",refs.argentina),signal("集团平台","CencoDay 2026","区域协同提供低成本进入路径","Cencosud 集团数据平台方向可作为讨论入口，但本国系统替换与预算未确认。","争取复用集团接口，降低单国交付成本。","集团背景",cenco[1])],
      reasons: ["高频调价与成本压力形成明确的运营改进场景。","既有区域集团可提供本地业务入口。","收益明确的小项目比大规模平台替换更容易讨论。"],
      opportunities: [point("价格与促销执行","减少总部价格与门店标价差异，缩短调价周期。"),point("库存现金效率","识别慢周转商品，优化补货批量与门店调拨。"),point("损耗治理","围绕临期、生鲜与盘点建立可量化改善闭环。")],
      risks: [point("汇率与结算波动","分阶段报价与验收，核对结算条件。"),point("名义增长误读","使用可比实际销量与毛利衡量收益。"),point("预算持续性","选短周期场景，避免依赖多年一次性投入。")],
      scenarios: [scenario("高频调价协同","一个区域的超市与总部价格团队","价签一致率 / 调价周期"),scenario("库存周转优化","常温食品中 2–3 个品类","周转天数 / 缺货率"),scenario("临期与损耗管理","5–10 家试点店的生鲜部门","报损率 / 清货回收额")],
      nextStep: "从财务与运营共同认可的损耗指标起步，限定本地试点成本和验收周期，再判断是否扩大投入。"
    },
    brazil: {
      asOf: "2026-09-05",
      positioning: "优先关注超市与批发零售连锁", score: 84, verdict: "重点突破", priority: "规模型机会",
      summary: "巴西零售覆盖超市、批发零售、药房和电商等多种业态。大型集团需要管理分布在不同地区的门店与仓库，常见问题包括商品缺货、库存积压、促销执行不一致，以及线上订单与门店库存不同步。",
      structure: "巴西大型集团与区域连锁并存，批发零售和折扣消费强化价格与效率竞争。",
      counts: ["1,175,862", "1,329,153", "3,297"], size: "1.1451 万亿巴西雷亚尔",
      countNote: "零售企业与经营网点采用 IBGE PAC 2024 的 CNAE 47 类别；特许经营品牌采用 ABF 2025 年度报告。",
      sizeMetric: { label: "食品零售行业营收", value: "1.1451 万亿巴西雷亚尔", period: "2025 全年 · 2026 年发布", scope: "巴西食品零售；本币巴西雷亚尔（BRL / R$）", basis: "公开资料", source: refs.brazilFood },
      growth: growth("+1.6%", "零售销售量增长，IBGE 调查口径", "2025 全年", refs.brazil),
      online: { label: "线上销售占比", value: "9.78%", scope: "20 人及以上零售企业；网络销售额占各渠道销售额合计", period: "2024 全年", basis: "公开资料", source: refs.brazilOnline },
      formats: [format("批发零售 / 食品", "Assaí、Grupo Mateus 等；整箱与单品、批量与个人消费并存。"),format("超市 / 多品牌集团","Cencosud 等区域网络；多品牌商品与门店经营协同。"),format("药房 / 美妆 / 电商","高频会员与线上履约提供独立试点机会。")],
      dimensions: [[73,"头部分层","大型集团技术投入较深，区域连锁仍有流程整合空间。"],[83,"区域复制强","多区域和多业态经营带来标准化诉求。"],[86,"竞争激烈","价格竞争与成熟本土厂商要求清晰差异化。"],[76,"较高","州际业务差异、葡语交付与系统集成增加复杂度。"]],
      signals: [signal("市场数据","2025 全年","零售销量温和增长","IBGE 披露全年零售销售量增长 1.6%，更适合用经营效率而非普遍高增长作为切入逻辑。","把补货与周转改善作为演示主线。","本国统计",refs.brazil),signal("行业活动","2026-05-18 至 05-21","APAS SHOW 提供食品零售触达入口","圣保罗 APAS SHOW 覆盖食品零售、供应链与门店技术；活动记录不能等同采购需求。","回看参展和演讲信息，筛选集团运营团队。","本国展会",source("APAS SHOW 2026 · 官方活动资料","https://apasshow.com/?page_id=107"))],
      reasons: ["市场量级与门店复制潜力较大。","批发零售和食品集团的复杂流程适合展示平台协同。","项目已收录 Cencosud、Mateus、Assaí 等业务观察入口。"],
      opportunities: [point("多业态补货","统一需求预测与补货策略，同时保留不同店型规则。"),point("仓店库存共享","减少缺货与重复库存，提升区域配送协同。"),point("促销毛利管理","把促销计划、采购与门店执行连接到毛利复盘。")],
      risks: [point("本地化成本","提前验证葡语产品、业务规则与当地交付团队。"),point("范围过大","从单一州或区域、单一业态建立样板。"),point("竞争与存量系统","强调可量化收益，先验证接口而非整体替换。")],
      scenarios: [scenario("批发零售智能补货","一个配送中心与 10–20 家关联门店","库存周转 / 货架可得率"),scenario("多品牌商品主数据","一个区域的两种店型","商品建档时长 / 数据差错率"),scenario("促销闭环","高频食品品类的完整促销周期","活动毛利 / 执行偏差")],
      nextStep: "围绕一家区域集团组织葡语场景演示，联合本地交付伙伴确认业务规则，选择一个仓店网络试点。"
    },
    peru: {
      positioning: "连锁扩张与基础协同", score: 75, verdict: "积极培育", priority: "跟随连锁成长",
      summary: "秘鲁市场中传统食品零售与现代连锁并存。利马等城市集中了主要现代零售网络，超市、折扣店和药房的标准化经营提供了数字化切入空间。",
      structure: "现代连锁与传统商户的系统成熟度差异较大。面向连锁企业，优先解决开店复制、商品数据和门店库存一致性，商业价值更容易讲清。",
      growth: growth("+5.2%", "PRODUCE 监测零售企业销售，非全体商户普查", "2025 全年", refs.peru),
      formats: [format("超市 / 折扣店","Wong、Metro、Mass、Tottus 等，店型与客群有差异。"),format("药房 / 健康零售","连锁门店对批次、库存与补货标准化需求较强。"),format("传统社区零售","分布广泛，适合通过批发与供应链伙伴连接。")],
      dimensions: [[55,"升级空间大","现代连锁具备基础系统，门店流程仍可进一步统一。"],[79,"连锁潜力较高","标准化店型具有复制空间，开店计划需逐客确认。"],[66,"业态竞争","现代连锁争夺城市高频消费，传统商户仍重要。"],[65,"中高","城市间物流与服务半径影响交付和门店覆盖。"]],
      signals: [signal("市场增长","2025 全年","监测零售销售增长 5.2%","PRODUCE 披露监测零售销售达 524.87 亿索尔，线上促销活动是推动因素之一。口径主要反映被监测零售企业。","优先讨论促销期间备货与履约波动。","本国统计",refs.peru),signal("集团网络","FY2025","Wong 与 Metro 提供多店型样本","项目从 Cencosud 年报收录秘鲁 88 家门店，其中 Wong 20 家、Metro 68 家。","选择一种店型演示统一商品与补货流程。","本国企业样本",cenco[0])],
      reasons: ["连锁标准化升级与城市消费网络相匹配。","项目已有两种超市品牌的业务资料。","基础流程改进可先落地，再逐步扩展到全渠道。"],
      opportunities: [point("新店复制","以标准商品、门店任务和补货模板缩短准备周期。"),point("促销备货","将线上促销日历联动采购、仓库与门店。"),point("药房库存协同","对非处方与日化品类建立可追踪的库存作业。")],
      risks: [point("传统零售占比","可服务连锁规模应逐客验证，勿以全国商户数推销售额。"),point("区域交付半径","优先集中城市试点，评估后再跨区域推广。"),point("预算与数据基础","分阶段清理主数据，按实际使用价值推进。")],
      scenarios: [scenario("新店开业标准化","同一城市的 5–10 家连锁门店","开店准备周期 / 首月缺货率"),scenario("超市促销补货","1 个品牌、2 个食品品类","活动缺货率 / 剩余库存"),scenario("药房日化库存","先选非处方与美妆商品","账实一致率 / 盘点工时")],
      nextStep: "先以利马城市网络为边界，选择一个店型梳理开店与补货流程，用标准化演示推动运营团队交流。"
    },
    colombia: {
      positioning: "食品连锁与折扣业态", score: 79, verdict: "优先跟进", priority: "补货与城市履约",
      summary: "哥伦比亚的超市、折扣店与社区商户共同构成食品零售网络。多城市布局和高频价格竞争使补货准确性、门店库存与促销执行成为有代表性的数字化场景。",
      structure: "波哥大、麦德林等城市可分别形成仓店集群。对集团企业应连接统一商品平台与城市级运营，避免把一个城市的履约模型直接推广到全国。",
      growth: growth("+11.3%", "实际零售销售，剔除燃油与机动车", "2025 全年", refs.colombia),
      formats: [format("超市 / 大卖场","Éxito、Jumbo、Olímpica 等，多店型、多城市运营。"),format("硬折扣 / 社区店","高频、低价和精选商品，重点是持续供货。"),format("药房 / 便利 / 电商","即时消费与线上订单带来库存共享场景。")],
      dimensions: [[62,"稳步提升","头部连锁具备线上基础，门店作业整合仍有空间。"],[81,"较活跃","销售恢复与城市网络发展支持连锁效率升级。"],[80,"价格竞争强","折扣店与超市争夺相近的高频消费篮子。"],[67,"中高","地理差异、配送和多城市组织协同影响成本。"]],
      signals: [signal("市场恢复","2025 全年","剔除燃油与汽车的实际零售增长 11.3%","DANE 零售调查显示较快增长；该指标覆盖调查企业，不是所有小商户的销售普查。","检验增长是否带来缺货与履约压力。","本国统计",refs.colombia),signal("集团网络","FY2025","134 家 Cencosud 门店提供运营样本","项目按集团年报收录本国门店网络；可作为城市级仓店协同的研究起点。","按城市和店型拆解，不把集团需求视作已确认商机。","本国企业样本",cenco[0])],
      reasons: ["较强的近期销售增长增加经营协同议题的相关性。","超市和折扣业态可共享补货、定价等底层场景。","城市集群适合先验证再复制的交付方式。"],
      opportunities: [point("折扣业态补货","精选商品下提高供货稳定性，减少高频缺货。"),point("城市仓店协同","统一城市库存可视与配送计划，降低人工调拨。"),point("线上线下促销","保持活动价格、可售库存和履约承诺一致。")],
      risks: [point("增长不均衡","按业态与城市拆分收益，避免使用全国均值承诺结果。"),point("配送成本差异","先选单城市网络，记录实际线路与服务成本。"),point("价格压力","将方案价值落在缺货和周转，控制单店成本。")],
      scenarios: [scenario("城市库存协同","一个城市、一个仓与 10 家门店","调拨时长 / 履约成本"),scenario("高频商品补货","折扣或超市的核心食品清单","断货天数 / 订货工时"),scenario("全渠道促销","一个线上渠道与相关门店","价格一致率 / 订单满足率")],
      nextStep: "从波哥大或麦德林选择一个运营集群，围绕高频商品与城市库存准备演示，再确认负责人和试点店。"
    },
    usa: {
      positioning: "成熟市场的增量效率", score: 78, verdict: "聚焦细分突破", priority: "特色食品切入",
      summary: "美国零售规模大、连锁化与电商基础成熟，食品、会员仓储、药房、便利和专业零售均有大型网络。进入机会更依赖明确的经营改善与细分业态差异化。",
      structure: "大型企业通常已有完整核心系统和服务商。以特色食品、生鲜和区域连锁为切入点，更适合展示轻量集成、门店作业与履约效率的具体收益。",
      growth: growth("+6.7%", "零售销售额同比，季调口径，含 Census 零售范围", "2026 Q2", refs.usa),
      online: online("17.1%", "零售电商占比，季调；Census 零售范围", "2026 Q2", refs.usa),
      formats: [format("食品 / 会员仓储","大众超市与仓储会员店强调价格和供应链规模。"),format("特色 / 生鲜食品","The Fresh Market、H-E-B、Giant Eagle 等业务观察入口。"),format("药房 / 便利 / 专业零售","垂直商品与服务深，适合限定商品范围验证。")],
      dimensions: [[92,"高度成熟","电商、会员和供应链系统广泛存在，需兼容现有生态。"],[69,"结构性扩张","区域连锁和细分业态仍有发展空间。"],[95,"非常激烈","成熟服务商与内部技术团队构成较强竞争。"],[77,"较高","采购、安全审查与集成验证周期较长。"]],
      signals: [signal("电商数据","2026 Q2","电商占零售 17.1%","Census 季调数据中电商同比增长 12.2%，零售总额同比增长 6.7%；电商占比为 17.1%。","聚焦线上订单增量对门店拣货与库存的影响。","本国统计",refs.usa),signal("本地网络","FY2025","特色食品网络提供细分入口","项目收录 Cencosud 美国 174 家门店，其中 The Fresh Market 173 家。该规模是集团本国网络。","以特色食品的生鲜损耗和门店履约组织演示。","本国企业样本",cenco[0])],
      reasons: ["大市场中的细分业态仍可形成足够规模。","线上增长让库存准确和门店履约保持相关性。","现有特色食品客户资料便于聚焦业务流程交流。"],
      opportunities: [point("生鲜损耗优化","连接预测、补货、临期处理与门店作业反馈。"),point("门店拣货效率","优化任务排序与缺货替代流程，降低履约人工成本。"),point("区域连锁协同","以有限接口打通区域库存与执行看板。")],
      risks: [point("成熟竞争生态","以特定指标形成差异，避免泛平台推介。"),point("安全与集成门槛","早期对齐安全审查、接口与数据使用边界。"),point("决策周期长","先确定业务赞助人与试点预算再投入定制。")],
      scenarios: [scenario("特色食品生鲜管理","5–10 家店的 1 个生鲜部门","损耗率 / 售罄率"),scenario("线上订单门店拣货","单渠道、少量试点店","每单拣货时间 / 替代成功率"),scenario("门店作业协同","区域运营团队的任务闭环","执行一致性 / 管理工时")],
      nextStep: "先与特色食品运营团队确认一个可量化痛点，完成接口与安全需求初筛，再发起窄范围试点讨论。"
    },
    canada: {
      positioning: "食品与药房一体化网络", score: 86, verdict: "重点突破", priority: "高质量集团机会",
      summary: "加拿大零售呈现食品与药房集团集中、区域网络并存的格局。会员体系、自有品牌、电商和供应链效率共同决定经营竞争力，适合围绕大型网络的运营升级切入。",
      structure: "头部客户组织成熟、已有技术合作伙伴。应以门店与供应链的增量收益对齐其战略，而不是把数字化投入直接解释为核心系统采购意向。",
      online: online("7.7%", "StatCan 零售电商占比；统计覆盖内零售商", "2026 年 6 月", refs.canada),
      formats: [format("食品 / 折扣超市","Loblaw、Empire 等集团网络，供货与促销效率重要。"),format("药房 / 健康美妆","食品与药房网络可共享会员、库存与门店作业方法。"),format("社区 / 综合折扣","Giant Tiger 等本地网络提供区域经营观察。")],
      dimensions: [[89,"成熟且持续投入","头部集团在数据、AI 与全渠道上已有较强基础。"],[83,"更新与扩张并行","开店、翻新与供应链项目共同带来作业升级议题。"],[87,"头部竞争强","集中市场与既有伙伴关系要求明确增量价值。"],[61,"中高","较长采购周期、区域支持与数据要求需提前匹配。"]],
      signals: [signal("电商数据","2026 年 6 月","零售电商占比达 7.7%","StatCan 披露当月零售电商约 57 亿加元，占零售销售 7.7%；不等同全部跨境线上消费。","交流线上高峰下的库存与履约服务水平。","本国统计",refs.canada),signal("扩张 / 翻新","2025 年报 / 2026 计划","Loblaw 门店更新形成持续运营议题","项目收录 2025 年新增 77 家店，2026 年计划新增约 70 家、翻新约 191 家。计划不等同已完成或待招标。","围绕新店标准化与翻新期间运营设计场景。","本国企业计划",loblaw[0])],
      reasons: ["食品和药房的较大网络带来可复制的经营价值。","项目已有较完整的 Loblaw 战略和技术合作资料。","门店更新与线上经营可以转化成具体流程讨论。"],
      opportunities: [point("开店与翻新协同","统一门店上线清单、商品配置与作业培训。"),point("仓店补货闭环","打通预测、库存与门店异常处理。"),point("会员与促销执行","连接会员活动、库存准备和门店落地复盘。")],
      risks: [point("已有战略伙伴","明确与现有 AI、云和核心系统的互补关系。"),point("集团决策复杂","同步业务、技术与采购，避免单点交流停滞。"),point("区域交付要求","验证双语支持和跨区域运营能力，先限定试点。")],
      scenarios: [scenario("门店更新作业平台","5–10 家翻新或新开门店的准备流程","准备周期 / 首周异常数"),scenario("食品补货协同","一个区域仓店网络的高频品类","货架可得率 / 订货工时"),scenario("药房日化全渠道","先覆盖日化与美妆商品","库存准确率 / 履约时长")],
      nextStep: "以门店更新和补货效率为双入口准备业务简报，向运营与技术团队验证已有平台边界，争取区域试点。"
    },
    australia: {
      positioning: "药房与健康零售升级", score: 85, verdict: "重点突破", priority: "药房网络协同",
      summary: "澳大利亚是连锁零售与线上购物较成熟的市场。大型食品网络、独立零售联盟和药房健康零售并存，人工效率、跨店库存和全渠道履约是清晰的经营主题。",
      structure: "项目中的 Sigma / Chemist Warehouse 样本连接门店和医药分销网络。其既有云与物流系统意味着新机会应聚焦业务协同、门店作业和非处方零售流程。",
      formats: [format("药房 / 健康美妆","Chemist Warehouse 等大型网络，SKU 丰富且门店作业密集。"),format("食品 / 独立零售联盟","大型超市与 Metcash 等供货网络并存。"),format("生鲜 / 专业零售","Harris Farm 等专业业态关注损耗与会员体验。")],
      dimensions: [[88,"高度成熟","项目客户已有云和物流系统，重点是流程互通。"],[80,"网络协同活跃","大门店网络与分销能力带来规模化运营议题。"],[86,"生态成熟","已有供应商与内部能力需要互补的业务定位。"],[59,"中等偏高","药房流程边界、集成与本地服务需前置验证。"]],
      signals: [signal("集团网络","FY2026 披露","561 家本国门店连接分销体系","项目收录 Chemist Warehouse 澳大利亚 561 家门店；属于客户样本而非全国药房总量。","从门店库存与分销补货协同寻找低耦合场景。","本国企业样本",sigma[0]),signal("历史技术基础","既有系统案例","客户已有云平台与物流系统","项目收录 Microsoft Dynamics 365 与 Manhattan 相关案例，属于历史技术背景，不代表新一轮采购。","核对现有接口，聚焦经营流程之间的协同。","集团技术背景",sigma[1])],
      reasons: ["药房健康零售兼具高频消费和复杂商品运营。","项目已具备客户网络与已知系统资料。","澳大利亚样板可为其他已收录国家提供场景参考。"],
      opportunities: [point("门店与分销补货","连接店内可售库存、订货建议与到货异常。"),point("非处方商品全渠道","先以美妆、保健与日化验证统一库存和履约。"),point("门店作业效率","减少盘点、补货与促销换挡的重复劳动。")],
      risks: [point("药品流程复杂","先限定非处方零售商品，逐项确认本地要求。"),point("既有系统深度","围绕接口与流程补强，明确责任边界。"),point("集团协同优先级","先确认当前组织的业务负责人和可用资源。")],
      scenarios: [scenario("健康美妆库存协同","10 家店与一个分销节点的日化品类","缺货率 / 到货差错率"),scenario("药房门店任务执行","盘点、上架和促销执行流程","作业工时 / 执行完成率"),scenario("线上到店履约","一个城市的非处方商品订单","备货时长 / 订单满足率")],
      nextStep: "以健康美妆的补货与门店作业搭建演示，联合业务和 IT 盘点已有系统接口，再选择澳大利亚样板门店。"
    },
    new_zealand: {
      positioning: "澳新网络的轻量复制", score: 76, verdict: "跟随集团推进", priority: "小市场做样板",
      summary: "新西兰零售规模较小，食品网络集中，社区与专业连锁也具有重要地位。全国规模限制独立投入，但紧凑的门店网络适合验证门店作业、库存与会员体验。",
      structure: "南北岛经营和配送条件不同，适合先选单城市试点。对于跨澳新的集团，可复用已有方案，同时验证本地商品、物流与运营差异。",
      formats: [format("食品超市 / 社区店","Foodstuffs、Woolworths NZ 等网络；供货与店内执行重要。"),format("药房 / 健康美妆","Chemist Warehouse 提供跨澳新经营研究样本。"),format("便利 / 专业零售","本地需求密集，单店效率比全国规模更关键。")],
      dimensions: [[79,"基础成熟","连锁线上服务较成熟，关注实际运营协同。"],[61,"适度扩张","市场容量有限，选择性开店与存量改善更合理。"],[80,"网络集中","客户数量较少，单个集团影响较大。"],[48,"中等","规模回报与跨岛物流影响项目经济性。"]],
      signals: [signal("客户网络","FY2026 披露","75 家门店提供本国样本","项目收录 Chemist Warehouse 新西兰 75 家门店。全国药房总量与本客户门店数分开呈现。","以一个城市群验证库存与门店作业协同。","本国企业样本",sigma[0]),signal("集团协同","FY2026 业务背景","跨澳新经营带来复用讨论","同一集团覆盖澳大利亚和新西兰，可用于讨论方案复用；本国采购计划尚未确认。","验证商品、订单和配送规则的本地差异。","集团背景",sigma[0])],
      reasons: ["与澳大利亚客户网络存在现成的研究关联。","单城小范围试点便于控制交付复杂度。","可作为跨国复制能力的演示样板。"],
      opportunities: [point("跨澳新流程复用","共用核心作业框架，保留本地库存和商品规则。"),point("跨店库存可视","帮助门店查询可售库存与调拨选择。"),point("紧凑网络试点","以少量门店验证收益与本地支持模式。")],
      risks: [point("市场容量有限","优先复用集团方案，控制独立开发成本。"),point("岛际与区域物流","单城市先行，单独核算跨岛服务成本。"),point("决策可能在境外","提前确认本地运营授权和集团预算归属。")],
      scenarios: [scenario("城市门店库存共享","奥克兰等单一城市的 5–10 家店","库存准确率 / 调拨时长"),scenario("药房日化补货","沿用澳洲模板的一组非处方商品","缺货率 / 人工订货时间"),scenario("跨国运营看板","澳新共同指标与本地异常处理","指标一致率 / 问题响应时长")],
      nextStep: "先确认澳新是否共用运营与技术决策链，以澳大利亚方案为基础准备本地差异清单，控制试点成本。"
    },
    ireland: {
      positioning: "英语市场与欧洲样板", score: 77, verdict: "选择性优先", priority: "小范围验证复制",
      summary: "爱尔兰市场体量较小，食品超市、便利网络和药房构成高频零售主场。英语商务环境与跨国品牌布局便于开展场景交流，适合用紧凑项目验证欧洲交付能力。",
      structure: "食品线上与非食品线上渗透差异明显。超市、便利和健康美妆应分别设计商品、库存与门店执行流程，避免套用同一电商模型。",
      growth: growth("−0.9%", "零售销量同比，剔除机动车；单月观察", "2025 年 12 月", refs.ireland),
      online: online("9.5%", "本地注册企业；剔除机动车、燃油与酒吧", "2025 年 12 月", refs.ireland),
      formats: [format("食品 / 便利网络","Musgrave、Dunnes Stores 等；生鲜与促销执行重要。"),format("药房 / 健康美妆","Chemist Warehouse 等网络提供专业零售样本。"),format("服饰 / 家居 / 电商","非食品线上消费更活跃，关注退换与库存周转。")],
      dimensions: [[81,"基础较成熟","线上与门店服务基础良好，重点是跨渠道衔接。"],[68,"选择性扩张","小市场中以品牌网络扩展与存量店升级为主。"],[83,"竞争较强","本地网络与国际品牌竞争，需细分场景切入。"],[57,"中等偏高","数据使用、跨境交付与项目体量需要平衡。"]],
      signals: [signal("消费 / 渠道","2025 年 12 月","食品与非食品线上占比存在差异","CSO 披露食品线上占比 3.5%、非食品 14.4%；统计为本地注册企业，不能代表全部跨境消费。","按食品到店与非食品全渠道分别设计履约流程。","本国统计",refs.ireland),signal("客户网络","FY2026 披露","18 家门店形成可控样本","项目收录 Chemist Warehouse 爱尔兰 18 家门店，是客户网络而非全国药房数量。","以少量店测试门店任务与日化库存流程。","本国企业样本",sigma[0])],
      reasons: ["市场紧凑，适合建立可展示的欧洲交付案例。","项目已有跨国药房客户的本地门店资料。","食品与非食品渠道差异为场景化演示提供抓手。"],
      opportunities: [point("药房日化运营","将跨国模板转化为本地门店补货与盘点流程。"),point("便利与生鲜执行","用任务管理、临期处理和补货提高门店一致性。"),point("非食品全渠道","连接线上可售库存、到店取货与退换货。")],
      risks: [point("本国体量有限","将投入与可复制价值挂钩，避免过度定制。"),point("数据与交付边界","确认数据处理方式与本地合同要求后确定部署方案。"),point("短期消费波动","用门店效率指标验证价值，避免依赖销售快速增长。")],
      scenarios: [scenario("健康美妆门店库存","3–5 家店与有限日化商品范围","库存准确率 / 盘点时长"),scenario("便利店日常执行","高频补货、临期与促销检查","缺货率 / 任务闭环率"),scenario("非食品到店取货","一个品牌和单一城市","备货时长 / 退换处理周期")],
      nextStep: "选择药房或便利的一个小范围流程，准备英语演示和本地数据处理说明，先建立可复用的欧洲样板。"
    },
    uae: {
      positioning: "海湾区域零售枢纽", score: 83, verdict: "优先布局", priority: "区域总部与全渠道",
      summary: "阿联酋零售由大卖场、社区超市、购物中心、健康美妆和线上渠道共同构成。迪拜与阿布扎比的区域总部及国际品牌网络，使其适合展示多品牌、多语言的全渠道运营。",
      structure: "本地居民、外籍人群和游客的消费需求有差异。应围绕食品高频履约和健康美妆库存建立场景，再讨论向其他海湾市场复制。",
      formats: [format("大卖场 / 社区超市","LuLu、Union Coop 等；多客群商品和促销计划较复杂。"),format("健康美妆 / 药房","国际品牌与专业网络并存，可从日化商品协同切入。"),format("购物中心 / 电商","多品牌体验与到店、到家履约并行。")],
      dimensions: [[84,"渠道发展快","线上平台与成熟连锁并行，多渠道协同价值明确。"],[86,"区域布局活跃","区域总部与国际品牌网络形成较强的业务连接。"],[88,"国际竞争强","全球服务商和本地伙伴均有较强存在感。"],[64,"中高","本地交付、数据安排和区域规则差异需单独验证。"]],
      signals: [signal("数字商业","2025-11-04","Dubai Traders 已吸引 2,400 家卖家","Dubai DET 披露项目商家入驻进展；这些是平台卖家，不是新开门店或全国公司总量。","关注商家多渠道商品与订单管理需求。","本国官方项目",refs.traders),signal("电商规模","2024 年基线","电商市场约 323 亿迪拉姆","EZDubai 与 Euromonitor 报告给出 2024 年规模；这是历史电商指标，不是当前全零售规模。","用作全渠道需求背景，另行验证具体客户流程。","本国历史指标",refs.uae)],
      reasons: ["区域总部和国际品牌密集，具备业务辐射价值。","食品、健康美妆和电商渠道可形成多种试点场景。","官方数字商业项目提供线上经营发展的观察窗口。"],
      opportunities: [point("多品牌全渠道库存","统一商品与可售库存，协调到店和到家订单。"),point("食品履约效率","在城市门店网络中改善拣货、替代品和服务承诺。"),point("区域运营模板","形成多语言、多店型的门店作业与经营看板。")],
      risks: [point("区域复制假设","阿联酋试点结果不直接代表其他海湾国家规则。"),point("伙伴与服务能力","先确认本地实施与支持资源及责任分工。"),point("样本证据有限","项目未获得 Chemist Warehouse 阿联酋单国确切门店数，需另行核实。")],
      scenarios: [scenario("城市食品全渠道","迪拜一个品牌的 5–10 家门店","履约时长 / 订单满足率"),scenario("健康美妆库存共享","日化商品、门店与线上订单","库存准确率 / 滞销占比"),scenario("多语言门店作业","英阿双语流程与区域督导看板","执行完成率 / 异常处理时长")],
      nextStep: "以迪拜或阿布扎比的单城网络做演示，优先联系本地运营与技术团队，核实门店规模后确定试点。"
    }
  };
  const dimensionLabels = [["digital","数字化成熟度"],["expansion","扩张活跃度"],["competition","竞争强度"],["risk","进入风险"]];
  const count = (label, value, unit, period, evidence) => ({ label, value, unit, period, basis: "公开资料", source: evidence, scope: `${period} · ${evidence.title}` });
  const metric = (label, value, unit, period, scope, evidence) => ({ label, value, unit, period, scope, basis: "公开资料", source: evidence });
  const officialStatistics = {
    chile: {
      counts: [count("超市经营网点", "1,357", "个", "2025.12", refs.chileRetail), count("超市营业面积", "270", "万㎡", "2025.12", refs.chileRetail)],
      sizeMetric: metric("超市年度销售额", "185.82 亿", "美元", "2025 全年", "CCS 超市行业统计", refs.chileRetail),
      online: online("8.7%", "超市线上销售额占比；CCS 引用央行数据", "2025 全年", refs.chileRetail)
    },
    argentina: {
      counts: [count("调查超市企业", "94", "家", "2025.12", refs.argentina), count("调查超市门店", "3,151", "个", "2025.12", refs.argentina), count("调查超市就业", "99,324", "人", "2025.12", refs.argentina)],
      sizeMetric: metric("超市月度销售额", "2.7961 万亿", "阿根廷比索", "2025 年 12 月", "INDEC 超市调查；现价销售额", refs.argentina),
      online: online("3.0%", "INDEC 调查超市的线上销售额占比", "2025 年 12 月", refs.argentina)
    },
    peru: {
      counts: [count("监测零售门店", "7,020", "个", "2025", refs.peru), count("线上经营商家", "335,000", "家", "2024", refs.peruOnline), count("网购消费者", "1,870", "万人", "2024", refs.peruOnline)],
      sizeMetric: metric("监测零售年销售额", "524.87 亿", "秘鲁索尔", "2025 全年", "PRODUCE 大型商场、超市及专门店统计", refs.peru),
      online: online("8.8%", "CAPECE 零售电商占比", "2024 · 2024–2025 报告", refs.peruOnline)
    },
    colombia: {
      counts: [count("调查零售企业", "3,386", "家", "2024", refs.colombiaAnnual), count("调查零售就业", "340,691", "人", "2024", refs.colombiaAnnual)],
      sizeMetric: metric("调查零售年销售额", "181.3 万亿", "哥伦比亚比索", "2024 全年", "DANE EAC：10 人及以上或年收入至少 25.2 亿比索的零售企业", refs.colombiaAnnual),
      online: online("2.6%", "DANE EAC 调查零售企业线上销售占比", "2024 全年", refs.colombiaAnnual)
    },
    usa: {
      counts: [count("有雇员零售企业", "645,404", "家", "2022", refs.usaBusinesses), count("零售经营网点", "1,045,890", "个", "2022", refs.usaBusinesses), count("零售雇员", "15,922,438", "人", "2022", refs.usaBusinesses)],
      sizeMetric: metric("季度零售销售额", "1.9865 万亿", "美元", "2026 Q2", "Census 零售销售；季调", refs.usa)
    },
    canada: {
      counts: [count("零售经营网点", "241,167", "个", "2025", refs.canadaBusinesses), count("有雇员经营网点", "134,970", "个", "2025", refs.canadaBusinesses), count("非雇主等网点", "106,197", "个", "2025", refs.canadaBusinesses)],
      sizeMetric: metric("零售年度营业收入", "8,652 亿", "加元", "2024 全年", "StatCan 年度零售贸易调查", refs.canadaAnnual),
      growth: growth("+3.0%", "零售年度营业收入同比", "2024 全年", refs.canadaAnnual)
    },
    australia: {
      counts: [count("零售企业", "156,143", "家", "2026.06", refs.australiaBusinesses), count("本年新设零售企业", "17,925", "家", "2025–26", refs.australiaBusinesses), count("零售就业", "1,493,800", "人", "2025.06", refs.australiaIndustry)],
      sizeMetric: metric("零售业年度营业收入", "6,655.63 亿", "澳元", "2024–25 财年", "ABS Australian Industry；零售业总收入", refs.australiaIndustry),
      growth: growth("+2.8%", "零售业总收入同比", "2024–25 财年", refs.australiaIndustry),
      online: online("12.7%", "零售线上销售占比；未季调", "2025 年 6 月", refs.australia)
    },
    new_zealand: {
      counts: [count("零售企业", "29,505", "家", "2025.02", refs.nzBusinesses), count("零售雇员", "222,400", "人", "2025.02", refs.nzEmployment)],
      sizeMetric: metric("季度零售销售额", "314.66 亿", "新西兰元", "2026 Q2", "Stats NZ 零售贸易销售；未含 GST", refs.nzRetail),
      growth: growth("+6.6%", "季度零售销售额同比", "2026 Q2", refs.nzRetail),
      online: metric("网购交易增长", "+6.0%", "", "2025 全年", "NZ Post 网购交易笔数同比", refs.nzOnline)
    },
    ireland: {
      counts: [count("零售企业", "24,553", "家", "2024", refs.irelandBusiness), count("零售从业人员", "254,865", "人", "2024", refs.irelandBusiness)],
      sizeMetric: metric("零售年度净营业额", "1,001.37 亿", "欧元", "2024 全年", "Eurostat SBS；NACE G47 零售业", refs.irelandBusiness)
    },
    uae: {
      counts: [count("Dubai Traders 商家", "2,400+", "家", "2025.11", refs.traders), count("LuLu 阿联酋门店", "116", "个", "2025", refs.lulu2025)],
      sizeMetric: metric("食品零售年销售额", "173 亿", "美元", "2025 全年", "迪拜商会：生鲜及包装食品零售", refs.uaeFood),
      growth: metric("LuLu 阿联酋营收增长", "+6.4%", "", "2025 全年", "LuLu 阿联酋业务营收同比", source("LuLu · 2025 综合年报", "https://www.luluretail.com/media/pqobufrm/lulu-retail_iar2025_eng.pdf")),
      online: metric("电商市场规模", "323 亿", "阿联酋迪拉姆", "2024 全年", "EZDubai / Euromonitor 电商报告", refs.uae)
    }
  };
  data.countryMeta = {
    asOf: "2026-09-05",
    countMethod: "企业、经营网点、雇员、调查样本和特许经营品牌按各项指标名称列示。数量来源于统计机构、行业协会及企业年度报告，年份见指标旁标注。",
    metricMethod: "市场规模采用公开统计值，金额保留来源货币；年度、季度和月度数据分别标注。线上销售占比及网购增长按来源中的统计对象列示。",
    scoreMethod: "国别优先分及四维评分均为演示研判，不代表成交概率。优先分综合市场空间、场景适配、现有客户入口与落地难度；四维分别独立评分，竞争和风险分越高表示挑战越大。",
    signalMethod: "信号同时区分本国统计、本国企业、集团背景与场景研判。展会和战略不等同采购意向；未核实的招聘、招标和并购不作为已发生事实展示。试点数量、周期与指标均为建议。"
  };
  data.getCountrySignalPeriodKey = signalPeriodKey;
  for (const [id, profile] of Object.entries(profiles)) {
    const country = data.countries[id];
    if (!country) throw new Error(`Country brief requires an existing country: ${id}`);
    if (officialStatistics[id]) Object.assign(profile, officialStatistics[id]);
    profile.asOf = "2026-09-05";
    profile.metrics = [profile.sizeMetric, profile.growth, profile.online];
    profile.size = `${profile.sizeMetric.value}${profile.sizeMetric.unit || ""}`;
    if (id === "brazil") profile.counts = profile.counts.map((value, index) => count(["零售企业", "零售经营网点", "特许经营品牌"][index], value, index === 0 ? "家" : "个", index === 2 ? "2025" : "2024", index === 2 ? refs.brazilFranchise : refs.brazilRetail));
    profile.dimensions = profile.dimensions.map(([score, verdict, detail], index) => ({ key: dimensionLabels[index][0], label: dimensionLabels[index][1], score, verdict, detail }));
    const primary = country.customers[0];
    profile.sample = { name: primary.name, stores: id === "uae" ? "单国门店数未单独披露" : country.storeCount, detail: "项目已收录客户样本；与全国市场总量分开统计。", source: country.sources[0] };
    profile.signals = [...profile.signals].sort((a, b) => signalPeriodKey(b.period).localeCompare(signalPeriodKey(a.period)));
    profile.watch = "后续跟踪 " + ({chile:"集团数据平台、商业运营",argentina:"价格管理、库存计划",brazil:"供应链、门店系统",peru:"新店运营、补货系统",colombia:"配送、商品运营",usa:"门店履约、生鲜计划",canada:"门店更新、供应链数据",australia:"门店运营、主数据",new_zealand:"本地运营、库存分析",ireland:"门店实施、全渠道",uae:"全渠道运营、区域 IT"}[id]) + " 等岗位与公告；当前为跟踪方向，未收录具体招聘或招标事件。";
    profile.sources = [...new Map([...profile.metrics, ...profile.counts, ...profile.signals, profile.sample].flatMap(i => i.sources || (i.source ? [i.source] : [])).map(s => [s.url,s])).values()];
    country.research = profile;
  }
})();
