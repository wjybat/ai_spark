import type { MarketDatabase } from "@market-radar/infrastructure";
import {
  explainMetric,
  getCountryDetail as getCountryDetailQuery,
  getRanking,
  getScanRuns,
  getScenarios,
  metricEvidenceLinks,
  metricValues,
  queryVerifiedClaims,
} from "@market-radar/infrastructure";
import { and, eq, inArray } from "drizzle-orm";

/** Grounded fact returned by every read-only agent tool. */
export interface AgentFact {
  readonly fact_id: string;
  readonly text: string;
  readonly claim_ids: readonly string[];
  readonly metric_value_ids: readonly string[];
  readonly status: string;
}

export interface ToolResult {
  readonly tool: string;
  readonly facts: readonly AgentFact[];
  readonly data?: unknown;
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  execute(db: MarketDatabase, input: Record<string, unknown>): Promise<ToolResult>;
}

function fact(
  id: number,
  text: string,
  claimIds: readonly string[] = [],
  metricValueIds: readonly string[] = [],
  status = "published",
): AgentFact {
  return { fact_id: `fact_${id}`, text, claim_ids: claimIds, metric_value_ids: metricValueIds, status };
}

async function claimIdsForCountry(
  db: MarketDatabase,
  scanRunId: string,
  countryId: string,
  limit = 3,
): Promise<string[]> {
  const values = await db
    .select({ id: metricValues.id })
    .from(metricValues)
    .where(and(eq(metricValues.scanRunId, scanRunId), eq(metricValues.countryId, countryId)));
  if (values.length === 0) return [];
  const links = await db
    .select({ claimId: metricEvidenceLinks.evidenceClaimId })
    .from(metricEvidenceLinks)
    .where(
      inArray(
        metricEvidenceLinks.metricValueId,
        values.map((value) => value.id),
      ),
    )
    .limit(limit);
  return links.map((link) => link.claimId);
}

async function latestScanRunId(db: MarketDatabase): Promise<string | null> {
  const runs = await getScanRuns(db);
  const displayable = runs.find((run) => run.status === "completed" || run.status === "partial");
  return displayable?.scan_run_id ?? null;
}

const getCurrentScenario: AgentTool = {
  name: "get_current_scenario",
  description: "当前 Scenario、策略与最近一次扫描的状态",
  async execute(db, input) {
    const scenarios = await getScenarios(db);
    const runs = await getScanRuns(db);
    const requestedScanRunId = typeof input.scan_run_id === "string" ? input.scan_run_id : null;
    const run = requestedScanRunId === null
      ? runs[0]
      : runs.find((candidate) => candidate.scan_run_id === requestedScanRunId);
    const scenario = run === undefined
      ? scenarios[0]
      : scenarios.find((candidate) =>
          candidate.revisions.some((revision) => revision.revision_id === run.scenario_revision_id),
        );
    return {
      tool: "get_current_scenario",
      facts: [
        fact(
          1,
          `当前 Scenario「${scenario?.name ?? "—"}」，策略 ${scenario?.revisions.at(-1)?.strategy_code ?? "—"}；最近扫描状态 ${run?.status ?? "未运行"}（数据截至 ${run?.data_as_of ?? "—"}）。`,
          [],
          [],
          run?.result_status ?? "unknown",
        ),
      ],
    };
  },
};

const conversation: AgentTool = {
  name: "conversation",
  description: "处理问候、帮助和无法识别的自然语言输入",
  execute(_db, input) {
    const reply = typeof input.reply === "string"
      ? input.reply
      : "你好，我可以帮你查询市场排名、比较国家、解释指标或查看证据链。";
    return Promise.resolve({ tool: "conversation", facts: [], data: { reply } });
  },
};

