import { capabilities, customerById } from "../data/knowledge.js";
import { requireEvidence, searchEvidence } from "../rag/evidence-retriever.js";
import type {
  AdmissionDimension,
  AdmissionLabel,
  AdmissionResult,
  EvidenceChainResult,
  OpportunitySignal,
  ProductMatchResult,
  RiskItem,
  RiskResult,
} from "../types/domain.js";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function labelForScore(score: number, unknownCount: number): AdmissionLabel {
  if (unknownCount >= 7 && score >= 72) return "可跟进";
  if (unknownCount >= 7) return "观察中";
  if (score >= 84) return "高潜";
  if (score >= 72) return "可跟进";
  if (score >= 58) return "观察中";
  if (score >= 42) return "风险较高";
  return "暂不建议优先投入";
}

export function assessAdmission(customerId: string, signals: OpportunitySignal[]): AdmissionResult {
  const customer = customerById.get(customerId);
  if (!customer) throw new Error(`Unknown customer: ${customerId}`);
  const records = requireEvidence(customerId);
  const factIds = records.filter((record) => record.kind === "fact").map((record) => record.id);
  const dimensions: AdmissionDimension[] = [
    {
      name: "客户体量",
      status: customer.storeCount >= 500 && customer.revenueUsd >= 1_000_000_000 ? "positive" : "neutral",
      explanation: `${customer.storeCountLabel}；${customer.revenueLabel}（${customer.revenuePeriod}）。`,
      evidenceIds: factIds.slice(0, 2),
    },
    {
      name: "IT 与数字化基础",
      status: customer.knownSystems.length >= 2 ? "positive" : "unknown",
      explanation: `已确认 ${customer.knownSystems.join("、")}；说明客户具备集成基础，也意味着替换核心系统阻力较高。`,
      evidenceIds: records.filter((record) => record.category === "system" && record.kind === "fact").map((record) => record.id),
    },
    {
      name: "管理层理念",
      status: customer.managementSignals.length > 0 ? "positive" : "unknown",
      explanation: customer.managementSignals.join("；"),
      evidenceIds: records.filter((record) => record.category === "digital").map((record) => record.id),
    },
    {
      name: "公开商机信号",
      status: signals.length >= 2 ? "positive" : "neutral",
      explanation: `识别到 ${signals.length} 条扩张、数字化、系统或活动信号；信号只证明研究价值，不证明采购。`,
      evidenceIds: signals.flatMap((signal) => signal.evidenceIds),
    },
    {
      name: "预算适配",
      status: "unknown",
      explanation: "公开资料未披露具体项目预算、采购方式或合同周期，必须由销售确认。",
      evidenceIds: [],
    },
    {
      name: "付费与部署模式",
      status: "unknown",
      explanation: "标准 SaaS、实施费、私有化、数据驻留和跨境运维要求尚未确认。",
      evidenceIds: [],
    },
  ];
  const positives = dimensions.filter((dimension) => dimension.status === "positive").length;
  const risks = dimensions.filter((dimension) => dimension.status === "risk").length;
  const unknowns = dimensions.filter((dimension) => dimension.status === "unknown").length + customer.currentUnknowns.length;
  const sourceA = records.filter((record) => record.sourceLevel === "A" && record.kind === "fact").length;
  const referenceScore = clamp(50 + positives * 10 + Math.min(18, sourceA * 3) - risks * 12 - Math.min(12, unknowns));
  const label = labelForScore(referenceScore, unknowns);

  return {
    customerId,
    label,
    referenceScore,
    dimensions,
    rationale: `${customer.name} 具备显著客户体量、数字化基础和公开升级信号，值得继续投入研究；但已有核心系统、预算、决策链和部署模式仍需人工确认。`,
    mustConfirm: [...customer.currentUnknowns, "项目预算与采购时间", "付费模式和部署边界"],
    disclaimer: "准入标签和参考分仅用于统一信息整理与优先级讨论，不代表成交概率，也不应作为自动排除客户的唯一依据。",
  };
}

export function buildEvidenceChain(customerId: string): EvidenceChainResult {
  const records = requireEvidence(customerId).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const byLevel = (level: "A" | "B" | "C") => records.filter((record) => record.sourceLevel === level).length;
  const customer = customerById.get(customerId);
  if (!customer) throw new Error(`Unknown customer: ${customerId}`);
  return {
    customerId,
    records,
    coverage: {
      facts: records.filter((record) => record.kind === "fact").length,
      inferences: records.filter((record) => record.kind === "inference").length,
      sourceLevelA: byLevel("A"),
      sourceLevelB: byLevel("B"),
      sourceLevelC: byLevel("C"),
      latestPublishedAt: records[0]?.publishedAt ?? "unknown",
    },
    missingEvidence: [...customer.currentUnknowns],
  };
}

const fitMatrix: Record<string, Record<string, number>> = {
  cencosud: { "open-platform": 95, "oms-fulfilment": 93, "wms-replenishment": 88, "data-cloud": 82, "store-pos": 74 },
  "sigma-chemist": { "wms-replenishment": 94, "oms-fulfilment": 92, "open-platform": 89, "store-pos": 77, "data-cloud": 70 },
  loblaw: { "open-platform": 96, "oms-fulfilment": 93, "wms-replenishment": 86, "data-cloud": 84, "store-pos": 66 },
};

