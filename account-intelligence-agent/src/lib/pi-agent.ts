import type { DatabaseSync } from "node:sqlite";
import { StringEnum } from "@earendil-works/pi-ai";
import {
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  getAgentDir,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { eventTypes, extractionSchema, factTypes, type CustomerRow, type Extraction, type SourceRow } from "./types";
import { safeJson } from "./utils";

const SYSTEM_PROMPT = `你是客户情报分析基座 Agent。你的任务是把客户材料转化为可靠的 Event、Fact 和 Next Action。

工作流程：
1. 先调用 get_customer_profile 了解客户当前状态。
2. 调用 read_source_material 阅读本次完整材料。
3. 按需调用 list_current_facts 和 list_customer_timeline，判断新旧信息和事件阶段。
4. 只依据工具返回的证据进行抽取，不得猜测。
5. 最后必须调用 submit_customer_analysis 提交结构化结果，并将该工具作为最后动作。

约束：
- event_type 和 fact_type 只能使用工具 Schema 中允许的枚举。
- 每个结论包含简洁的中文 summary/value 和原文 evidence_text。
- 材料明确描述已验证成果或量化收益时，提取为 SUCCESS_FACTOR。
- 材料明确复盘已发生的延期、失败及原因时，提取为 FAILURE_REASON；未来风险只提取为 BLOCKER。
- 材料明确给出应对策略、项目经验或可复用方法时，提取为 PLAYBOOK。
- 没有明确证据时不要创建 Event 或 Fact。
- occurred_at 优先使用材料发生时间。
- confidence 在 0 到 1，importance 在 1 到 10。
- 不得修改数据库；所有工具均为只读，只有 submit_customer_analysis 可提交本次分析结果。`;

interface TimelineRow { event_type: string; occurred_at: string; summary: string; importance: number; source_item_id: string }
interface FactRow { fact_type: string; fact_key: string; fact_value: string; confidence: number; created_at: string }
interface SummaryRow { current_state: string; key_requirements_json: string; key_blockers_json: string; next_actions_json: string }

function textResult(value: unknown, details: Record<string, unknown> = {}) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], details };
}

function createCustomerTools(db: DatabaseSync, customer: CustomerRow, source: SourceRow, onSubmit: (value: Extraction) => void) {
  const getCustomerProfile = defineTool({
    name: "get_customer_profile",
    label: "读取客户画像",
    description: "读取当前任务客户的基础信息、状态和上一次总结。仅返回当前客户。",
    parameters: Type.Object({}),
    async execute() {
      const summary = db.prepare("SELECT current_state,key_requirements_json,key_blockers_json,next_actions_json FROM customer_summaries WHERE customer_id=?").get(customer.id) as SummaryRow | undefined;
      return textResult({
        id: customer.id, name: customer.name, country: customer.country, region: customer.region, industry: customer.industry,
        owner: customer.owner, category: customer.category, stage: customer.stage, status: customer.status,
        profile: safeJson(customer.profile_json, {}),
        previous_summary: summary ? {
          current_state: summary.current_state,
          key_requirements: safeJson(summary.key_requirements_json, []),
          key_blockers: safeJson(summary.key_blockers_json, []),
          next_actions: safeJson(summary.next_actions_json, []),
        } : null,
      }, { customerId: customer.id });
    },
  });

  const readSourceMaterial = defineTool({
    name: "read_source_material",
    label: "读取客户材料",
    description: "读取本次待分析的完整来源材料和元数据。只能读取当前任务材料。",
    parameters: Type.Object({ source_id: Type.String({ description: "Prompt 中给出的本次 source_id" }) }),
    async execute(_id, params) {
      if (params.source_id !== source.id) throw new Error("只能读取当前任务的来源材料");
      return textResult({
        id: source.id, source_type: source.source_type, source_system: source.source_system, title: source.title,
        occurred_at: source.occurred_at, author: source.author, metadata: safeJson(source.metadata_json, {}),
        content: source.content.slice(0, 50_000), content_truncated: source.content.length > 50_000,
      }, { sourceId: source.id });
    },
  });

  const listCurrentFacts = defineTool({
    name: "list_current_facts",
    label: "查询当前事实",
    description: "查询当前客户已生效的事实，用于判断信息更新与冲突。最多返回 30 条。",
    parameters: Type.Object({ fact_type: Type.Optional(StringEnum(factTypes)) }),
    async execute(_id, params) {
      const rows = params.fact_type
        ? db.prepare("SELECT fact_type,fact_key,fact_value,confidence,created_at FROM customer_facts WHERE customer_id=? AND is_current=1 AND fact_type=? ORDER BY created_at DESC LIMIT 30").all(customer.id, params.fact_type)
        : db.prepare("SELECT fact_type,fact_key,fact_value,confidence,created_at FROM customer_facts WHERE customer_id=? AND is_current=1 ORDER BY created_at DESC LIMIT 30").all(customer.id);
      return textResult(rows as unknown as FactRow[], { count: rows.length });
    },
  });

  const listTimeline = defineTool({
    name: "list_customer_timeline",
    label: "查询客户时间线",
    description: "查询当前客户最近的标准业务事件，用于判断阶段和历史上下文。",
    parameters: Type.Object({ limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 30, default: 20 })) }),
    async execute(_id, params) {
      const limit = Math.min(30, Math.max(1, params.limit || 20));
      const rows = db.prepare("SELECT event_type,occurred_at,summary,importance,source_item_id FROM customer_events WHERE customer_id=? ORDER BY occurred_at DESC,created_at DESC LIMIT ?").all(customer.id, limit);
      return textResult(rows as unknown as TimelineRow[], { count: rows.length });
    },
  });

  const submitAnalysis = defineTool({
    name: "submit_customer_analysis",
    label: "提交客户分析",
    description: "提交本次材料的最终结构化分析。必须作为最后一个工具调用。",
    parameters: Type.Object({
      events: Type.Array(Type.Object({
        event_type: StringEnum(eventTypes), occurred_at: Type.Optional(Type.String()), summary: Type.String({ minLength: 1 }),
        importance: Type.Integer({ minimum: 1, maximum: 10 }), confidence: Type.Number({ minimum: 0, maximum: 1 }), evidence_text: Type.Optional(Type.String()),
      })),
      facts: Type.Array(Type.Object({
        fact_type: StringEnum(factTypes), fact_key: Type.String({ minLength: 1 }), fact_value: Type.String({ minLength: 1 }),
        confidence: Type.Number({ minimum: 0, maximum: 1 }), evidence_text: Type.Optional(Type.String()),
      })),
      next_actions: Type.Array(Type.Object({ action: Type.String({ minLength: 1 }), reason: Type.Optional(Type.String()) })),
    }),
    async execute(_id, params) {
      const normalized = {
        events: params.events.map((event) => ({ ...event, occurred_at: event.occurred_at || source.occurred_at })),
        facts: params.facts,
        next_actions: params.next_actions,
      };
      const result = extractionSchema.parse(normalized);
      onSubmit(result);
      return { ...textResult({ accepted: true, events: result.events.length, facts: result.facts.length, next_actions: result.next_actions.length }), terminate: true };
    },
  });

  return [getCustomerProfile, readSourceMaterial, listCurrentFacts, listTimeline, submitAnalysis];
}

