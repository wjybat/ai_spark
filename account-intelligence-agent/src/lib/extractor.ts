import { createHash } from "node:crypto";
import { extractionSchema, type Extraction } from "./types";

const eventPatterns: Array<[Extraction["events"][number]["event_type"], string[], number]> = [
  ["LOST", ["项目丢失", "输单", "放弃项目", "lost the deal"], 10],
  ["CONTRACT_SIGNED", ["合同已签", "签署合同", "成功签约", "contract signed"], 10],
  ["PRODUCTION_STARTED", ["正式上线", "投入生产", "production started", "go-live"], 10],
  ["DEPLOYMENT_STARTED", ["开始部署", "启动部署", "deployment started"], 9],
  ["COMMERCIAL_STARTED", ["商务谈判", "商务阶段", "报价沟通", "commercial"], 8],
  ["PROJECT_RESUMED", ["项目恢复", "重新启动", "resumed"], 8],
  ["PROJECT_PAUSED", ["项目暂停", "暂停", "暂缓", "搁置", "stalled", "paused"], 9],
  ["BUDGET_REJECTED", ["预算未通过", "预算审批未通过", "预算被拒", "budget rejected", "budget approval pending"], 8],
  ["BUDGET_APPROVED", ["预算已批准", "预算通过", "budget approved"], 8],
  ["POC_COMPLETED", ["poc 已完成", "poc完成", "完成 poc", "completed poc"], 8],
  ["POC_STARTED", ["启动 poc", "开始 poc", "poc started", "开展poc", "开展 poc"], 8],
  ["POC_PROPOSED", ["poc", "概念验证", "试点验证"], 7],
  ["SOLUTION_PRESENTED", ["方案演示", "方案汇报", "solution presented", "业务蓝图签字", "solution 业务确认", "solution业务确认", "方案设计"], 6],
  ["REQUIREMENT_IDENTIFIED", ["客户需要", "客户希望", "需求", "requirement"], 6],
  ["DISCOVERY_COMPLETED", ["需求调研", "调研完成", "discovery completed"], 6],
  ["FIRST_CONTACT", ["首次沟通", "初次联系", "first contact"], 5],
  ["NEGATIVE_FEEDBACK", ["负面反馈", "不满意", "效果不好", "negative feedback"], 6],
  ["POSITIVE_FEEDBACK", ["积极反馈", "效果良好", "认可方案", "positive feedback"], 6],
];

function sentenceWith(content: string, needle: string): string {
  const lines = content.split("\n");
  const headingIndex = lines.findIndex((line) => /^#{1,6}\s+/.test(line) && line.toLocaleLowerCase().includes(needle));
  const candidate = headingIndex >= 0 ? lines.slice(headingIndex + 1).find((line) => line.trim()) : content.split(/[。！？\n.!?]/).find((part) => part.toLocaleLowerCase().includes(needle));
  return (candidate || content.slice(0, 200)).trim().replace(/^[-*]\s+/, "").replace(/^#{1,6}\s+/, "").replaceAll("**", "").slice(0, 300);
}

function sectionBullets(content: string, names: string[]): string[] {
  const values: string[] = []; let activeLevel = 0;
  for (const line of content.split("\n")) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (activeLevel && level <= activeLevel) activeLevel = 0;
      if (names.some((name) => heading[2].includes(name))) activeLevel = level;
      continue;
    }
    if (!activeLevel) continue;
    const bullet = line.match(/^[-*]\s+(.+)$/)?.[1]?.trim();
    if (bullet) values.push(bullet);
  }
  return values;
}

