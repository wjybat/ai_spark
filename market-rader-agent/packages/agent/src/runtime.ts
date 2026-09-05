import { randomUUID } from "node:crypto";

import { canonicalHash, newId } from "@market-radar/domain";
import { eq } from "drizzle-orm";
import { createJsonLogger, METRIC_NAMES, metrics, ensureTraceContext, withTrace } from "@market-radar/infrastructure";
import type { MarketDatabase } from "@market-radar/infrastructure";
import {
  agentMessages,
  agentSessions,
  toolCallLogs,
} from "@market-radar/infrastructure";
import { runPiConversation } from "./pi-conversation.js";
import { AGENT_TOOLS, type AgentFact, type ToolResult } from "./tools.js";

const logger = createJsonLogger("info", { component: "agent" });

export type AgentEventType =
  | "agent.run_started"
  | "agent.tool_started"
  | "agent.tool_completed"
  | "agent.text_delta"
  | "agent.citation"
  | "agent.run_completed"
  | "agent.run_failed";

export interface AgentEvent {
  readonly type: AgentEventType;
  readonly tool?: string;
  readonly text?: string;
  readonly fact_id?: string;
  readonly run_id: string;
}

export interface AgentRunResult {
  readonly runId: string;
  readonly answer: string;
  readonly facts: readonly AgentFact[];
  readonly events: readonly AgentEvent[];
  readonly toolCalls: readonly string[];
}

export interface MarketAgentRuntime {
  createSession(db: MarketDatabase, title?: string): Promise<string>;
  sendMessage(
    db: MarketDatabase,
    input: { sessionId: string; message: string; activeScanRunId?: string },
  ): Promise<AgentRunResult>;
  cancelRun(runId: string): Promise<void>;
  getHistory(db: MarketDatabase, sessionId: string): Promise<AgentMessage[]>;
}

export interface AgentMessage {
  readonly id: string;
  readonly role: string;
  readonly content: string;
  readonly citations: readonly AgentFact[];
  readonly created_at: number;
}

const COUNTRY_NAMES: ReadonlyArray<[RegExp, string]> = [
  [/越南|vietnam|\bvn\b/i, "cty_vn"],
  [/印尼|印度尼西亚|indonesia|\bid\b/i, "cty_id"],
  [/泰国|thailand|\bth\b/i, "cty_th"],
  [/马来西亚|malaysia|\bmy\b/i, "cty_my"],
  [/菲律宾|philippines|\bph\b/i, "cty_ph"],
  [/沙特(?:阿拉伯)?|saudi arabia|\bsa\b/i, "cty_sa"],
  [/阿联酋|united arab emirates|\buae\b|\bae\b/i, "cty_ae"],
  [/卡塔尔|qatar|\bqa\b/i, "cty_qa"],
  [/科威特|kuwait|\bkw\b/i, "cty_kw"],
  [/阿曼|oman|\bom\b/i, "cty_om"],
  [/墨西哥|mexico|\bmx\b/i, "cty_mx"],
  [/巴西|brazil|\bbr\b/i, "cty_br"],
  [/哥伦比亚|colombia|\bco\b/i, "cty_co"],
  [/智利|chile|\bcl\b/i, "cty_cl"],
  [/秘鲁|peru|\bpe\b/i, "cty_pe"],
  [/埃及|egypt|\beg\b/i, "cty_eg"],
  [/摩洛哥|morocco|\bma\b/i, "cty_ma"],
  [/阿尔及利亚|algeria|\bdz\b/i, "cty_dz"],
  [/突尼斯|tunisia|\btn\b/i, "cty_tn"],
  [/利比亚|libya|\bly\b/i, "cty_ly"],
];

function detectCountries(message: string): string[] {
  const found: string[] = [];
  for (const [pattern, id] of COUNTRY_NAMES) {
    if (pattern.test(message) && !found.includes(id)) found.push(id);
  }
  return found;
}

interface Intent {
  tool: string;
  input: Record<string, unknown>;
}

