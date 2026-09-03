import { customerById } from "../data/knowledge.js";
import type {
  AdmissionResult,
  OpportunitySignal,
  OutreachEmail,
  ProductMatchResult,
  ResearchBriefResult,
  RiskResult,
} from "../types/domain.js";

const meetingQuestions: Record<string, string[]> = {
  cencosud: [
    "Regional Commercial Decision Engine 的产品、供应商、上线国家和数据来源是什么？",
    "Costanera 暗店当前使用什么 WMS、OMS、拣货和配送编排系统？",
    "SAP、区域客户数据平台、电商和 Cenco Media 之间谁是商品、库存、订单和会员主系统？",
    "新配送中心和并购整合是否形成独立预算与项目时间表？",
    "多国家复制中税务、支付、数据驻留和运维分别由谁负责？",
  ],
  "sigma-chemist": [
    "D365 Finance、SCM、Commerce 和 POS 在各国家是否共用实例？",
    "Manhattan WMS/OMNI 当前是生产、历史遗留、POC 还是评估项目？",
    "Sigma Integration Services、Pharmx、SPS、D365 和 WMS 的数据责任边界是什么？",
    "目标国家适用的药品分类、批次、效期、召回和冷链审计要求是什么？",
    "Click & Collect、门店库存和批发库存如何统一承诺与分单？",
  ],
  loblaw: [
    "AI Mode/Gemini 交易的商品、价格、库存、订单、支付和履约分别由哪个系统提供？",
    "PC Express 是否有统一 OMS/DOM，门店、DC 和第三方配送如何计算库存承诺？",
    "自动化 DC 的 WMS、WCS、ASRS 与 SAP 接口分别由谁负责？",
    "Google Vertex AI、Shakudo、Loblaw Digital、PC Optimum 和 Loblaw Advance 的数据边界是什么？",
    "各省隐私、健康数据、营销同意和跨境运维要求如何进入供应商准入？",
  ],
};

const internalActions: Record<string, string[]> = {
  cencosud: ["售前准备区域 OMS/WMS/Open Platform 架构草图", "产品确认多国家、多币种、税务和支付能力边界", "销售核验区域平台、暗店和新 DC 的项目所有者"],
  "sigma-chemist": ["售前准备 D365/Manhattan/EDI 共存架构", "产品核验药品批次效期、召回、冷链和审计能力"],
  loblaw: ["售前准备 SAP/OCI/Google 互操作与 UCP 适配方案", "产品梳理 PC Express 履约和自动化 DC 上层编排能力", "销售通过 Groceryshop/NRF 线索核验目标角色和沟通窗口"],
};

function formatCapabilityList(productMatch: ProductMatchResult): string[] {
  return productMatch.matches
    .filter((match) => match.fit !== "low")
    .slice(0, 4)
    .map((match) => `${match.capabilityName}（匹配参考 ${match.fitScore}）`);
}

export function generateResearchBrief(
  customerId: string,
  admission: AdmissionResult,
  signals: OpportunitySignal[],
  productMatch: ProductMatchResult,
  risks: RiskResult,
  generatedEmail?: OutreachEmail,
  countryName?: string,
): ResearchBriefResult {
  const customer = customerById.get(customerId);
  if (!customer) throw new Error(`Unknown customer: ${customerId}`);
  const topCapabilities = formatCapabilityList(productMatch);
  const questions = meetingQuestions[customerId];
  const actions = internalActions[customerId];
  if (!questions || !actions) throw new Error(`Missing brief templates for customer: ${customerId}`);
  const signalTitles = signals.slice(0, 5).map((signal) => signal.title);
  const evidenceIds = [
    ...signals.flatMap((signal) => signal.evidenceIds),
    ...admission.dimensions.flatMap((dimension) => dimension.evidenceIds),
    ...productMatch.matches.flatMap((match) => match.evidenceIds),
    ...risks.risks.flatMap((risk) => risk.evidenceIds),
  ];

  return {
    customerId,
    generatedAt: new Date().toISOString(),
    executiveSummary: `${customer.name} 当前准入建议为“${admission.label}”。${customer.strategicSummary} 已核验的客户体量为 ${customer.storeCountLabel}，${customer.revenueLabel}；核心系统和采购信息仍有缺口。`,
    admission: admission.label,
    opportunitySignals: signalTitles,
    recommendedEntryPoints: topCapabilities,
    firstMeetingQuestions: [...questions],
    outreachEmail: generatedEmail ?? {
      subject: `Exploring a focused ${topCapabilities[0]?.split("（")[0] ?? "retail operations"} pilot with ${customer.name}`,
      body: [
        "Hi [Name],",
        "",
        `We have been following ${customer.name}'s recent expansion and digital initiatives ${countryName ? `in ${countryName}` : `across ${customer.countries.join(", ")}`}.`,
        `Dmall supports large retail networks with ${topCapabilities.slice(0, 3).map((item) => item.split("（")[0]).join(", ")}, designed to coexist with established core platforms.`,
        "",
        "Would a focused 30-minute discussion be useful to compare your current operating priorities and identify one measurable pilot scope?",
        "",
        "Best regards,",
        "[Name]",
      ].join("\n"),
    },
    internalActions: [...actions, ...(customerId === "sigma-chemist" ? [`销售确认${countryName || "目标市场"}的试点业务范围`] : [])],
    risksAndUnknowns: risks.risks.map((risk) => `${risk.title}：${risk.reason}`),
    nextActions: [
      "在 3 个工作日内核验目标联系人和项目所有者",
      "用首次沟通问题补齐系统、预算、决策链和部署边界",
      topCapabilities.length ? `基于 ${topCapabilities.slice(0, 2).map((item) => item.split("（")[0]).join(" + ")} 准备单一场景试点` : "优先补齐关键证据，暂不确定试点模块",
      "将新证据按事实/推断分层写回客户档案并设置复核日期",
    ],
    evidenceIds: [...new Set(evidenceIds)],
  };
}

export function createFinalNarrative(brief: ResearchBriefResult, productMatch: ProductMatchResult): string {
  const top = productMatch.matches.slice(0, 3).map((match) => match.capabilityName).join("、");
  return `${brief.executiveSummary} 建议优先围绕 ${top} 验证一个可量化试点；所有预算、采购、系统替换和合规结论均保留为待确认项。`;
}