export function heuristicExtract(content: string, occurredAt: string | null): Extraction {
  const lowered = content.toLowerCase();
  const events: Extraction["events"] = [];
  for (const [eventType, needles, importance] of eventPatterns) {
    const needle = needles.find((value) => lowered.includes(value));
    if (needle) {
      const evidence = sentenceWith(content, needle);
      events.push({ event_type: eventType, occurred_at: occurredAt, summary: evidence.slice(0, 240), importance, confidence: 0.72, evidence_text: evidence });
    }
  }
  if (!events.length) events.push({ event_type: "FIRST_CONTACT", occurred_at: occurredAt, summary: "收到新的客户沟通材料", importance: 4, confidence: 0.5, evidence_text: content.slice(0, 200) });

  const facts: Extraction["facts"] = [];
  const store = content.match(/(\d[\d,]*)\s*(?:家|个)?\s*(?:门店|stores?)/i);
  if (store) facts.push({ fact_type: "STORE_COUNT", fact_key: "store_count", fact_value: store[1].replaceAll(",", ""), confidence: 0.88, evidence_text: store[0] });
  if (lowered.includes("roi")) facts.push({ fact_type: "SUCCESS_METRIC", fact_key: "roi", fact_value: "需要明确 ROI 衡量模型", confidence: 0.76, evidence_text: "ROI" });
  if (lowered.includes("roi") && ["不清晰", "不明确", "concern", "pending"].some((word) => lowered.includes(word))) facts.push({ fact_type: "BLOCKER", fact_key: "roi_clarity", fact_value: "ROI 模型尚未清晰定义", confidence: 0.82, evidence_text: "ROI" });
  if (["预算未通过", "预算审批", "budget approval", "budget rejected"].some((word) => lowered.includes(word))) facts.push({ fact_type: "BLOCKER", fact_key: "budget_approval", fact_value: "预算审批尚未通过", confidence: 0.84, evidence_text: "预算审批" });
  if (["内部资源", "资源投入", "resource allocation"].some((word) => lowered.includes(word))) facts.push({ fact_type: "BLOCKER", fact_key: "internal_resource", fact_value: "内部资源投入仍待协调", confidence: 0.76, evidence_text: "内部资源" });
  const requirementNeedle = ["客户希望", "客户需要", "需求", "requirement"].find((word) => lowered.includes(word));
  if (requirementNeedle) {
    const evidence = sentenceWith(content, requirementNeedle);
    const requirementKey = createHash("sha1").update(evidence).digest("hex").slice(0, 10);
    facts.push({ fact_type: "REQUIREMENT", fact_key: `requirement_${requirementKey}`, fact_value: evidence.slice(0, 240), confidence: 0.7, evidence_text: evidence });
  }
  const addSectionFacts = (factType: "SUCCESS_FACTOR" | "PLAYBOOK", names: string[]) => sectionBullets(content, names).forEach((value) => {
    const key = createHash("sha1").update(`${factType}:${value}`).digest("hex").slice(0, 10);
    facts.push({ fact_type: factType, fact_key: `${factType.toLocaleLowerCase()}_${key}`, fact_value: value.slice(0, 300), confidence: 0.82, evidence_text: value });
  });
  addSectionFacts("SUCCESS_FACTOR", ["成功经验", "量化成果", "量化产出"]);
  addSectionFacts("PLAYBOOK", ["可复用打法", "复用方法", "项目管理经验"]);
  const failureParagraph = content.split(/\n{2,}/).find((paragraph) => paragraph.includes("延期") && (paragraph.includes("原因") || paragraph.includes("由于")))?.trim();
  if (failureParagraph) {
    const value = failureParagraph.replace(/^#{1,6}\s*[^\n]+\n?/, "").trim().slice(0, 300);
    const key = createHash("sha1").update(value).digest("hex").slice(0, 10);
    facts.push({ fact_type: "FAILURE_REASON", fact_key: `failure_${key}`, fact_value: value, confidence: 0.84, evidence_text: value });
  }
  const nextActions: Extraction["next_actions"] = [];
  if (lowered.includes("roi")) nextActions.push({ action: "与客户共同确认 ROI 模型和成功指标", reason: "材料提到 ROI 风险" });
  if (lowered.includes("预算") || lowered.includes("budget")) nextActions.push({ action: "确认预算决策人和审批时间表", reason: "预算可能影响项目推进" });
  if (!nextActions.length) nextActions.push({ action: "确认客户下一次沟通时间和负责人", reason: "保持推进节奏" });
  return { events, facts, next_actions: nextActions };
}

function unwrapJson(value: string): unknown {
  return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

async function llmExtract(customerName: string, currentFacts: unknown[], content: string): Promise<Extraction> {
  const base = process.env.LLM_BASE_URL!.replace(/\/$/, "");
  const endpoint = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_SECONDS || 60_000));
  try {
    const response = await fetch(endpoint, {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.LLM_API_KEY || ""}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL, temperature: 0, response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是客户情报抽取器。只返回 JSON，字段为 events、facts、next_actions；只使用请求中允许的类型。" },
          { role: "user", content: JSON.stringify({ customer: customerName, current_facts: currentFacts, source_content: content }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`LLM 请求失败: ${response.status}`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return extractionSchema.parse(unwrapJson(result.choices?.[0]?.message?.content || "{}"));
  } finally { clearTimeout(timeout); }
}

export async function extract(customerName: string, currentFacts: unknown[], content: string, occurredAt: string | null): Promise<Extraction> {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_MODEL) return heuristicExtract(content, occurredAt);
  let error: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await llmExtract(customerName, currentFacts, content); } catch (caught) { error = caught; }
  }
  throw error;
}
