// Shared research input for the country briefing Agent and the presentation.
// The extra companies remain read-only customer cards; all three enter national analysis.
(function () {
  const data = window.OPPORTUNITY_DATA;
  const supplements = {
    "SMU / Unimarc": ["智利食品连锁，Unimarc 为主要品牌；以社区高频消费与全国供货网络为观察切口。", "食品超市 / 社区零售 / 线上订单", "门店商品与价格统一；城市订单与门店库存联动；区域补货规则", "开店标准化与高频食品供货", "先做社区超市库存准确与促销执行，验证后复制到更多门店。", "加盟或直营责任边界、线上可售库存更新频率", "食品连锁"],
    "Falabella Retail": ["区域百货与全渠道零售品牌；项目门店数字包含智利、秘鲁和哥伦比亚，需独立拆分智利业务。", "百货 / 服饰美妆 / 家居 / 全渠道", "跨渠道商品信息；门店取货与退换；大促商品和库存同步", "区域多品牌协同与百货库存周转", "先围绕服饰美妆的门店取货、退换货和库存共享开展试点。", "国家与集团平台权限、品牌库存归属、退换货系统接口", "百货"],
    "Carrefour Argentina": ["阿根廷大型连锁零售运营商，具有多店型网络；本国网络不能与 Carrefour 全球规模混用。", "大卖场 / 超市 / 便利 / 全渠道", "多店型价格体系；线上订单与库存；总部到店的任务执行", "价格敏感市场的多店型经营效率", "优先演示高频调价、价签一致与促销毛利复盘。", "不同店型定价权限、存量系统接口、结算币种", "食品连锁"],
    "Coto": ["阿根廷本地商超网络，兼顾食品和综合商品；适合从本地经营团队的仓店效率进入。", "超市 / 综合零售 / 线上消费", "生鲜与常温库存分层；集中采购与到店验收；线上缺货替代", "本地供应链与存量门店升级", "围绕常温食品周转及生鲜临期治理设定短周期试点。", "采购与库存数据质量、区域配送范围、实际损耗基线", "食品连锁"],
    "Grupo Mateus": ["巴西商超与批发零售集团；多业态和区域网络意味着仓店协同比单店工具更有代表性。", "超市 / 批发零售 / 区域分销", "整箱与单品商品模型；区域仓店共享库存；多业态经营看板", "区域扩张下的供货与标准化", "从一个区域仓和关联门店入手，演示批量补货与缺货预警。", "州际业务规则、配送节点、葡语支持与组织授权", "批发零售"],
    "Assaí Atacadista": ["巴西批发零售品牌，商户与个人消费者并存；适合以批量交易、价格和毛利改善切入。", "现金批发 / 食品 / 日用品", "批量阶梯价；高吞吐收银与补货；门店与品类利润分析", "规模化批发零售的利润与周转", "试点高频食品的订货建议、阶梯价执行与品类利润看板。", "收银价格规则、促销权限、毛利核算口径", "批发零售"],
    "InRetail Food Retail": ["秘鲁多品牌食品零售网络，兼具不同消费定位和店型；项目 1,604 家数字为既有集团样本口径。", "超市 / 折扣店 / 多品牌食品", "多店型商品主数据；新店模板；区域补货与门店作业", "折扣与超市网络的快速复制", "选择一种店型，演示商品建档到新店首轮补货的完整流程。", "品牌间共享范围、新店流程与区域供货能力", "食品连锁"],
    "Tottus Perú": ["秘鲁大型商超与全渠道运营网络，适合用食品高频消费连接促销、会员和履约。", "超市 / 大卖场 / 食品电商", "会员促销与备货；门店拣货；商品信息和订单库存同步", "食品零售的会员促销与全渠道", "在单城门店开展促销备货和缺货替代的流程试点。", "会员数据使用边界、促销接口、到家服务半径", "食品连锁"],
    "Grupo Éxito": ["哥伦比亚多品牌食品零售集团，本国多店型网络为区域统一经营提供样本。", "超市 / 大卖场 / 多品牌零售", "跨品牌商品模型；城市履约；经营数据与门店执行反馈", "多业态协同与城市运营", "在一个城市验证仓店库存共享，再评估跨品牌复制。", "股权或组织变化对预算的影响、现有平台和本地决策链", "食品连锁"],
    "Olímpica": ["哥伦比亚商超与药房零售网络；食品及健康商品的作业差异应分别管理。", "超市 / 药房 / 社区零售", "区域补货；食品与日化库存分层；门店到货与异常闭环", "区域供应链与高频消费网络", "先对食品和非处方日化试点补货与账实一致性。", "药品流程边界、城市配送成本、批次与库存质量", "食品药房"],
    "H-E-B": ["美国区域食品零售网络，适合从食品体验、生鲜运营和数字化服务切入；美国业务与跨境布局需区分。", "食品超市 / 生鲜 / 数字化购物", "门店与线上订单协调；生鲜预测；区域履约效率", "门店体验与线上服务协同", "围绕生鲜损耗及门店拣货效率展示互补能力。", "自有技术团队职责、接口开放性、安全审查", "食品连锁"],
    "Giant Eagle": ["美国区域食品零售商，食品及配套服务构成研究范围；历史业务组合不直接代表当前网络。", "食品超市 / 健康日化 / 线上服务", "区域履约；会员促销；存量店任务和补货执行", "区域连锁的存量效率升级", "在一个城市食品网络验证库存与订单协同，先核对当前业务边界。", "资产或品牌调整、会员和订单系统边界、采购节奏", "食品连锁"],
    "Empire Company": ["加拿大食品零售集团，旗下 Sobeys 等多个品牌，官网披露食品零售与房地产业务，并展示 Voilà 线上渠道。", "Sobeys / Safeway / FreshCo / IGA / Voilà", "多品牌商品与供应链协同；线上到家运营；区域经营指标统一", "食品多品牌网络与全渠道协同", "以一组门店与线上渠道为范围，验证订单履约和缺货替代。", "品牌与集团技术授权、线上与门店库存归属、现有合作伙伴", "食品连锁"],
    "Giant Tiger": ["加拿大折扣零售网络；官网资料为其门店与经营模式提供研究入口，项目收录 260+ 门店量级。", "折扣食品 / 服饰 / 家居日用品", "低价商品补货；加盟与总部数据协同；季节商品周转", "折扣消费和门店经营协同", "以低成本补货和季节库存看板降低单店运营负担。", "加盟授权范围、单店投入回报、商品数据标准", "综合折扣"],
    "Metcash": ["澳大利亚批发分销与营销集团，服务独立零售网络；其客户网络与集团直营门店应分开理解。", "食品批发 / 酒类分销 / 五金网络", "供货商到独立门店的数据交换；订单汇总；店主可见库存", "批发与独立零售商协同", "选择食品供货网络，连接订货、到货异常与补货反馈。", "独立店主采用意愿、合同与数据权限、现有批发系统", "批发联盟"],
    "Harris Farm Markets": ["澳大利亚生鲜与食品专业零售网络，项目收录 33 家门店样本；生鲜品质与周转是适配场景。", "生鲜超市 / 食品 / 线上购物", "生鲜批次和临期；门店损耗反馈；会员商品与促销", "生鲜效率与特色食品体验", "围绕蔬果或鲜食品类，验证预测、清货和报损管理。", "非标准商品编码、称重与价格规则、客流季节性", "生鲜"],
    "Foodstuffs": ["新西兰食品零售合作社体系，服务独立经营的食品门店；南北岛组织与门店数字应区分。", "食品超市 / 社区店 / 合作社供货", "合作社与店主数据共享；区域配货；门店商品和任务模板", "独立经营与共享供应链协同", "选择单一合作社和城市集群，验证统一订货与异常处理。", "南北岛组织边界、店主自治、数据共享授权", "批发联盟"],
    "Woolworths New Zealand": ["新西兰食品零售与加盟网络，项目收录 191 家核心门店；需要区分核心网络和加盟关联店。", "食品超市 / 线上杂货 / 加盟网络", "线上和门店库存协同；门店现代化；区域补货", "食品全渠道与门店运营升级", "在单城门店演示线上订单满足率与补货效率改善。", "集团与本地系统职责、核心与加盟门店范围、配送能力", "食品连锁"],
    "Musgrave / SuperValu": ["爱尔兰食品零售及批发网络，SuperValu 为代表性品牌；项目 222 家为品牌门店样本。", "食品超市 / 便利 / 批发 / 独立店主", "总部与独立门店订货；生鲜标准作业；促销与会员执行", "独立门店网络的统一服务", "围绕生鲜补货和门店执行提供可选择采用的轻量方案。", "独立门店采用机制、品牌授权、供货系统边界", "批发联盟"],
    "Dunnes Stores": ["爱尔兰食品与百货零售网络；食品高频消费与服饰家居的周转周期不同，宜分场景分析。", "食品 / 服饰 / 家居 / 线上购物", "跨品类促销；会员与优惠执行；非食品可售库存", "食品与非食品双业态经营", "食品促销备货与非食品到店取货分别设定试点指标。", "品类之间系统差异、优惠核销、退换货责任边界", "百货"],
    "LuLu Retail": ["海湾多国大型食品零售集团，阿联酋为重点市场；项目 277 家为泛海湾网络，不能作为阿联酋单国数量。", "大卖场 / 超市 / 社区店 / 全渠道", "多国采购与商品；城市仓店补货；多语言运营与线上订单", "区域总部网络与本地履约", "在阿联酋单城试点食品补货、拣货和区域经营看板。", "国家和总部预算、各国商品规则、本国门店范围", "食品连锁"],
    "Union Coop": ["阿联酋合作社商超网络，区域食品零售、会员与线上服务构成业务研究入口。", "食品商超 / 社区店 / 线上服务", "会员促销与库存；社区订单履约；门店服务一致性", "本地会员与食品全渠道升级", "以会员促销备货和社区门店到家订单连接场景演示。", "会员数据使用授权、本地合作伙伴、线上履约系统", "食品连锁"]
  };
  const commonRoles = ["运营负责人 / COO", "信息技术负责人 / CIO", "供应链负责人", "商品与数字渠道负责人"];
  for (const country of Object.values(data.countries)) {
    const r = country.research;
    r.companies = country.customers.map((card, index) => {
      const id = index === 0 ? country.companyId : `${country.id}-candidate-${index}`;
      const group = index === 0 ? Object.values(data.companyProfiles).find(p => p.id === country.companyId) : null;
      const extra = supplements[card.name];
      const evidence = (suffix, kind, scope, text, source) => ({ id:`C${index+1}-${suffix}`, companyId:id, kind, scope, text, ...(source ? {source:{title:source.title,url:source.url}} : {}) });
      if (group) return {
        id, name: card.name, role: "深度研究客户", countryId:country.id,
        summary: `${group.type}；在${country.name}的项目样本：${r.sample.stores}。${group.strategicSummary}`,
        footprint: r.sample.stores, footprintScope: country.id === "uae" ? "本国未单独披露" : "本国客户网络",
        financial: `${group.revenue}；集团口径，不代表${country.name}收入。`,
        business: group.businessAreas, digital: group.digitalFoundation, systems: group.knownSystems,
        organization: group.organization, roles: group.decisionRoles, signals: group.recentDynamics,
        opportunity: `${r.scenarios[0].name}；${group.strategicSummary}`, risks: group.unknowns,
        evidence: [...group.sources.map((s,i) => evidence(`source-${i+1}`,"fact","集团资料",s.excerpt,s)), evidence("local","fact","本国项目样本",`${card.name}：${r.sample.stores}。`,group.sources[0]), evidence("scenario","inference","本国场景研判",`${r.positioning}：${r.scenarios[0].name}，建议观察${r.scenarios[0].metric}。`)]
      };
      if (!extra) throw new Error(`Missing country research supplement: ${card.name}`);
      const [summary,business,digital,theme,opportunity,unknowns,archetype] = extra;
      const source = {title:card.sourceTitle,url:card.sourceUrl};
      return {
        id, name:card.name, role:"综合研究样本", countryId:country.id, summary,
        footprint:card.stores, footprintScope:"项目既有样本，品牌 / 集团 / 区域范围见文字；未作本国总量推算",
        financial:"演示经营判断：以单店效率、周转和履约成本评估价值；本国收入与预算尚未收录，不预设金额。",
        business:business.split(" / "), digital:digital.split("；").map(t=>`${t}（场景研判）`),
        systems:["核心商品 / 收银 / 库存系统是演示流程假设，具体供应商、版本和部署未确认", "不把已有官网或线上服务解释为系统替换计划"],
        organization:`${archetype}经营模式；演示沟通角色由业务、技术和供应链共同构成，具体组织与人名待确认。`,
        roles:commonRoles, signals:[`${theme}（业务观察与演示研判，非已公告项目）`, `${card.signal}（项目已有跟踪方向，时间与项目状态待确认）`],
        opportunity, risks:[...unknowns.split("、"),"本国采购预算、试点负责人及时间表未确认"],
        evidence:[evidence("profile","fact","项目收录的企业 / 业态",`${card.name}：${card.type}。官方资料提供企业与业务研究入口。`,source), evidence("footprint","inference","既有规模线索",`${card.stores}；原始品牌与地域口径需复核，不能直接用于国家总量。`), evidence("digital","inference","演示业务假设",digital), evidence("opportunity","inference","建议场景",opportunity), evidence("risk","inference","待验证事项",unknowns)]
      };
    });
    const companies = r.companies;
    const firstEvidence = c => c.evidence[0].id;
    r.managementDraft = {
      title:`${country.name}管理层简报`, executiveSummary:`${r.summary} 综合 ${companies.map(c=>c.name).join("、")} 三家样本，建议${r.verdict}，以${r.priority}为推进方向。三家样本用于交叉分析，不代表全国零售企业全体。`,
      regionalPriority:{level:r.verdict,score:r.score,rationale:`${r.positioning}。${r.reasons.join(" ")} 本优先分为演示研判。`},
      opportunityLogic:`共同切口是可量化的门店、库存与履约改善；差异在于：${companies.map(c=>`${c.name}适合${c.opportunity}`).join("；")}`,
      companyAssessments:companies.map((c,i)=>({companyId:c.id,role:c.role,opportunity:c.opportunity,risk:c.risks.join("；"),recommendedAction:`先与${c.roles[0]}及技术团队开展需求澄清，验证${i===0?r.scenarios[0].name:c.opportunity}，并确认试点边界与指标。`,evidenceIds:[firstEvidence(c),c.evidence.find(e=>e.kind==="inference").id]})),
      keySignals:companies.map(c=>({title:`${c.name} · 经营切口`,detail:`${c.summary} ${c.opportunity}`,companyIds:[c.id],evidenceIds:[firstEvidence(c)],basis:"研判"})),
      risks:r.risks.map(p=>({title:p.title,detail:p.detail,mitigation:"分别确认三家样本的业务边界与试点前提，再形成投入计划。",companyIds:companies.map(c=>c.id),evidenceIds:companies.map(firstEvidence)})),
      nextActions:[{horizon:"第 1–2 周",owner:"区域 BD / 行业顾问",action:"分别核对三家公司的本国门店、组织、既有系统与当前经营重点。",deliverable:"三家企业差异对比与信息缺口清单"},{horizon:"第 3–4 周",owner:"方案与交付团队",action:r.nextStep,deliverable:"一个共同演示主题与三套企业场景参数"},{horizon:"第 5–8 周",owner:"区域负责人",action:"按意愿、资源和数据可得性选择试点对象；其余两家保持独立跟进。",deliverable:"试点范围、指标基线与阶段验收方案"}],
      confidence:{level:"中",rationale:"市场和主要客户具备项目资料；另外两家已补充企业、业态与场景信息，系统、采购和预算仍以假设或待确认呈现。",gaps:["三家企业本国口径的收入和可服务门店范围","现有系统接口、版本与技术授权","采购意愿、预算与试点负责人"]}
    };
  }
})();
