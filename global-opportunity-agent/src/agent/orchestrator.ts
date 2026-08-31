import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxThinking,
  fauxToolCall,
} from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { Agent, type AgentEvent } from "@earendil-works/pi-agent-core";
import { createFinalNarrative } from "../analysis/index.js";
import { config, resolveMode, type RequestedAgentMode } from "../config.js";
import type { PipelineEvent, PipelineOutput } from "../types/domain.js";
import { createOpportunityTools } from "./tools.js";
import { materialGenerationInstructions } from "./generated-materials.js";
import { dmallRouterProvider, DMALL_ROUTER_PROVIDER_ID } from "./dmall-router-provider.js";

export interface PipelineRequest {
  runId: string;
  regionId: string;
  customerId: string;
  mode?: RequestedAgentMode;
}

export type PipelineEventSink = (event: Omit<PipelineEvent, "id">) => void | Promise<void>;

const toolOrder = [
  "scan_market",
  "generate_customer_pool",
  "build_customer_profile",
  "detect_opportunity_signals",
  "assess_customer_admission",
  "build_evidence_chain",
  "match_dmall_capabilities",
  "assess_customer_risks",
  "generate_research_brief",
];

const systemPrompt = `You are the overseas B2B retail opportunity decision orchestrator.
Your job is to run the complete evidence-first workflow and never invent facts.
Call the tools in this exact order: ${toolOrder.join(" -> ")}.
Use the requested regionId for the first two tools and the requested customerId for every remaining tool.
Separate verified facts from inferences. Treat budget, procurement, decision chain and unknown system versions as pending confirmation.
Do not claim that Dmall replaces a customer's existing ERP, cloud, AI, WMS or internal team unless evidence explicitly proves it.
After all tools complete, provide a concise Chinese conclusion for sales.`;

function buildDemoResponses(regionId: string, customerId: string) {
  const calls = [
    ["scan_market", { regionId }, "先运行市场雷达，核验区域机会和证据质量。"],
    ["generate_customer_pool", { regionId }, "按统一维度生成并排序客户池。"],
    ["build_customer_profile", { customerId }, "聚合客户画像和当前信息缺口。"],
    ["detect_opportunity_signals", { customerId }, "识别公开商机信号，同时区分事实与推断。"],
    ["assess_customer_admission", { customerId }, "基于体量、IT、管理层信号和未知项形成非绝对准入建议。"],
    ["build_evidence_chain", { customerId }, "整理来源、时间、摘要、证据等级和置信度。"],
    ["match_dmall_capabilities", { customerId }, "基于真实场景匹配 Dmall 能力和前置条件。"],
    ["assess_customer_risks", { customerId }, "标记系统、合规、预算、决策链和实施风险。"],
    ["generate_research_brief", { customerId }, "汇总客户 Brief、拜访问题、邮件和行动建议。"],
  ] as const;

  return [
    ...calls.map(([name, args, thinking]) =>
      fauxAssistantMessage([fauxThinking(thinking), fauxToolCall(name, args)], { stopReason: "toolUse" }),
    ),
    fauxAssistantMessage([
      fauxThinking("所有 P0 后端能力已经执行完毕，输出必须保留证据边界和待确认项。"),
      fauxText("完整证据优先链路已完成。最终结论以结构化工具结果为准。"),
    ]),
  ];
}

function getTextDelta(event: AgentEvent): string | undefined {
  if (event.type !== "message_update") return undefined;
  const update = event.assistantMessageEvent;
  return update.type === "text_delta" ? update.delta : undefined;
}

