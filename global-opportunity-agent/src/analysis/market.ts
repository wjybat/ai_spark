import { customerById, regionById } from "../data/knowledge.js";
import { searchEvidence } from "../rag/evidence-retriever.js";
import type { CustomerPoolResult, MarketRadarResult } from "../types/domain.js";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizedScale(revenueUsd: number, storeCount: number): number {
  const revenue = Math.min(100, Math.max(30, Math.log10(Math.max(1, revenueUsd)) * 10));
  const stores = Math.min(100, 30 + Math.log10(Math.max(1, storeCount)) * 20);
  return (revenue + stores) / 2;
}

export function scanMarket(regionId: string): MarketRadarResult {
  const region = regionById.get(regionId);
  if (!region) throw new Error(`Unknown region: ${regionId}`);
  const records = searchEvidence(regionId === "global" ? { limit: 100 } : { regionId, limit: 100 });
  const customerCount = region.customerIds.length;
  const score = clampScore(
    region.marketAttractiveness * 0.34
      + region.digitalDemand * 0.28
      + region.evidenceConfidence * 0.23
      + (100 - region.entryFriction) * 0.15,
  );
  const heat = score >= 82 ? "high" : score >= 70 ? "medium" : "watch";

  return {
    regionId: region.id,
    regionName: region.name,
    opportunityScore: score,
    heat,
    summary: region.marketSummary,
    dimensions: [
      { name: "市场吸引力", score: region.marketAttractiveness, explanation: `目标客户体量与覆盖范围支持 ${region.name} 的市场价值。` },
      { name: "数字化需求", score: region.digitalDemand, explanation: "公开资料存在电商、平台化、自动化、会员或供应链升级信号。" },
      { name: "证据可信度", score: region.evidenceConfidence, explanation: "主要事实来自公司年报、官方公告和官方供应商案例。" },
      { name: "进入可行性", score: 100 - region.entryFriction, explanation: `需处理 ${region.regulationNotes.join("、")}。` },
    ],
    recommendedCountries: [...region.countries],
    customerCount,
    evidenceIds: records.map((record) => record.id),
    caveat: "机会热度用于辅助排序，不替代销售、售前、法务或当地合规顾问的最终判断。",
  };
}

export function generateCustomerPool(regionId: string): CustomerPoolResult {
  const region = regionById.get(regionId);
  if (!region) throw new Error(`Unknown region: ${regionId}`);

  const ranked = region.customerIds
    .map((customerId) => {
      const customer = customerById.get(customerId);
      if (!customer) throw new Error(`Region references unknown customer: ${customerId}`);
      const records = searchEvidence({ customerId, limit: 100 });
      const facts = records.filter((record) => record.kind === "fact");
      const sourceA = facts.filter((record) => record.sourceLevel === "A").length;
      const scale = normalizedScale(customer.revenueUsd, customer.storeCount);
      const digital = Math.min(100, 52 + customer.digitalFoundation.length * 9);
      const signal = Math.min(100, 45 + customer.expansionSignals.length * 11 + customer.managementSignals.length * 7);
      const confidence = Math.min(100, 55 + sourceA * 8);
      const unknownPenalty = Math.min(18, customer.currentUnknowns.length * 2);
      const poolScore = clampScore(scale * 0.27 + digital * 0.25 + signal * 0.25 + confidence * 0.23 - unknownPenalty);
      return {
        customerId,
        name: customer.name,
        country: customer.headquarters,
        formats: [...customer.formats],
        storeCountLabel: customer.storeCountLabel,
        revenueLabel: customer.revenueLabel,
        digitalFoundation: [...customer.digitalFoundation],
        poolScore,
        reason: customer.strategicSummary,
        unknownCount: customer.currentUnknowns.length,
      };
    })
    .sort((a, b) => b.poolScore - a.poolScore);

  return {
    regionId,
    generatedAt: new Date().toISOString(),
    customers: ranked,
    rankingBasis: ["客户体量", "数字化基础", "扩张与管理层信号", "证据可信度", "信息缺口扣分"],
  };
}