export function matchProducts(customerId: string, signals: OpportunitySignal[]): ProductMatchResult {
  const customer = customerById.get(customerId);
  if (!customer) throw new Error(`Unknown customer: ${customerId}`);
  const records = requireEvidence(customerId);
  const matrix = fitMatrix[customerId];
  if (!matrix) throw new Error(`Missing fit matrix for customer: ${customerId}`);

  const matches = capabilities
    .map((capability) => {
      const fitScore = matrix[capability.id] ?? 50;
      const relevant = searchEvidence({
        customerId,
        query: [...capability.targetSignals, ...capability.targetScenarios].join(" "),
        limit: 4,
      });
      const signalReasons = signals
        .filter((signal) => signal.summary.includes("系统") || signal.summary.includes("库存") || signal.summary.includes("电商") || signal.summary.includes("平台"))
        .slice(0, 2)
        .map((signal) => signal.summary);
      return {
        capabilityId: capability.id,
        capabilityName: capability.name,
        fitScore,
        fit: fitScore >= 85 ? "high" as const : fitScore >= 70 ? "medium" as const : "low" as const,
        reasons: [customer.strategicSummary, ...signalReasons].slice(0, 3),
        prerequisites: [...capability.prerequisites],
        evidenceIds: relevant.map((record) => record.id),
        caution: capability.avoidClaims[0] ?? "需要销售和产品团队确认当前版本与交付边界。",
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return {
    customerId,
    matches,
    positioning: customer.strategicSummary,
    avoidClaims: [...new Set(capabilities.flatMap((capability) => capability.avoidClaims))].filter((claim) => {
      const lower = claim.toLowerCase();
      return customer.knownSystems.some((system) => lower.includes(system.split(" ")[0]?.toLowerCase() ?? "")) || claim.includes("采购流程");
    }),
  };
}

const localizedRisk: Record<string, Array<Omit<RiskItem, "id" | "evidenceIds">>> = {
  cencosud: [
    { type: "existing_system", level: "high", title: "SAP 与区域平台边界", reason: "客户已有 SAP、区域平台和本地系统，核心替换主张风险高。", mitigation: "定位为外围 OMS/WMS、库存服务和 Open Platform；先确认主数据与系统边界。", requiresHumanConfirmation: true },
    { type: "localization", level: "high", title: "多国家本地化", reason: "覆盖多国、多币种、多语言、税务和支付规则。", mitigation: "按国家拆分交付范围，以单一场景试点后复制。", requiresHumanConfirmation: true },
  ],
  "sigma-chemist": [
    { type: "existing_system", level: "high", title: "D365 与 Manhattan 共存", reason: "现有核心平台和 WMS 状态尚未完全确认。", mitigation: "先做系统地图和数据责任矩阵，避免直接替换。", requiresHumanConfirmation: true },
    { type: "data_compliance", level: "high", title: "药品和健康合规", reason: "涉及批次、效期、召回、温控、受控药品和健康数据。", mitigation: "由产品、法务与当地药房专家共同确认能力缺口和审计要求。", requiresHumanConfirmation: true },
  ],
  loblaw: [
    { type: "existing_system", level: "high", title: "SAP/OCI/Google 与内部团队并行", reason: "客户已有成熟核心平台、AI 合作与内部数字团队。", mitigation: "以互操作、履约编排和可量化单点能力切入，不主张平台替换。", requiresHumanConfirmation: true },
    { type: "data_compliance", level: "high", title: "加拿大省级隐私和健康数据", reason: "会员、营销、处方和健康数据需要分域与审计。", mitigation: "按省份和数据域确认驻留、同意、访问与跨境运维要求。", requiresHumanConfirmation: true },
  ],
};

export function assessRisks(customerId: string): RiskResult {
  const customer = customerById.get(customerId);
  if (!customer) throw new Error(`Unknown customer: ${customerId}`);
  const records = requireEvidence(customerId);
  const factIds = records.filter((record) => record.kind === "fact").map((record) => record.id);
  const custom = localizedRisk[customerId] ?? [];
  const risks: RiskItem[] = custom.map((risk, index) => ({
    ...risk,
    id: `risk-${customerId}-${index + 1}`,
    evidenceIds: factIds.slice(index, index + 2),
  }));
  risks.push(
    {
      id: `risk-${customerId}-budget`, type: "budget", level: "medium", title: "预算与采购节奏未知",
      reason: "公开资料无法证明具体预算、RFP、决策链或合同周期。", mitigation: "首次沟通中确认项目所有者、预算来源、采购门槛和期望上线时间。", requiresHumanConfirmation: true, evidenceIds: [],
    },
    {
      id: `risk-${customerId}-evidence`, type: "evidence_gap", level: "medium", title: "关键系统信息缺口",
      reason: customer.currentUnknowns.join("；"), mitigation: "将信息缺口转化为客户会议问题，并设置证据复核日期。", requiresHumanConfirmation: true, evidenceIds: records.filter((record) => record.kind === "inference").map((record) => record.id),
    },
  );
  const overall = risks.some((risk) => risk.level === "high") ? "high" : risks.some((risk) => risk.level === "medium") ? "medium" : "low";
  return {
    customerId,
    overall,
    risks,
    pendingConfirmations: [...customer.currentUnknowns, "预算与采购周期", "决策链和项目所有者", "数据与部署边界"],
  };
}
