import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const frontend=new URL("../../global-opportunity-radar/",import.meta.url);
const sandbox={window:{}};
for(const file of ["data.js","country-data.js","country-brief-data.js"])runInNewContext(readFileSync(new URL(file,frontend),"utf8"),sandbox);
const data=sandbox.window.OPPORTUNITY_DATA;
const lines=["# 国家管理层简报：三家企业综合研判","",`演示资料快照：${data.countryMeta.asOf}。覆盖原有五洲、11 国，每国三家企业，共 33 份国别企业档案。`,"","本文件是页面未运行模型前的演示预览，逐项回答管理层简报六个问题。页面点击“生成国家简报”后，由模型逐家读取三份档案并重新综合生成六部分内容；不会把第一家客户的作战包当作国家简报。","","补充档案包含企业定位、门店口径、财务边界、业务布局、数字化场景、系统与组织、动态、机会和风险。事实附来源；缺乏明确依据的场景标为研判，未给私营企业捏造财务或预算。","","国家简报与客户作战包独立保存于当前页面会话。国家页只发起三家综合简报；进入客户雷达第一家企业后，才发起该企业的原有九步作战包流程。"];
for(const c of Object.values(data.countries)){
 const a=c.research.managementDraft,companies=c.research.companies;
 lines.push("",`## ${c.name}`,"",`分析样本：${companies.map(x=>x.name).join("、")}。`,"",a.executiveSummary,"","### 1. 在所属区域里的优先级","",`**${a.regionalPriority.level} · ${a.regionalPriority.score}/100（演示研判）**。${a.regionalPriority.rationale}`,"","### 2. 核心机会逻辑","",a.opportunityLogic,"","三家企业比较：","");
 for(const item of a.companyAssessments)lines.push(`- **${companies.find(x=>x.id===item.companyId).name}**：${item.role}。机会：${item.opportunity} 风险：${item.risk} 建议：${item.recommendedAction}`);
 lines.push("","### 3. 最重要的机会信号","",...a.keySignals.map(s=>`- **${s.title}（${s.basis}）**：${s.detail}`),"","### 4. 主要风险与应对","",...a.risks.map(r=>`- **${r.title}**：${r.detail} 应对：${r.mitigation}`),"","### 5. 下一步怎么做","",...a.nextActions.map(n=>`- **${n.horizon} / ${n.owner}**：${n.action} 交付：${n.deliverable}`),"","### 6. 当前判断的置信度","",`**${a.confidence.level}**。${a.confidence.rationale}`,"",...a.confidence.gaps.map(g=>`- 待确认：${g}`),"","### 三家企业资料与补充口径","");
 for(const p of companies){lines.push(`#### ${p.name}`,"",p.summary,"",`门店：${p.footprint}。${p.footprintScope}。`,"",`财务：${p.financial}`,"",`业务：${p.business.join("；")}`,"",`数字化：${p.digital.join("；")}`,"",`系统：${p.systems.join("；")}`,"",`组织：${p.organization} 角色：${p.roles.join(" / ")}`,"",`动态：${p.signals.join("；")}`,"",...p.evidence.map(e=>`- **${e.kind==="fact"?"事实":"研判"} / ${e.scope}**：${e.text}${e.source?` [${e.source.title}](${e.source.url})。`:""}`),"");}
}
writeFileSync(new URL("../../docs/国家层_管理层简报.md",import.meta.url),lines.join("\n")+"\n");
console.log("已更新国家管理层简报：11 国、33 份企业档案");