export async function runOpportunityPipeline(request: PipelineRequest, sink: PipelineEventSink): Promise<PipelineOutput> {
  const startedAt = new Date().toISOString();
  const mode = resolveMode(request.mode);
  const models = createModels();
  let model;
  let nextExpectedToolIndex = 0;
  let currentTurnText = "";
  let lastTurnText = "";
  let completedTurns = 0;
  let failureReason = "";
  const failedAttempts = new Map<string, number>();
  const usage = { input: 0, output: 0, totalTokens: 0, cost: 0 };

  if (mode === "demo") {
    const faux = fauxProvider({
      provider: `opportunity-demo-${request.runId}`,
      tokensPerSecond: process.env.NODE_ENV === "test" ? 0 : 80,
    });
    faux.setResponses(buildDemoResponses(request.regionId, request.customerId));
    models.setProvider(faux.provider);
    model = faux.getModel();
  } else if (config.provider === "dmall-router") {
    models.setProvider(dmallRouterProvider({ baseUrl: config.baseUrl, modelId: config.model }));
    model = models.getModel(DMALL_ROUTER_PROVIDER_ID, config.model);
  } else if (config.provider === "anthropic") {
    models.setProvider(anthropicProvider());
    model = models.getModel("anthropic", config.model);
  } else {
    models.setProvider(openaiProvider());
    model = models.getModel("openai", config.model);
  }
  if (!model) throw new Error(`Model not found: ${config.provider}/${config.model}`);
  const { tools, workspace } = createOpportunityTools({ mode, model: { provider: model.provider, model: model.id, thinkingEffort: config.thinkingEffort } });

  const agent = new Agent({
    initialState: { systemPrompt: systemPrompt + (mode === "live" ? materialGenerationInstructions : ""), model, tools, thinkingLevel: mode === "live" ? config.thinkingEffort : "low" },
    streamFn: models.streamSimple.bind(models),
    toolExecution: "sequential",
    sessionId: request.runId,
    beforeToolCall: async ({ toolCall, args }) => {
      const typedArgs = args as { regionId?: string; customerId?: string };
      if (typedArgs.regionId && typedArgs.regionId !== request.regionId) {
        return { block: true, reason: `regionId must be ${request.regionId}` };
      }
      if (typedArgs.customerId && typedArgs.customerId !== request.customerId) {
        return { block: true, reason: `customerId must be ${request.customerId}` };
      }
      const expectedIndex = toolOrder.findIndex((name) => name === toolCall.name);
      if (expectedIndex < 0) return { block: true, reason: `Unknown tool: ${toolCall.name}` };
      if (mode === "live" && toolCall.name !== toolOrder[nextExpectedToolIndex]) {
        return { block: true, reason: `Expected ${toolOrder[nextExpectedToolIndex]}, received ${toolCall.name}` };
      }
      return undefined;
    },
    afterToolCall: async ({ toolCall, isError }) => {
      // Only accepted output advances the workflow; invalid model arguments can be repaired.
      if (!isError && toolCall.name === toolOrder[nextExpectedToolIndex]) nextExpectedToolIndex += 1;
      return undefined;
    },
    shouldStopAfterTurn: () => {
      completedTurns += 1;
      const exhausted = [...failedAttempts].find(([, count]) => count >= 3);
      if (exhausted) failureReason = `${exhausted[0]} failed validation/execution three times; no template fallback was used`;
      else if (completedTurns >= 18) failureReason = "Agent exceeded the 18-turn workflow limit";
      return Boolean(failureReason);
    },
  });

  agent.subscribe(async (event) => {
    const timestamp = new Date().toISOString();
    if (event.type === "turn_start") currentTurnText = "";
    if (event.type === "turn_end") lastTurnText = currentTurnText;
    if (event.type === "message_end" && event.message.role === "assistant") {
      usage.input += event.message.usage.input;
      usage.output += event.message.usage.output;
      usage.totalTokens += event.message.usage.totalTokens;
      usage.cost += event.message.usage.cost.total;
    }
    if (event.type === "agent_start") {
      await sink({ runId: request.runId, type: "agent_start", timestamp, message: `pi-agent-core ${mode} run started` });
      return;
    }
    if (event.type === "tool_execution_start") {
      const stage = toolOrder.indexOf(event.toolName) + 1;
      const tool = tools.find((candidate) => candidate.name === event.toolName);
      await sink({ runId: request.runId, type: "tool_start", timestamp, stage, toolName: event.toolName, label: tool?.label ?? event.toolName });
      return;
    }
    if (event.type === "tool_execution_update") {
      const details = event.partialResult?.details as { stage?: number; label?: string; progress?: number } | undefined;
      await sink({
        runId: request.runId,
        type: "tool_progress",
        timestamp,
        stage: details?.stage ?? toolOrder.indexOf(event.toolName) + 1,
        toolName: event.toolName,
        ...(details?.label ? { label: details.label } : {}),
        data: { progress: details?.progress ?? 50 },
      });
      return;
    }
    if (event.type === "tool_execution_end") {
      if (event.isError) failedAttempts.set(event.toolName, (failedAttempts.get(event.toolName) ?? 0) + 1);
      const details = event.result?.details as { stage?: number; label?: string; output?: unknown } | undefined;
      await sink({
        runId: request.runId,
        type: "tool_end",
        timestamp,
        stage: details?.stage ?? toolOrder.indexOf(event.toolName) + 1,
        toolName: event.toolName,
        ...(details?.label ? { label: details.label } : {}),
        message: event.isError ? "tool failed" : "tool completed",
        ...(details?.output !== undefined ? { data: details.output } : {}),
      });
      if (mode === "live" && !event.isError && (nextExpectedToolIndex === 6 || nextExpectedToolIndex === 8)) {
        await sink({
          runId: request.runId, type: "tool_progress", timestamp, stage: nextExpectedToolIndex + 1,
          toolName: toolOrder[nextExpectedToolIndex]!,
          label: nextExpectedToolIndex === 6 ? "分析客户需求与产品适配" : "撰写英文开发邮件",
          data: { progress: 15 },
        });
      }
      return;
    }
    const delta = getTextDelta(event);
    if (delta) {
      currentTurnText += delta;
      await sink({ runId: request.runId, type: "message_delta", timestamp, message: delta });
    }
  });

  await agent.prompt(`Run the complete workflow for regionId=${request.regionId} and customerId=${request.customerId}.`);
  if (failureReason || agent.state.errorMessage) throw new Error(failureReason || agent.state.errorMessage);

  if (
    !workspace.marketRadar
    || !workspace.customerPool
    || !workspace.customerProfile
    || !workspace.opportunitySignals
    || !workspace.admission
    || !workspace.evidenceChain
    || !workspace.productMatch
    || !workspace.riskAssessment
    || !workspace.researchBrief
  ) {
    throw new Error("Agent stopped before completing every required P0 tool stage");
  }
  if (mode === "live" && (workspace.productMatch.generation?.source !== "llm" || workspace.researchBrief.outreachEmail.generation?.source !== "llm")) {
    throw new Error("Live workflow requires both capability matching and outreach email to be LLM-generated");
  }

  const deterministicNarrative = createFinalNarrative(workspace.researchBrief, workspace.productMatch);
  const modelNarrative = lastTurnText.trim();
  const finalNarrative = mode === "live" && modelNarrative ? modelNarrative : deterministicNarrative;
  return {
    runId: request.runId,
    mode,
    regionId: request.regionId,
    customerId: request.customerId,
    startedAt,
    completedAt: new Date().toISOString(),
    marketRadar: workspace.marketRadar,
    customerPool: workspace.customerPool,
    customerProfile: workspace.customerProfile,
    opportunitySignals: workspace.opportunitySignals,
    admission: workspace.admission,
    evidenceChain: workspace.evidenceChain,
    productMatch: workspace.productMatch,
    riskAssessment: workspace.riskAssessment,
    researchBrief: workspace.researchBrief,
    finalNarrative,
    modelRun: {
      provider: model.provider,
      model: model.id,
      thinkingEffort: mode === "live" ? config.thinkingEffort : "low",
      narrative: modelNarrative,
      usage,
    },
  };
}

export { toolOrder };
