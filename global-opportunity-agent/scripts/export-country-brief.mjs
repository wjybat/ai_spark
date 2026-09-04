import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const frontend = new URL("../../global-opportunity-radar/", import.meta.url);
const sandbox = { window: {} };
for (const file of ["data.js", "country-data.js"]) runInNewContext(readFileSync(new URL(file, frontend), "utf8"), sandbox);
const data = sandbox.window.OPPORTUNITY_DATA;
const meta = data.countryMeta;
const link = s => `[${s.title}](${s.url})`;
const lines = ["# 国家层市场概况与市场雷达", "", `资料快照：${meta.asOf}。覆盖项目原有五洲的 11 个国家。`, "", "本文件逐项回答《大洲+国家_数据框架》的国家层六个问题、国家市场雷达五个问题，与前端“国家概况 / 市场与商机”使用同一份数据。", "", "## 演示口径", "", meta.countMethod, "", meta.metricMethod, "", meta.scoreMethod, "", meta.signalMethod, "", "## 国家速览", "", "| 国家 | 市场定位 | 优先分（演示） | 判断 | 年度规模（演示） |", "| --- | --- | --- | --- | --- |"];
for (const country of Object.values(data.countries)) {
  const r = country.research;
  lines.push(`| ${country.name} | ${r.positioning} | ${r.score}/100 | ${r.verdict} | ${r.size} |`);
}
for (const country of Object.values(data.countries)) {
  const r = country.research;
  lines.push("", `## ${country.name}`, "", "### 国家层 1：零售市场概况", "", r.summary, "", r.structure,
    "", "### 国家层 2：零售公司、门店与连锁品牌数量", "", ...r.counts.map(c => `- ${c.label}：**${c.value}${c.unit}**（${c.basis}）。`), "", `单独列示的项目客户样本：${r.sample.name}，${r.sample.stores}。${r.sample.detail} 来源：${link(r.sample.source)}。`,
    "", "### 国家层 3：主要零售业态", "", ...r.formats.map(f => `- **${f.name}**：${f.detail}`),
    "", "### 国家层 4：规模、增长与电商渗透", "", "| 指标 | 数值 | 时段 | 范围与依据 |", "| --- | --- | --- | --- |");
  for (const m of r.metrics) lines.push(`| ${m.label} | ${m.value} | ${m.period} | ${m.scope}；${m.basis}${m.source ? `，${link(m.source)}` : ""} |`);
  lines.push("", "### 国家层 5：成熟度、扩张、竞争与风险", "", "四维评分为独立演示判断；竞争与风险分越高表示挑战越大。", "", "| 维度 | 分值 | 判断 | 原因 |", "| --- | --- | --- | --- |");
  for (const d of r.dimensions) lines.push(`| ${d.label} | ${d.score}/100 | ${d.verdict} | ${d.detail} |`);
  lines.push("", "### 国家层 6：近期新闻、展会、公告与其他信号", "");
  for (const s of r.signals) lines.push(`- **${s.title}**（${s.type}；${s.period}；${s.scope}）：${s.detail} 跟进方向：${s.action} 来源：${(s.sources || [s.source]).filter(Boolean).map(link).join("；")}。`);
  lines.push("", `招聘与公告观察：${r.watch}`, "", "### 市场雷达 1：是否值得重点看", "", `**${r.verdict}，国别优先分 ${r.score}/100（演示研判）**。方向：${r.priority}。`,
    "", "### 市场雷达 2：为什么值得看", "", ...r.reasons.map(x => `- ${x}`),
    "", "### 市场雷达 3：机会在哪里", "", ...r.opportunities.map(x => `- **${x.title}**：${x.detail}`),
    "", "### 市场雷达 4：风险与应对", "", ...r.risks.map(x => `- **${x.title}**：${x.detail}`),
    "", "### 市场雷达 5：适合切入的零售场景", "", "以下为建议试点范围及观察指标，不是客户承诺或已经发生的项目。", "", "| 场景 | 建议范围 | 观察指标 |", "| --- | --- | --- |");
  for (const s of r.scenarios) lines.push(`| ${s.name} | ${s.scope} | ${s.metric} |`);
  lines.push("", `**下一步：**${r.nextStep}`, "", "参考资料：", "", ...r.sources.map(s => `- ${link(s)}`));
}
writeFileSync(new URL("../../docs/国家层_市场概况与雷达.md", import.meta.url), lines.join("\n") + "\n");
console.log("已更新 docs/国家层_市场概况与雷达.md（11 个国家）");