function detectIntent(message: string): Intent {
  const normalized = message.trim().toLowerCase();
  if (/^(hi|hello|hey|你好|您好|嗨)[!！,.，?？\s]*$/.test(normalized) || /你能做什么|怎么用|帮助|help/.test(normalized)) {
    return {
      tool: "conversation",
      input: { reply: "你好！我可以与你讨论市场排名、比较国家、拆解指标，并追溯结论使用的已验证证据。你可以直接问：‘哪个市场最值得优先进入，为什么？’" },
    };
  }
  if (/^(谢谢|感谢|thanks|thank you)[!！,.，\s]*$/.test(normalized)) {
    return { tool: "conversation", input: { reply: "不客气。你还可以继续追问某个国家、指标或证据来源。" } };
  }
  const countries = detectCountries(message);
  const metricMatch = message.match(
    /(qualified_store_base|qualified_retailer_count|modern_retail_scale|format_store_cagr|modern_retail_sales_cagr|qualified_retailer_store_growth|announced_openings_ratio|expanding_retailer_share|new_entrant_activity|store_system_readiness|video_infrastructure_readiness|cloud_connectivity_readiness|retailer_digital_investment_signals|addressable_store_base|top_customer_concentration|estimated_acv_potential|use_case_need_fit|privacy_video_regulation_fit|deployment_data_residency_fit|partner_channel_availability|competition_intensity|localization_sales_friction|store_base|competition|residency)/,
  );

  if (/证据|引用|claim|evidence|quote|来源/.test(message)) {
    return {
      tool: "query_evidence",
      input: countries.length > 0 ? { country_id: countries[0]! } : {},
    };
  }
  if (/为什么|为何|why|解释|explain|怎么算|如何计算|依据/.test(message) && metricMatch !== null) {
    return {
      tool: "explain_metric",
      input: {
        country_id: countries[0] ?? "cty_vn",
        metric_code: metricMatch[1]!.toLowerCase(),
      },
    };
  }
  if (/比较|对比|compare|vs\.?|哪个更/.test(message) && countries.length >= 2) {
    return { tool: "compare_countries", input: { country_ids: countries.slice(0, 5) } };
  }
  if (/维度|dimension|拆解|得分构成/.test(message) && countries.length >= 1) {
    return { tool: "get_country_detail", input: { country_id: countries[0]! } };
  }
  if (/场景|scenario|状态|扫描进度|scan status/.test(message)) {
    return { tool: "get_current_scenario", input: {} };
  }
  if (/排名|排行|ranking|top|机会|opportunity|哪个国家/.test(message)) {
    return { tool: "query_country_ranking", input: { limit: 5 } };
  }
  if (countries.length === 1) {
    return { tool: "get_country_detail", input: { country_id: countries[0]! } };
  }
  return {
    tool: "conversation",
    input: { reply: "我可以围绕当前区域的零售市场与你对话。请告诉我想比较的国家，或要了解的排名、指标、进入建议或证据。" },
  };
}

function renderAnswer(message: string, result: ToolResult): string {
  const lines: string[] = [];
  if (result.tool === "conversation") {
    const reply = (result.data as { reply?: unknown } | undefined)?.reply;
    lines.push(typeof reply === "string" ? reply : "你好，我可以帮你查询市场排名、比较国家、解释指标或查看证据链。");
  } else if (result.tool === "query_country_ranking") {
    lines.push("当前机会排名（来自已保存的扫描结果）：");
    for (const f of result.facts) lines.push(`- ${f.text} [[${f.fact_id}]]`);
    lines.push("Blocked / Insufficient 的国家不参与正式排名。可以继续问我某个国家的维度拆解或证据。");
  } else if (result.tool === "compare_countries") {
    lines.push("对比结果（来自已保存评分）：");
    for (const f of result.facts) lines.push(`- ${f.text} [[${f.fact_id}]]`);
  } else if (result.tool === "get_country_detail") {
    for (const [index, f] of result.facts.slice(0, 3).entries()) {
      lines.push(`${index === 0 ? "" : "\n"}${f.text} [[${f.fact_id}]]`);
    }
    if (result.facts.length > 3) {
      lines.push(`\n其余 ${result.facts.length - 3} 个维度详情略，可指定维度提问。`);
    }
  } else if (result.tool === "explain_metric") {
    for (const f of result.facts) lines.push(`${f.text} [[${f.fact_id}]]`);
  } else if (result.tool === "query_evidence") {
    lines.push("已验证证据（Verified Claim，含原文引述）：");
    for (const f of result.facts) lines.push(`- ${f.text} [[${f.fact_id}]]`);
  } else {
    for (const f of result.facts) lines.push(`${f.text} [[${f.fact_id}]]`);
  }

  return lines.join("\n");
}

export interface AgentRuntimeOptions {
  readonly piConversation?: Readonly<{
    enabled: boolean;
    model: string;
    timeoutMs: number;
    thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  }>;
}

/** One agent run: conversational model, read-only tools, grounding and persistence. */
export function createAgentRuntime(options: AgentRuntimeOptions = {}): MarketAgentRuntime {
  return {
    async createSession(db, title) {
      const now = Date.now();
      const sessionId = `sess_${newId("a").split("_")[1]}`;
      await db.insert(agentSessions).values({
        id: sessionId,
        userId: "usr_market_radar_ops",
        title: title ?? "Market Radar 会话",
        createdAt: now,
        lastActiveAt: now,
      });
      return sessionId;
    },

    async cancelRun() {
      // Deterministic runtime completes synchronously; nothing to cancel.
    },

    async getHistory(db, sessionId) {
      const all = await db
        .select()
        .from(agentMessages)
        .where(eq(agentMessages.sessionId, sessionId));
      return all
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          citations: JSON.parse(row.citationsJson) as AgentFact[],
          created_at: row.createdAt,
        }));
    },

    async sendMessage(db, input) {
      const context = ensureTraceContext("agent");
      return withTrace(context, () => runAgentMessage(db, input, options));
    },
  };
}

