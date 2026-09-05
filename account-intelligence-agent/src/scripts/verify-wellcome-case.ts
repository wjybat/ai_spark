import { getDb } from "../lib/db";
import { safeJson } from "../lib/utils";

const db = getDb();
const customer = db.prepare("SELECT id,name,category,stage,status FROM customers WHERE normalized_name=?").get("香港惠康") as { id: string; name: string; category: string; stage: string; status: string } | undefined;
if (!customer) throw new Error("测试失败：未找到客户“香港惠康”");

const sourceStats = db.prepare("SELECT COUNT(*) total,SUM(CASE WHEN processing_status='DONE' THEN 1 ELSE 0 END) done FROM source_items WHERE customer_id=?").get(customer.id) as { total: number; done: number };
const eventCount = (db.prepare("SELECT COUNT(*) count FROM customer_events WHERE customer_id=?").get(customer.id) as { count: number }).count;
const factRows = db.prepare("SELECT fact_type,evidence_text FROM customer_facts WHERE customer_id=? AND is_current=1").all(customer.id) as unknown as Array<{ fact_type: string; evidence_text: string | null }>;
const factStats = Object.fromEntries([...new Set(factRows.map((row) => row.fact_type))].map((type) => [type, factRows.filter((row) => row.fact_type === type).length]));
const experienceTypes = new Set((db.prepare("SELECT experience_type FROM customer_experiences WHERE customer_id=?").all(customer.id) as unknown as Array<{ experience_type: string }>).map((row) => row.experience_type));
const summary = db.prepare("SELECT next_actions_json FROM customer_summaries WHERE customer_id=?").get(customer.id) as { next_actions_json: string } | undefined;
const nextActions = safeJson<string[]>(summary?.next_actions_json, []);

const checks: Array<[string, boolean, unknown]> = [
  ["三份来源材料均处理完成", sourceStats.total === 3 && sourceStats.done === 3, sourceStats],
  ["客户状态为未转化/方案/活跃", customer.category === "UNCONVERTED" && customer.stage === "SOLUTION" && customer.status === "ACTIVE", customer],
  ["时间线包含至少三个事件", eventCount >= 3, eventCount],
  ["已提取成功因素", (factStats.SUCCESS_FACTOR || 0) > 0, factStats.SUCCESS_FACTOR || 0],
  ["已提取失败原因", (factStats.FAILURE_REASON || 0) > 0, factStats.FAILURE_REASON || 0],
  ["已提取可复用打法", (factStats.PLAYBOOK || 0) > 0, factStats.PLAYBOOK || 0],
  ["全部当前事实均可溯源至证据原文", factRows.length > 0 && factRows.every((fact) => fact.evidence_text?.trim()), `${factRows.filter((fact) => fact.evidence_text?.trim()).length}/${factRows.length}`],
  ["三类客户经验均已生成", ["SUCCESS", "FAILURE", "PLAYBOOK"].every((type) => experienceTypes.has(type)), [...experienceTypes]],
  ["下一步建议不为空", nextActions.length > 0, nextActions.length],
];

for (const [label, passed, actual] of checks) console.log(`${passed ? "✓" : "✗"} ${label}：${JSON.stringify(actual)}`);
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
else console.log(`\n香港惠康项目案例通过 ${checks.length}/${checks.length} 项验收。`);
