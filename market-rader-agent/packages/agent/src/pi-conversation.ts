import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  defineTool,
} from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import type { MarketDatabase } from "@market-radar/infrastructure";
import { Type } from "typebox";

import { AGENT_TOOLS, type AgentFact } from "./tools.js";
import type { AgentMessage } from "./runtime.js";

const QUERY_TOOL = "query_market_radar";
const SUBMIT_TOOL = "submit_grounded_answer";
const ACTIONS = ["ranking", "country_detail", "compare", "explain_metric", "evidence", "scenario"] as const;

const querySchema = Type.Object({
  action: StringEnum(ACTIONS),
  country_id: Type.Optional(Type.String()),
  country_ids: Type.Optional(Type.Array(Type.String(), { minItems: 2, maxItems: 5 })),
  metric_code: Type.Optional(Type.String()),
  predicate_code: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
});

const submitSchema = Type.Object({
  answer: Type.String({ minLength: 1, maxLength: 8_000 }),
  fact_ids: Type.Array(Type.String(), { maxItems: 30 }),
});

const ACTION_TO_TOOL: Readonly<Record<(typeof ACTIONS)[number], string>> = {
  ranking: "query_country_ranking",
  country_detail: "get_country_detail",
  compare: "compare_countries",
  explain_metric: "explain_metric",
  evidence: "query_evidence",
  scenario: "get_current_scenario",
};

export interface PiConversationResult {
  readonly answer: string;
  readonly facts: readonly AgentFact[];
  readonly toolCalls: readonly string[];
}

function systemPrompt(): string {
  return [
    "You are Market Radar's conversational analyst. Reply naturally in the user's language and maintain conversational context.",
    "You have no filesystem, shell, browser, web-search, mutation, forecasting, or scenario-simulation capabilities.",
    "Your supported analytical actions are exactly: persisted ranking, country comparison/detail, metric explanation, evidence lookup, and scan-status lookup.",
    `Use ${QUERY_TOOL} whenever an answer depends on market rankings, scores, metrics, scan status, or evidence.`,
    "Configured country IDs: SEA cty_vn/cty_id/cty_th/cty_my/cty_ph; Middle East cty_sa/cty_ae/cty_qa/cty_kw/cty_om; Latin America cty_mx/cty_br/cty_co/cty_cl/cty_pe; North Africa cty_eg/cty_ma/cty_dz/cty_tn/cty_ly. Query the current ranking before selecting countries from the active regional scan.",
    "Never invent, estimate, or rely on model memory for market facts. Only state facts returned by the query tool.",
    "Cite each factual statement with its exact [[fact_N]] identifier. Greetings and capability explanations need no citation.",
    "Treat provisional and insufficient_evidence results as non-final and say so when relevant.",
    `Always finish by calling ${SUBMIT_TOOL}; do not finish with a prose-only response.`,
  ].join("\n");
}

function conversationPrompt(history: readonly AgentMessage[], message: string): string {
  const transcript = history.slice(-8).map((entry) => {
    const clean = entry.content.replace(/\[\[fact_\d+\]\]/g, "").trim();
    return `${entry.role === "user" ? "User" : "Assistant"}: ${clean}`;
  });
  return [
    "Recent conversation (context only; re-query tools before repeating any market fact):",
    ...(transcript.length === 0 ? ["(none)"] : transcript),
    `User: ${message}`,
  ].join("\n");
}

function remapFacts(facts: readonly AgentFact[], allFacts: AgentFact[]): AgentFact[] {
  return facts.map((item) => {
    const mapped = { ...item, fact_id: `fact_${allFacts.length + 1}` };
    allFacts.push(mapped);
    return mapped;
  });
}