/** One agent run: intent routing, tool execution, grounding and persistence. */
async function runAgentMessage(
  db: MarketDatabase,
  input: { sessionId: string; message: string; activeScanRunId?: string },
  options: AgentRuntimeOptions,
): Promise<AgentRunResult> {
  const runId = `run_${randomUUID()}`;
  const events: AgentEvent[] = [{ type: "agent.run_started", run_id: runId }];
  const toolNames: string[] = [];
  const allFacts: AgentFact[] = [];
  let answer = "你好，我可以围绕市场排名、国家对比、指标和证据与你对话。";

  try {
    let handledByPi = false;
    if (options.piConversation?.enabled === true) {
      try {
        const historyRows = await db
          .select()
          .from(agentMessages)
          .where(eq(agentMessages.sessionId, input.sessionId));
        const history: AgentMessage[] = historyRows
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            citations: JSON.parse(row.citationsJson) as AgentFact[],
            created_at: row.createdAt,
          }));
        const piResult = await runPiConversation(db, {
          message: input.message,
          history,
          ...(input.activeScanRunId === undefined ? {} : { scanRunId: input.activeScanRunId }),
          model: options.piConversation.model,
          timeoutMs: options.piConversation.timeoutMs,
          thinkingLevel: options.piConversation.thinkingLevel,
        });
        answer = piResult.answer;
        allFacts.push(...piResult.facts);
        toolNames.push(...piResult.toolCalls);
        handledByPi = true;
      } catch (error) {
        logger.warn("Pi conversation unavailable; using deterministic fallback", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!handledByPi) {
      const intent = detectIntent(input.message);
      const tool = AGENT_TOOLS.find((candidate) => candidate.name === intent.tool);
      if (tool === undefined) throw new Error(`Unknown tool: ${intent.tool}`);

      events.push({ type: "agent.tool_started", tool: tool.name, run_id: runId });
      const toolCallId = `tc_${randomUUID()}`;
      const startedAt = Date.now();
      const result = await tool.execute(db, {
        ...intent.input,
        ...(input.activeScanRunId !== undefined ? { scan_run_id: input.activeScanRunId } : {}),
      });
      const latency = Date.now() - startedAt;
      toolNames.push(tool.name);
      allFacts.push(...result.facts);
      events.push({ type: "agent.tool_completed", tool: tool.name, run_id: runId });
      metrics.increment(METRIC_NAMES.toolCallsTotal, { tool: tool.name, status: "succeeded" });

      await db.insert(toolCallLogs).values({
        id: `tcl_${randomUUID()}`,
        toolCallId,
        sessionId: input.sessionId,
        runId,
        userId: "usr_market_radar_ops",
        toolName: tool.name,
        argsHash: canonicalHash(intent.input),
        resultHash: canonicalHash(result.facts),
        status: "succeeded",
        resourceIdsJson: JSON.stringify({
          claim_ids: result.facts.flatMap((f) => [...f.claim_ids]),
        }),
        latencyMs: latency,
        createdAt: startedAt,
        finishedAt: Date.now(),
      });

      answer = renderAnswer(input.message, result);
    }

    // Grounding check: every citation must reference a fact returned this turn.
    const validIds = new Set(allFacts.map((item) => item.fact_id));
    for (const match of answer.matchAll(/\[\[(fact_\d+)\]\]/g)) {
      if (!validIds.has(match[1]!)) throw new Error(`Invalid citation: ${match[1]}`);
      events.push({ type: "agent.citation", fact_id: match[1]!, run_id: runId });
    }
    events.push({ type: "agent.text_delta", text: answer, run_id: runId });
    events.push({ type: "agent.run_completed", run_id: runId });
  } catch (error) {
        events.push({ type: "agent.run_failed", run_id: runId, text: error instanceof Error ? error.message : String(error) });
        answer = "抱歉，处理请求时出错。请换个问法（例如「查看排名」「比较越南和泰国」「越南的证据」）。";
  }

  const now = Date.now();
  await db.insert(agentMessages).values({
        id: `amsg_${randomUUID()}`,
        sessionId: input.sessionId,
        role: "user",
        content: input.message,
        citationsJson: JSON.stringify([]),
        createdAt: now,
  });
  await db.insert(agentMessages).values({
        id: `amsg_${randomUUID()}`,
        sessionId: input.sessionId,
        role: "assistant",
        content: answer,
        citationsJson: JSON.stringify(allFacts),
        createdAt: now + 1,
  });
  await db
        .update(agentSessions)
        .set({ lastActiveAt: now })
        .where(eq(agentSessions.id, input.sessionId));

  return { runId, answer, facts: allFacts, events, toolCalls: toolNames };
}