const queryCountryRanking: AgentTool = {
  name: "query_country_ranking",
  description: "查询国家机会排名",
  async execute(db, input) {
    const scanRunId =
      typeof input.scan_run_id === "string" ? input.scan_run_id : await latestScanRunId(db);
    if (scanRunId === null) {
      return { tool: "query_country_ranking", facts: [fact(1, "尚未运行任何扫描，暂无排名数据。", [], [], "insufficient_evidence")] };
    }
    const ranking = await getRanking(db, scanRunId);
    const limit = typeof input.limit === "number" ? input.limit : 5;
    const facts: AgentFact[] = [];
    let id = 1;
    for (const item of ranking.items.slice(0, limit)) {
      const claims = await claimIdsForCountry(db, scanRunId, item.country.id);
      facts.push(
        fact(
          id,
          `${item.country.name} 排名 #${item.rank ?? "—"}，机会分 ${item.opportunity_score ?? "—"}，覆盖率 ${item.coverage}%，EQI ${item.evidence_quality_index}%，优先级 ${item.priority}，状态 ${item.result_status}。`,
          claims,
          [],
          item.result_status,
        ),
      );
      id += 1;
    }
    if (facts.length === 0) {
      facts.push(fact(1, "扫描尚未产出结果（可能仍在研究阶段）。", [], [], "running"));
    }
    return { tool: "query_country_ranking", facts };
  },
};

const getCountryDetail: AgentTool = {
  name: "get_country_detail",
  description: "查询单个国家评分与维度拆解",
  async execute(db, input) {
    const countryId = typeof input.country_id === "string" ? input.country_id : "cty_vn";
    const scanRunId =
      typeof input.scan_run_id === "string" ? input.scan_run_id : await latestScanRunId(db);
    if (scanRunId === null) {
      return { tool: "get_country_detail", facts: [fact(1, "尚未运行任何扫描。", [], [], "insufficient_evidence")] };
    }
    const detail = await getCountryDetailQuery(db, scanRunId, countryId);
    const facts: AgentFact[] = [
      fact(
        1,
        `${detail.country.name}：机会分 ${detail.opportunity_score ?? "—"}，市场吸引力 ${detail.market_attractiveness ?? "—"}，进入难度 ${detail.entry_difficulty ?? "—"}，覆盖率 ${detail.coverage}%，EQI ${detail.evidence_quality_index}%，状态 ${detail.result_status}。`,
        await claimIdsForCountry(db, scanRunId, countryId, 5),
        [],
        detail.result_status,
      ),
    ];
    let id = 2;
    for (const dimension of detail.dimensions) {
      facts.push(
        fact(
          id,
          `${detail.country.name} 维度 ${dimension.dimension_code}：得分 ${dimension.score ?? "—"}（权重 ${dimension.weight}%，覆盖率 ${dimension.coverage}%，${dimension.status}）。`,
          [],
          [],
          dimension.status === "available" ? "published" : "insufficient_evidence",
        ),
      );
      id += 1;
    }
    return { tool: "get_country_detail", facts };
  },
};

const compareCountries: AgentTool = {
  name: "compare_countries",
  description: "比较 2-5 个国家的机会得分",
  async execute(db, input) {
    const scanRunId =
      typeof input.scan_run_id === "string" ? input.scan_run_id : await latestScanRunId(db);
    if (scanRunId === null) {
      return { tool: "compare_countries", facts: [fact(1, "尚未运行任何扫描。", [], [], "insufficient_evidence")] };
    }
    const ranking = await getRanking(db, scanRunId);
    const requested = Array.isArray(input.country_ids)
      ? (input.country_ids as string[])
      : ["cty_vn", "cty_th"];
    const selected = ranking.items.filter((item) => requested.includes(item.country.id));
    const facts: AgentFact[] = [];
    let id = 1;
    for (const item of selected) {
      const claims = await claimIdsForCountry(db, scanRunId, item.country.id, 2);
      facts.push(
        fact(
          id,
          `${item.country.name}：机会分 ${item.opportunity_score ?? "—"}，市场吸引力 ${item.market_attractiveness ?? "—"}，进入难度 ${item.entry_difficulty ?? "—"}，优先级 ${item.priority}，状态 ${item.result_status}。`,
          claims,
          [],
          item.result_status,
        ),
      );
      id += 1;
    }
    return { tool: "compare_countries", facts };
  },
};

