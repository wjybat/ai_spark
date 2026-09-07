import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Keep the written answers aligned with the presentation's single data source.
const frontend = new URL("../../global-opportunity-radar/", import.meta.url);
const sandbox = { window: {} };
for (const file of ["data.js", "continent-data.js"]) runInNewContext(readFileSync(new URL(file, frontend), "utf8"), sandbox);
const data = sandbox.window.OPPORTUNITY_DATA;
const meta = data.continentMeta;
const link = item => `[${item.title}](${item.url})`;
const lines = ["# 大洲层市场简报：框架问题的逐洲回答", "", `资料快照：${meta.asOf}。展会收录范围：${meta.windowStart} 至 ${meta.windowEnd}。`, "", "本简报为可展示演示稿；市场结构和切入建议是区域研判，带来源的指标为国家、集团或活动样本。", "", meta.countMethod, "", meta.scoreMethod, "", meta.scopeNote, "", "## 五洲速览", "", "| 大洲 | 规模指标一 | 规模指标二 | 窗口内已收录展会 | 核心判断 |", "| --- | --- | --- | --- | --- |"];
for (const region of Object.values(data.regions)) {
  const m = region.market;
  lines.push(`| ${region.name} | ${m.countMetrics[0].label}：${m.countMetrics[0].value}（${m.countMetrics[0].meta}） | ${m.countMetrics[1].label}：${m.countMetrics[1].value}（${m.countMetrics[1].meta}） | ${m.events.length}场 | ${m.thesis} |`);
}
for (const region of Object.values(data.regions)) {
  const m = region.market;
  const metricSources = m.countMetrics.map(item => item.source).filter(Boolean);
  const metricSourceText = metricSources.length ? ` 来源：${metricSources.map(link).join("；")}` : "";
  lines.push("", `## ${region.name}`, "", "### 1. 零售市场整体情况", "", m.summary, "", m.structure, "", `主要业态：${m.formats.join("、")}。`, "", `重点市场：${m.focus.map(item => `${item.name}（${item.reason}）`).join("；")}。`, "", `代表零售集团 / 品牌：${m.retailers.join("、")}。这些名称用于理解市场版图，不代表已确认的销售线索。`, "", `公开资料切片：**${m.snapshot.value}${m.snapshot.unit || ""}**，${m.snapshot.label}。${m.snapshot.scope} 来源：${link(m.snapshot.source)}。`, "", "### 2. 公开规模指标", "", m.countNote + metricSourceText, "", `当前项目单独收录 ${region.countryIds.length} 个国家详情、${region.customerNames.length} 组客户样本。市场总量、门店数和客户样本不能混用。`, "", "### 3. 2025 年 9 月至 2026 年 12 月有哪些零售相关展会", "", "| 展会 | 日期 | 举办地 | 主题 | 跟进方向 | 依据 |", "| --- | --- | --- | --- | --- | --- |");
  for (const e of m.events) lines.push(`| ${e.name} | ${e.start} — ${e.end} | ${e.city} | ${e.theme} | ${e.followUp} | ${link(e.source)} |`);
  lines.push("", "### 4. 市场活跃度、数字化水平、扩张信号和风险", "", "| 维度 | 演示评分 | 判断 | 解释 |", "| --- | --- | --- | --- |");
  for (const d of m.dimensions) lines.push(`| ${d.label} | ${d.score}/100 | ${d.verdict} | ${d.detail} |`);
  lines.push("", "风险分越高表示进入风险越大。以下信号中的建议均为分析推断，不表示已确认采购意向。", "", "值得跟进的信号：", "");
  for (const s of m.signals) lines.push(`- **${s.title}（${s.type}）**：${s.detail} 建议：${s.action}${s.source ? ` 依据：${link(s.source)}。` : "（场景研判，无具体采购依据。）"}`);
  lines.push("", "主要风险与应对：", "");
  for (const r of m.risks) lines.push(`- **${r.title}**：${r.detail} 应对：${r.response}`);
  lines.push("", `**下一步建议：**${m.nextStep}`);
}
writeFileSync(new URL("../../docs/大洲层_市场简报.md", import.meta.url), lines.join("\n") + "\n");
console.log("已更新 docs/大洲层_市场简报.md");