async function selectModel(modelRuntime: ModelRuntime) {
  const configured = process.env.PI_AGENT_MODEL?.trim();
  if (configured) {
    const slash = configured.indexOf("/");
    if (slash < 1) throw new Error("PI_AGENT_MODEL 必须使用 provider/model 格式");
    const model = modelRuntime.getModel(configured.slice(0, slash), configured.slice(slash + 1));
    if (!model) throw new Error(`Pi 模型不存在: ${configured}`);
    return model;
  }
  const runtimeProvider = process.env.PI_PROVIDER;
  const runtimeModel = process.env.PI_MODEL;
  if (runtimeProvider && runtimeModel) {
    const inherited = modelRuntime.getModel(runtimeProvider, runtimeModel);
    if (inherited) return inherited;
  }
  const persistedSettings = SettingsManager.create(process.cwd(), getAgentDir());
  const defaultProvider = persistedSettings.getDefaultProvider();
  const defaultModel = persistedSettings.getDefaultModel();
  if (defaultProvider && defaultModel) {
    const saved = modelRuntime.getModel(defaultProvider, defaultModel);
    if (saved) return saved;
  }
  const available = await modelRuntime.getAvailable();
  if (!available.length) throw new Error("Pi 没有可用模型，请先运行 pi /login 或配置模型 API Key");
  return available[0];
}

export async function analyzeWithPiAgent(db: DatabaseSync, customer: CustomerRow, source: SourceRow): Promise<Extraction> {
  let submitted: Extraction | undefined;
  const globalSettings = SettingsManager.create(process.cwd(), getAgentDir()).getGlobalSettings();
  if (globalSettings.httpProxy && !process.env.HTTP_PROXY && !process.env.HTTPS_PROXY) {
    process.env.HTTP_PROXY = globalSettings.httpProxy;
    process.env.HTTPS_PROXY = globalSettings.httpProxy;
  }
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY) setGlobalDispatcher(new EnvHttpProxyAgent());
  const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: true, maxRetries: 1 }, transport: "sse" });
  const modelRuntime = await ModelRuntime.create();
  const model = await selectModel(modelRuntime);
  const tools = createCustomerTools(db, customer, source, (value) => { submitted = value; });
  const loader = new DefaultResourceLoader({
    cwd: process.cwd(), agentDir: getAgentDir(), settingsManager,
    systemPromptOverride: () => SYSTEM_PROMPT,
    appendSystemPromptOverride: () => [],
    agentsFilesOverride: () => ({ agentsFiles: [] }),
    skillsOverride: () => ({ skills: [], diagnostics: [] }),
  });
  await loader.reload();
  const { session } = await createAgentSession({
    cwd: process.cwd(), model, modelRuntime, thinkingLevel: (process.env.PI_AGENT_THINKING || "low") as "off" | "minimal" | "low" | "medium" | "high",
    customTools: tools, tools: tools.map((tool) => tool.name), noTools: "builtin",
    resourceLoader: loader, settingsManager, sessionManager: SessionManager.inMemory(process.cwd()),
  });
  const timeout = setTimeout(() => void session.abort(), Number(process.env.PI_AGENT_TIMEOUT_MS || 120_000));
  try {
    session.subscribe((event) => {
      if (event.type === "tool_execution_start") console.log(`[pi-agent] tool=${event.toolName} customer=${customer.id} source=${source.id}`);
    });
    await session.prompt(`分析客户 ${customer.name} 的新材料。当前任务 source_id=${source.id}。请按规定调用工具读取上下文，并提交结构化分析。`);
    if (!submitted) {
      const stateError = session.agent.state.errorMessage;
      const lastMessage = session.messages.at(-1);
      throw new Error(`Pi Agent 未调用 submit_customer_analysis${stateError ? `: ${stateError}` : `，最后消息: ${JSON.stringify(lastMessage).slice(0, 500)}`}`);
    }
    return submitted;
  } finally {
    clearTimeout(timeout);
    session.dispose();
  }
}