export async function runPiConversation(
  db: MarketDatabase,
  input: {
    readonly message: string;
    readonly history: readonly AgentMessage[];
    readonly scanRunId?: string;
    readonly timeoutMs: number;
    readonly thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  },
): Promise<PiConversationResult> {
  const allFacts: AgentFact[] = [];
  const toolCalls: string[] = [];
  let submitted: { answer: string; fact_ids: string[] } | undefined;

  const queryTool = defineTool({
    name: QUERY_TOOL,
    label: "Query Market Radar",
    description: "Read persisted Market Radar rankings, country details, metric explanations, evidence, or scan status.",
    parameters: querySchema,
    async execute(_toolCallId, params) {
      const toolName = ACTION_TO_TOOL[params.action];
      const tool = AGENT_TOOLS.find((candidate) => candidate.name === toolName);
      if (tool === undefined) throw new Error(`Unavailable agent tool: ${toolName}`);
      const result = await tool.execute(db, {
        ...(params.country_id === undefined ? {} : { country_id: params.country_id }),
        ...(params.country_ids === undefined ? {} : { country_ids: params.country_ids }),
        ...(params.metric_code === undefined ? {} : { metric_code: params.metric_code }),
        ...(params.predicate_code === undefined ? {} : { predicate_code: params.predicate_code }),
        ...(params.limit === undefined ? {} : { limit: params.limit }),
        ...(input.scanRunId === undefined ? {} : { scan_run_id: input.scanRunId }),
      });
      toolCalls.push(toolName);
      const facts = remapFacts(result.facts, allFacts);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ facts, data: result.data }) }],
        details: { facts },
      };
    },
  });

  const submitTool = defineTool({
    name: SUBMIT_TOOL,
    label: "Submit Grounded Answer",
    description: "Return the final conversational answer and the exact fact IDs used.",
    parameters: submitSchema,
    execute(_toolCallId, params) {
      const validIds = new Set(allFacts.map((item) => item.fact_id));
      const citedIds = [...params.answer.matchAll(/\[\[(fact_\d+)\]\]/g)].map((match) => match[1]!);
      const invalid = [...params.fact_ids, ...citedIds].filter((id) => !validIds.has(id));
      const missingMarkers = params.fact_ids.filter((id) => !citedIds.includes(id));
      const undeclaredCitations = citedIds.filter((id) => !params.fact_ids.includes(id));
      const normalizeNumber = (value: string): string => value.replaceAll(",", "");
      const factNumbers = new Set(
        allFacts
          .filter((item) => params.fact_ids.includes(item.fact_id))
          .flatMap((item) => item.text.match(/\d[\d,.]*%?/g) ?? [])
          .map(normalizeNumber),
      );
      const answerNumbers = params.answer
        .replace(/\[\[fact_\d+\]\]/g, "")
        .match(/\d[\d,.]*%?/g) ?? [];
      const unsupportedNumbers = answerNumbers
        .map(normalizeNumber)
        .filter((value) => !factNumbers.has(value));
      if (
        invalid.length > 0 ||
        missingMarkers.length > 0 ||
        undeclaredCitations.length > 0 ||
        unsupportedNumbers.length > 0
      ) {
        return Promise.resolve({
          content: [{
            type: "text" as const,
            text: `Rejected: invalid fact IDs ${invalid.join(", ") || "none"}; fact IDs missing inline citations ${missingMarkers.join(", ") || "none"}; cited but undeclared IDs ${undeclaredCitations.join(", ") || "none"}; unsupported numeric values ${unsupportedNumbers.join(", ") || "none"}. Correct and resubmit without unsupported numbers.`,
          }],
          details: { accepted: false },
          terminate: false,
        });
      }
      submitted = { answer: params.answer.trim(), fact_ids: [...new Set(params.fact_ids)] };
      return Promise.resolve({
        content: [{ type: "text" as const, text: "Grounded answer accepted." }],
        details: { accepted: true },
        terminate: true,
      });
    },
  });

  const cwd = process.cwd();
  const agentDir = getAgentDir();
  const settingsManager = SettingsManager.create(cwd, agentDir);
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt: systemPrompt(),
  });
  await resourceLoader.reload();
  const modelRuntime = await ModelRuntime.create();
  const { session } = await createAgentSession({
    cwd,
    agentDir,
    tools: [QUERY_TOOL, SUBMIT_TOOL],
    customTools: [queryTool, submitTool],
    resourceLoader,
    modelRuntime,
    settingsManager,
    sessionManager: SessionManager.inMemory(cwd),
    thinkingLevel: input.thinkingLevel,
  });

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        void session.abort();
        reject(new Error(`Pi conversation timed out after ${input.timeoutMs}ms`));
      }, input.timeoutMs);
    });
    await Promise.race([session.prompt(conversationPrompt(input.history, input.message)), timeoutPromise]);
    if (submitted === undefined) {
      const diagnostic = JSON.stringify(session.messages.slice(-3)).slice(0, 4_000);
      throw new Error(`Pi conversation ended without submitting an answer: ${diagnostic}`);
    }
    const used = new Set(submitted.fact_ids);
    return {
      answer: submitted.answer,
      facts: allFacts.filter((item) => used.has(item.fact_id)),
      toolCalls,
    };
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    session.dispose();
  }
}