const explainMetricTool: AgentTool = {
  name: "explain_metric",
  description: "解释某国家某指标的计算依据（原始值、归一化、证据）",
  async execute(db, input) {
    const scanRunId =
      typeof input.scan_run_id === "string" ? input.scan_run_id : await latestScanRunId(db);
    if (scanRunId === null) {
      return { tool: "explain_metric", facts: [fact(1, "尚未运行任何扫描。", [], [], "insufficient_evidence")] };
    }
    const countryId = typeof input.country_id === "string" ? input.country_id : "cty_vn";
    const metricCode = typeof input.metric_code === "string" ? input.metric_code : "opportunity";
    const detail = await getCountryDetailQuery(db, scanRunId, countryId);
    const metric = detail.metrics.find((m) => m.metric_code === metricCode);
    if (metric === undefined) {
      return {
        tool: "explain_metric",
        facts: [
          fact(
            1,
            `未找到 ${countryId} 的指标 ${metricCode}（可用指标：${detail.metrics.slice(0, 5).map((m) => m.metric_code).join(", ")} 等 ${detail.metrics.length} 个）。`,
            [],
            [],
            "insufficient_evidence",
          ),
        ],
      };
    }
    const explanation = await explainMetric(db, metric.metric_value_id);
    const raw = (metric.raw_value as { value?: number | string; level?: string } | null);
    const facts: AgentFact[] = [
      fact(
        1,
        `${detail.country.name} 的 ${metric.metric_name}：原始值 ${raw?.value ?? raw?.level ?? "—"}，归一化 ${metric.normalized_value ?? "—"}，状态 ${metric.status}，证据质量 EQI ${metric.evidence_quality_index}%。`,
        metric.claim_ids,
        [metric.metric_value_id],
        metric.status,
      ),
    ];
    let id = 2;
    for (const claim of explanation.claims.slice(0, 3)) {
      facts.push(
        fact(
          id,
          `证据（${claim.source_type}，${claim.publisher}）：「${claim.quote_text}」（${claim.claim_id}）。`,
          [claim.claim_id],
          [metric.metric_value_id],
          "published",
        ),
      );
      id += 1;
    }
    return { tool: "explain_metric", facts };
  },
};

const queryEvidence: AgentTool = {
  name: "query_evidence",
  description: "查询已验证的证据（claim），可按国家/谓词过滤",
  async execute(db, input) {
    const countryId = typeof input.country_id === "string" ? input.country_id : undefined;
    const predicateCode = typeof input.predicate_code === "string" ? input.predicate_code : undefined;
    const scanRunId = typeof input.scan_run_id === "string" ? input.scan_run_id : await latestScanRunId(db);
    let claimIds: string[] | undefined;
    if (scanRunId !== null) {
      const values = await db
        .select({ id: metricValues.id })
        .from(metricValues)
        .where(eq(metricValues.scanRunId, scanRunId));
      claimIds = values.length === 0
        ? []
        : (await db
            .select({ id: metricEvidenceLinks.evidenceClaimId })
            .from(metricEvidenceLinks)
            .where(inArray(metricEvidenceLinks.metricValueId, values.map((value) => value.id))))
            .map((item) => item.id);
    }
    const claims = await queryVerifiedClaims(db, {
      ...(countryId !== undefined ? { countryId } : {}),
      ...(predicateCode !== undefined ? { predicateCode } : {}),
      ...(claimIds === undefined ? {} : { claimIds }),
      limit: 5,
    });
    const facts: AgentFact[] = claims.map((claim, index) => {
      const lowPrecision = claim.verification_method === "auto_low_precision";
      return fact(
        index + 1,
        `${claim.country_id.replace("cty_", "").toUpperCase()} ${claim.predicate_code} = ${claim.numeric_value ?? claim.text_value}（${lowPrecision ? "低精度自动准入" : claim.verification_status}，质量 ${claim.claim_quality_bps / 100}%，${claim.source_type}）：「${claim.quote_text}」`,
        [claim.claim_id],
        [],
        lowPrecision ? "provisional" : claim.verification_status,
      );
    });
    if (facts.length === 0) {
      facts.push(fact(1, "没有匹配的已验证证据。", [], [], "insufficient_evidence"));
    }
    return { tool: "query_evidence", facts };
  },
};

export const AGENT_TOOLS: readonly AgentTool[] = [
  conversation,
  getCurrentScenario,
  queryCountryRanking,
  getCountryDetail,
  compareCountries,
  explainMetricTool,
  queryEvidence,
];

export const AGENT_TOOL_NAMES: readonly string[] = AGENT_TOOLS.map((tool) => tool.name);
