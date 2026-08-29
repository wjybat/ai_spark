import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool, AgentToolResult, AgentToolUpdateCallback } from "@earendil-works/pi-agent-core";
import {
  assessAdmission,
  assessRisks,
  buildCustomerProfile,
  buildEvidenceChain,
  detectOpportunitySignals,
  generateCustomerPool,
  generateResearchBrief,
  matchProducts,
  scanMarket,
} from "../analysis/index.js";
import type {
  AdmissionResult,
  CustomerPoolResult,
  CustomerProfileResult,
  EvidenceChainResult,
  MarketRadarResult,
  OpportunitySignal,
  ProductMatchResult,
  ResearchBriefResult,
  RiskResult,
} from "../types/domain.js";
import { PipelineWorkspace, type ToolStageDetails } from "./workspace.js";

const regionSchema = Type.Object({ regionId: Type.String({ description: "Region id from the catalog" }) });
const customerSchema = Type.Object({ customerId: Type.String({ description: "Customer id from the generated pool" }) });

function textResult<T>(stage: number, label: string, output: T): AgentToolResult<ToolStageDetails<T>> {
  return {
    content: [{ type: "text", text: JSON.stringify(output) }],
    details: { stage, label, progress: 100, output },
  };
}

async function withProgress<T>(
  stage: number,
  label: string,
  onUpdate: AgentToolUpdateCallback<ToolStageDetails<T>> | undefined,
  signal: AbortSignal | undefined,
  work: () => T,
): Promise<AgentToolResult<ToolStageDetails<T>>> {
  if (signal?.aborted) throw new Error(`${label} aborted`);
  onUpdate?.({
    content: [{ type: "text", text: `${label}：正在检索证据与结构化数据` }],
    details: { stage, label, progress: 35 },
  });
  await new Promise((resolve) => setTimeout(resolve, 90));
  if (signal?.aborted) throw new Error(`${label} aborted`);
  onUpdate?.({
    content: [{ type: "text", text: `${label}：正在生成可解释结果` }],
    details: { stage, label, progress: 75 },
  });
  const output = work();
  return textResult(stage, label, output);
}

export interface OpportunityTools {
  tools: AgentTool[];
  workspace: PipelineWorkspace;
}

