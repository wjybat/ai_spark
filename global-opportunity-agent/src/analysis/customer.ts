import { customerById } from "../data/knowledge.js";
import { requireEvidence, searchEvidence } from "../rag/evidence-retriever.js";
import type { CustomerProfileResult, OpportunitySignal } from "../types/domain.js";

export function buildCustomerProfile(customerId: string): CustomerProfileResult {
  const customer = customerById.get(customerId);
  if (!customer) throw new Error(`Unknown customer: ${customerId}`);
  const records = requireEvidence(customerId);
  return {
    customerId,
    name: customer.name,
    headquarters: customer.headquarters,
    countries: [...customer.countries],
    formats: [...customer.formats],
    storeCountLabel: customer.storeCountLabel,
    revenueLabel: customer.revenueLabel,
    revenuePeriod: customer.revenuePeriod,
    businessAreas: [...customer.businessAreas],
    digitalFoundation: [...customer.digitalFoundation],
    knownSystems: [...customer.knownSystems],
    organization: customer.itTeamEvidence,
    recentDynamics: [...customer.expansionSignals, ...customer.managementSignals],
    decisionRoles: [...customer.knownDecisionRoles],
    unknowns: [...customer.currentUnknowns],
    evidenceIds: records.filter((record) => record.kind === "fact").map((record) => record.id),
  };
}

const signalTypeByCategory: Record<string, OpportunitySignal["type"]> = {
  expansion: "expansion",
  digital: "digital_upgrade",
  system: "integration",
  event: "event",
  organization: "hiring",
};

const directionByCategory: Record<string, string> = {
  expansion: "门店、配送中心与区域复制",
  digital: "数字商业、会员、数据与门店效率",
  system: "核心系统共存、外围集成与系统边界",
  event: "目标角色触达与议题验证",
  organization: "组织能力和项目准备度",
};

export function detectOpportunitySignals(customerId: string): OpportunitySignal[] {
  const records = searchEvidence({
    customerId,
    categories: ["expansion", "digital", "system", "event", "organization"],
    limit: 20,
  });
  return records.map((record, index) => ({
    id: `signal-${customerId}-${index + 1}`,
    type: signalTypeByCategory[record.category] ?? "system_change",
    title: record.title,
    summary: record.excerpt,
    direction: directionByCategory[record.category] ?? "客户研究",
    strength: record.confidence,
    evidenceIds: [record.id],
    interpretation:
      record.kind === "fact"
        ? "这是已核验事实，可用于判断客户背景和下一步验证方向，但不能单独证明存在采购项目。"
        : "这是基于多条事实形成的商机假设，必须由销售在客户沟通中确认。",
  }));
}
