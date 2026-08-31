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
import {
  acceptGeneratedProduct, acceptGeneratedEmail, generatedProductSchema, generatedBriefSchema,
  generationProvenance, type GenerationModel,
} from "./generated-materials.js";

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

export function createOpportunityTools(options: { mode?: "demo" | "live"; model?: GenerationModel } = {}): OpportunityTools {
  const workspace = new PipelineWorkspace();
  const live = options.mode === "live";
  const generationModel = options.model ?? {};

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
        workspace.productMatch.generation = generationProvenance("rules");
        return workspace.productMatch;
      }),
  };

  const generatedProductTool: AgentTool<typeof generatedProductSchema, ToolStageDetails<ProductMatchResult>> = {
    name: "match_dmall_capabilities",
    label: "分析客户需求与产品适配",
    description: "由你根据前序客户画像、商机信号、准入与证据链生成 analysis；本工具只校验和保存，不替你生成内容。能力目录见系统提示。为各能力给出不同的事实依据、业务假设、建议试点与约束。",
    parameters: generatedProductSchema,
    executionMode: "sequential",
    execute: async (_id, params, signal, onUpdate) => withProgress(7, "核对匹配依据与前置条件", onUpdate, signal, () => {
      if (!workspace.customerProfile || !workspace.opportunitySignals || !workspace.admission || !workspace.evidenceChain) throw new Error("Complete profile, signals, admission and evidence-chain stages first");
      workspace.productMatch = acceptGeneratedProduct(params, workspace.evidenceChain, generationModel);
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
        workspace.researchBrief.outreachEmail.generation = generationProvenance("rules");
        return workspace.researchBrief;
      }),
  };

  const generatedBriefTool: AgentTool<typeof generatedBriefSchema, ToolStageDetails<ResearchBriefResult>> = {
    name: "generate_research_brief",
    label: "撰写开发邮件与汇总客户简报",
    description: "由你生成 email 的英文主题、正文、中文写作依据与事实引用。利用前序已接受的能力匹配与风险结果，聚焦一个真实信号，不套通用产品推销模板。本工具校验邮件并组装其他 Brief 字段。",
    parameters: generatedBriefSchema,
    executionMode: "sequential",
    execute: async (_id, params, signal, onUpdate) => withProgress(9, "核对邮件内容与客户证据", onUpdate, signal, () => {
      if (!workspace.admission || !workspace.opportunitySignals || !workspace.productMatch || !workspace.riskAssessment || !workspace.evidenceChain) throw new Error("Complete all preceding stages, including LLM capability matching and risks, before writing the email");
      if (workspace.productMatch.generation?.source !== "llm") throw new Error("Live Brief requires LLM-generated capability matching");
      const email = acceptGeneratedEmail(params, workspace.evidenceChain, generationModel);
      workspace.researchBrief = generateResearchBrief(params.customerId, workspace.admission, workspace.opportunitySignals, workspace.productMatch, workspace.riskAssessment, email);
      return workspace.researchBrief;
    }),
  };

  return {
    workspace,
    tools: [marketRadarTool, customerPoolTool, customerProfileTool, signalTool, admissionTool, evidenceTool, live ? generatedProductTool : productTool, riskTool, live ? generatedBriefTool : briefTool],
  };
}
