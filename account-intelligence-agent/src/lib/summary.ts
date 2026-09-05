import type { DatabaseSync } from "node:sqlite";
import type { CustomerRow } from "./types";
import { makeId, nowIso } from "./utils";

interface FactRow { fact_type: string; fact_value: string; source_item_id: string }
interface EventRow { event_type: string; summary: string; source_item_id: string }
const stages: Record<string, string> = { TARGET: "目标客户", RESEARCH: "调研", CONTACTED: "已联系", DISCOVERY: "需求探索", QUALIFIED: "需求确认", SOLUTION: "方案", POC: "PoC", COMMERCIAL: "商务", CONTRACT: "合同", DEPLOYMENT: "部署", PRODUCTION: "生产", EXPANSION: "扩展", CLOSED_LOST: "已流失" };
const statuses: Record<string, string> = { ACTIVE: "活跃", WAITING_CUSTOMER: "等待客户", WAITING_INTERNAL: "等待内部", STALLED: "停滞", WON: "赢单", LOST: "丢单" };
const unique = (values: string[], limit = 8) => [...new Set(values.filter(Boolean))].slice(0, limit);
const experienceKeywordRules: Array<[RegExp, string]> = [
  [/预算.*(?:审批|路径|决策)|(?:审批|路径|决策).*预算/i, "预算审批"],
  [/\bROI\b/i, "ROI 模型与指标"],
  [/跨系统|系统集成|接口定义/i, "跨系统集成"],
  [/Solution.*(?:延期|延误)|方案.*(?:延期|延误)/i, "方案确认延期"],
  [/SOW|Contract|合同.*(?:签署|商务)|商务签约/i, "合同与商务推进"],
  [/双语|英文术语/i, "双语交付"],
  [/会议纪要/i, "会议纪要"],
  [/风险.*预警|预警.*风险/i, "风险预警"],
  [/项目状态.*汇总|自动汇总/i, "项目状态自动汇总"],
  [/蓝图|原型/i, "蓝图与原型"],
  [/正向验证|认可方案|积极反馈/i, "方案正向验证"],
  [/停滞|重新确认优先级|项目重启/i, "项目推进"],
  [/\bPoC\b/i, "PoC 前置规划"],
  [/海外项目|时差|节假日/i, "海外项目交付"],
];