export function createOpportunityTools(): OpportunityTools {
  const workspace = new PipelineWorkspace();

  const marketRadarTool: AgentTool<typeof regionSchema, ToolStageDetails<MarketRadarResult>> = {
    name: "scan_market",
    label: "市场雷达 Agent",
    description: "分析目标区域的市场吸引力、数字化需求、进入难度与证据可信度。",
    parameters: regionSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof regionSchema>, signal, onUpdate) =>
      withProgress(1, "市场雷达 Agent", onUpdate, signal, () => {
        workspace.marketRadar = scanMarket(params.regionId);
        return workspace.marketRadar;
      }),
  };

  const customerPoolTool: AgentTool<typeof regionSchema, ToolStageDetails<CustomerPoolResult>> = {
    name: "generate_customer_pool",
    label: "目标客户池 Agent",
    description: "按客户体量、数字化基础、公开信号、证据可信度与信息缺口生成客户池。",
    parameters: regionSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof regionSchema>, signal, onUpdate) =>
      withProgress(2, "目标客户池 Agent", onUpdate, signal, () => {
        workspace.customerPool = generateCustomerPool(params.regionId);
        return workspace.customerPool;
      }),
  };

  const customerProfileTool: AgentTool<typeof customerSchema, ToolStageDetails<CustomerProfileResult>> = {
    name: "build_customer_profile",
    label: "客户画像 Agent",
    description: "聚合客户规模、业态、区域、组织、数字化基础、已知系统、近期动态与待确认项。",
    parameters: customerSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof customerSchema>, signal, onUpdate) =>
      withProgress(3, "客户画像 Agent", onUpdate, signal, () => {
        workspace.customerProfile = buildCustomerProfile(params.customerId);
        return workspace.customerProfile;
      }),
  };

  const signalTool: AgentTool<typeof customerSchema, ToolStageDetails<OpportunitySignal[]>> = {
    name: "detect_opportunity_signals",
    label: "商机信号 Agent",
    description: "从扩张、数字化、系统、活动和组织证据中识别商机信号，并明确事实与推断边界。",
    parameters: customerSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof customerSchema>, signal, onUpdate) =>
      withProgress(4, "商机信号 Agent", onUpdate, signal, () => {
        workspace.opportunitySignals = detectOpportunitySignals(params.customerId);
        return workspace.opportunitySignals;
      }),
  };

  const admissionTool: AgentTool<typeof customerSchema, ToolStageDetails<AdmissionResult>> = {
    name: "assess_customer_admission",
    label: "客户准入评估 Agent",
    description: "基于体量、IT 基础、管理层理念、公开信号、预算和付费模式输出非绝对的准入建议。",
    parameters: customerSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof customerSchema>, signal, onUpdate) =>
      withProgress(5, "客户准入评估 Agent", onUpdate, signal, () => {
        const signals = workspace.opportunitySignals ?? detectOpportunitySignals(params.customerId);
        workspace.opportunitySignals = signals;
        workspace.admission = assessAdmission(params.customerId, signals);
        return workspace.admission;
      }),
  };

  const evidenceTool: AgentTool<typeof customerSchema, ToolStageDetails<EvidenceChainResult>> = {
    name: "build_evidence_chain",
    label: "证据链 Agent",
    description: "按来源、时间、事实/推断、可信等级和摘要输出完整可追溯证据链。",
    parameters: customerSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof customerSchema>, signal, onUpdate) =>
      withProgress(6, "证据链 Agent", onUpdate, signal, () => {
        workspace.evidenceChain = buildEvidenceChain(params.customerId);
        return workspace.evidenceChain;
      }),
  };

  const productTool: AgentTool<typeof customerSchema, ToolStageDetails<ProductMatchResult>> = {
    name: "match_dmall_capabilities",
    label: "Dmall 能力匹配 Agent",
    description: "根据客户画像和商机信号匹配 Dmall 能力、前置条件、证据与禁止宣称事项。",
    parameters: customerSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof customerSchema>, signal, onUpdate) =>
      withProgress(7, "Dmall 能力匹配 Agent", onUpdate, signal, () => {
        const signals = workspace.opportunitySignals ?? detectOpportunitySignals(params.customerId);
        workspace.opportunitySignals = signals;
        workspace.productMatch = matchProducts(params.customerId, signals);
        return workspace.productMatch;
      }),
  };

  const riskTool: AgentTool<typeof customerSchema, ToolStageDetails<RiskResult>> = {
    name: "assess_customer_risks",
    label: "风险与待确认项 Agent",
    description: "识别已有系统、本地化、合规、预算、决策链、实施与证据缺口风险。",
    parameters: customerSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof customerSchema>, signal, onUpdate) =>
      withProgress(8, "风险与待确认项 Agent", onUpdate, signal, () => {
        workspace.riskAssessment = assessRisks(params.customerId);
        return workspace.riskAssessment;
      }),
  };

  const briefTool: AgentTool<typeof customerSchema, ToolStageDetails<ResearchBriefResult>> = {
    name: "generate_research_brief",
    label: "客户研究 Brief Agent",
    description: "汇总准入、信号、能力匹配、风险、拜访问题、英文邮件和下一步行动。",
    parameters: customerSchema,
    executionMode: "sequential",
    execute: async (_toolCallId, params: Static<typeof customerSchema>, signal, onUpdate) =>
      withProgress(9, "客户研究 Brief Agent", onUpdate, signal, () => {
        const signals = workspace.opportunitySignals ?? detectOpportunitySignals(params.customerId);
        const admission = workspace.admission ?? assessAdmission(params.customerId, signals);
        const productMatch = workspace.productMatch ?? matchProducts(params.customerId, signals);
        const risks = workspace.riskAssessment ?? assessRisks(params.customerId);
        workspace.opportunitySignals = signals;
        workspace.admission = admission;
        workspace.productMatch = productMatch;
        workspace.riskAssessment = risks;
        workspace.researchBrief = generateResearchBrief(params.customerId, admission, signals, productMatch, risks);
        return workspace.researchBrief;
      }),
  };

  return {
    workspace,
    tools: [marketRadarTool, customerPoolTool, customerProfileTool, signalTool, admissionTool, evidenceTool, productTool, riskTool, briefTool],
  };
}
