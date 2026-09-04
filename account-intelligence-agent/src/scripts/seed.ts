import { createCustomer } from "../lib/customers";
import { getDb, transaction } from "../lib/db";
import { ingest } from "../lib/ingestion";
import { processNext } from "../lib/processor";
import type { CustomerRow } from "../lib/types";

const db = getDb();
const demos = [
  {
    customer: { name: "Tesco", country: "英国", industry: "食品零售", owner: "Jack Smith" },
    sources: [
      { id: "requirements", days: 35, title: "Tesco 需求研讨会", content: "客户需要降低门店损耗并提升防损效率，需求调研已经完成。" },
      { id: "scale", days: 30, title: "Tesco 规模化讨论", content: "客户希望方案可以扩展到 500 家门店。" },
      { id: "integration", days: 28, title: "Tesco 系统集成讨论", content: "客户需要方案与现有门店系统无缝集成。" },
      { id: "poc", days: 24, title: "Tesco PoC 方案确认", content: "Tesco 客户已确认选择 10 家门店开展 PoC，技术评价积极。" },
      { id: "budget", days: 9, title: "Tesco 预算跟进", content: "CFO 对商业价值存在顾虑，预算审批未通过，ROI 模型仍不清晰。" },
      { id: "pause", days: 0, title: "Tesco 项目状态更新", content: "项目因 ROI、预算审批和内部资源投入问题而暂停，客户计划明年一季度重新评估。" },
    ],
  },
  {
    customer: { name: "Carrefour", country: "法国", industry: "食品零售", owner: "Marie Chen" },
    sources: [{ id: "rollout", days: 1, title: "Carrefour 部署周报", content: "Carrefour 合同已签并开始部署 120 家门店，方案效果良好，正在规划扩展。" }],
  },
  {
    customer: { name: "Lidl", country: "德国", industry: "食品零售", owner: "Jack Smith" },
    sources: [{ id: "solution", days: 3, title: "Lidl 方案演示", content: "已向 Lidl 完成方案演示，客户认可方案，希望进一步确认门店系统集成需求。" }],
  },
  {
    customer: { name: "Metro", country: "德国", industry: "零售", owner: "Alice Wang" },
    sources: [{ id: "production", days: 4, title: "Metro 上线复盘", content: "Metro 已正式上线 86 家门店并投入生产，客户给出积极反馈。" }],
  },
] as const;

for (const demo of demos) {
  const existing = db.prepare("SELECT * FROM customers WHERE normalized_name=?").get(demo.customer.name.toLowerCase()) as CustomerRow | undefined;
  const customer = existing || transaction(db, () => createCustomer(db, { ...demo.customer, aliases: [], profile: {} }));
  for (const source of demo.sources) transaction(db, () => ingest(db, {
    source_type: "MEETING", source_system: "demo", external_id: `demo-${demo.customer.name.toLowerCase()}-${source.id}`,
    customer: { id: customer.id }, title: source.title, content: source.content,
    occurred_at: new Date(Date.now() - source.days * 86400_000).toISOString(), author: demo.customer.owner, metadata: { demo: true }, auto_create_customer: false,
  }));
}

if (!db.prepare("SELECT id FROM customers WHERE normalized_name='walmart'").get()) transaction(db, () => {
  createCustomer(db, { name: "Walmart", country: "美国", industry: "综合零售", owner: "John Lee", aliases: [], profile: { note: "市场调研阶段" } });
});
while (await processNext(db)) { /* drain demo jobs */ }
console.log("演示数据已就绪");