export function experienceKeyword(description: string): string {
  const normalized = description.replace(/^[#*\-\s]+/, "").replace(/\s+/g, " ").trim();
  const matched = experienceKeywordRules.find(([pattern]) => pattern.test(normalized));
  if (matched) return matched[1];
  const firstClause = normalized.split(/[，。；：\n]/, 1)[0].trim();
  return Array.from(firstClause || normalized).slice(0, 18).join("") || "客户经验";
}

export function refreshSummary(db: DatabaseSync, customerId: string): void {
  const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(customerId) as CustomerRow | undefined;
  if (!customer) throw new Error(`客户不存在: ${customerId}`);
  const facts = db.prepare("SELECT fact_type,fact_value,source_item_id FROM customer_facts WHERE customer_id=? AND is_current=1 ORDER BY created_at DESC LIMIT 30").all(customerId) as unknown as FactRow[];
  const events = db.prepare("SELECT event_type,summary,source_item_id FROM customer_events WHERE customer_id=? ORDER BY occurred_at DESC,importance DESC,confidence DESC,created_at DESC LIMIT 30").all(customerId) as unknown as EventRow[];
  const requirements = unique(facts.filter((f) => ["REQUIREMENT", "PRODUCT_INTEREST", "SUCCESS_METRIC"].includes(f.fact_type)).map((f) => f.fact_value));
  const blockers = unique(facts.filter((f) => ["BLOCKER", "BUDGET", "COMPETITOR"].includes(f.fact_type)).map((f) => f.fact_value));
  const actions = unique(facts.filter((f) => f.fact_type === "NEXT_ACTION").map((f) => f.fact_value));
  const types = new Set(events.map((event) => event.event_type));
  const successes = facts.filter((fact) => fact.fact_type === "SUCCESS_FACTOR").map((fact) => fact.fact_value);
  const failures = facts.filter((fact) => fact.fact_type === "FAILURE_REASON").map((fact) => fact.fact_value);
  const playbook = facts.filter((fact) => fact.fact_type === "PLAYBOOK").map((fact) => fact.fact_value);
  if (["POSITIVE_FEEDBACK", "POC_COMPLETED", "CONTRACT_SIGNED"].some((type) => types.has(type))) successes.push("方案获得客户正向验证，保持业务与技术团队协同");
  if (types.has("CONTRACT_SIGNED")) playbook.push("复用从需求确认、PoC 验证到商务签约的推进路径");
  if (types.has("BUDGET_REJECTED") || blockers.some((item) => item.includes("预算"))) {
    failures.push("预算审批是当前推进阻碍"); playbook.push("在 PoC 前确认预算路径和经济决策人"); actions.unshift("与预算决策人确认审批条件和时间表");
  }
  if (customer.status === "STALLED") { failures.push("客户推进已停滞，需要重新确认优先级"); actions.push("安排项目重启沟通并明确双方负责人"); }
  if ([...requirements, ...blockers].some((item) => item.toUpperCase().includes("ROI"))) { playbook.push("PoC 启动前共同定义 ROI 和成功指标"); actions.unshift("补充可量化的 ROI 模型与成功指标"); }
  if (!actions.length) actions.push("确认下一步行动、负责人和目标日期");
  const currentState = `客户当前处于${stages[customer.stage] || customer.stage}阶段，状态为${statuses[customer.status] || customer.status}。${events[0]?.summary || "尚未接入客户互动材料"}`;
  const evidence = unique(events.slice(0, 10).map((event) => event.source_item_id), 10);
  const now = nowIso();
  db.prepare(`INSERT INTO customer_summaries (customer_id,current_state,key_requirements_json,key_blockers_json,success_factors_json,failure_reasons_json,reusable_playbook_json,next_actions_json,evidence_json,generated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(customer_id) DO UPDATE SET current_state=excluded.current_state,key_requirements_json=excluded.key_requirements_json,
    key_blockers_json=excluded.key_blockers_json,success_factors_json=excluded.success_factors_json,failure_reasons_json=excluded.failure_reasons_json,
    reusable_playbook_json=excluded.reusable_playbook_json,next_actions_json=excluded.next_actions_json,evidence_json=excluded.evidence_json,generated_at=excluded.generated_at`)
    .run(customerId, currentState, JSON.stringify(requirements), JSON.stringify(blockers), JSON.stringify(unique(successes)), JSON.stringify(unique(failures)), JSON.stringify(unique(playbook)), JSON.stringify(unique(actions, 6)), JSON.stringify(evidence), now);
  db.prepare("DELETE FROM customer_experiences WHERE customer_id=?").run(customerId);
  const insert = db.prepare("INSERT INTO customer_experiences (id,customer_id,experience_type,stage,title,description,action,confidence,source_item_ids_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
  const sourcesFor = (factType: string, description: string) => {
    const sourceIds = unique(facts.filter((fact) => fact.fact_type === factType && fact.fact_value === description).map((fact) => fact.source_item_id), 5);
    return sourceIds.length ? sourceIds : evidence;
  };
  for (const description of unique(successes)) insert.run(makeId("exp"), customerId, "SUCCESS", customer.stage, experienceKeyword(description), description, null, 0.75, JSON.stringify(sourcesFor("SUCCESS_FACTOR", description)), now);
  for (const description of unique(failures)) insert.run(makeId("exp"), customerId, "FAILURE", customer.stage, experienceKeyword(description), description, null, 0.75, JSON.stringify(sourcesFor("FAILURE_REASON", description)), now);
  for (const description of unique(playbook)) insert.run(makeId("exp"), customerId, "PLAYBOOK", customer.stage, experienceKeyword(description), description, description, 0.72, JSON.stringify(sourcesFor("PLAYBOOK", description)), now);
}
