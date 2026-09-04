# 海外商机决策 Agent MVP

基于 [`@earendil-works/pi-agent-core`](https://github.com/earendil-works/pi/tree/main/packages/agent) 的 TypeScript MVP。一个进程同时提供 Agent API、SSE 事件流和现有 `global-opportunity-radar` 路演前端。

## 立即运行

要求 Node.js `>=22.19.0`（当前已在 Node.js 24 验证）。

```bash
cd /Users/wangjuanyi/Projects/ai_spark/global-opportunity-agent
npm install
npm run dev
```

打开 [http://127.0.0.1:8787](http://127.0.0.1:8787)。不需要再单独启动前端静态服务器。

前端的最终结论、运行完成弹窗与工作包统一支持 Markdown 标题、列表、表格、引用和代码块。渲染前会清洗 HTML、过滤危险链接，复制内容保持原始文本不变。

`npm run dev` / `npm run build` 会把锁定版本的 Marked 和 DOMPurify 本地打包为 `global-opportunity-radar/assets/markdown-renderer.js`，不新增运行时 CDN 依赖。修改渲染器后也可单独执行 `npm run build:markdown`。生产启动前按上面的说明安装依赖并构建。

默认 `AGENT_MODE=auto`。没有模型密钥时自动使用 `demo` provider：它不是前端计时器，而是 `pi-agent-core` 的真实 Agent 循环、9 个真实工具调用、事件订阅和结构化结果；工具从真实样例知识库检索证据并计算结果，因此路演无需外部模型也能稳定运行。

## 国家详情与结果回填

顶部“重新扫描市场”是纯前端流程演示：依次推进资料对齐、市场汇总、客户归并、雷达更新四个节点，完成后可查看现有资料的整体市场与客户池。不创建后端运行、不调用模型、不抓取新资料，也不覆盖已生成的客户结果。“生成 BD 作战包”才会运行后端 P0 2–10 完整链路。

运行前保留原始调研资料；成功运行后，同一份后端结果分别回填国家层级的市场与商机、客户雷达和管理层简报。客户雷达只展示客户池卡片，点击主客户后进入客户层级，以客户概览、业务布局、数字化与系统、动态与组织、资料来源、销售建议和作战卡 7 个分页承载前置搜集资料与分析结果。原有智能分析结果分页和工作包继续保留。

各页标注运行 ID、完成时间、模式与分析范围。Agent 请求携带当前国家 ID/名称，运行结果和管理层简报以国家为主报告范围；当前公司是首个潜在客户样本，后续客户发现可继续扩充名单。区域评分、集团规模不等同于所选国家的数据。live 模式的能力匹配、英文开发邮件及最终结论由模型生成，其余结构化内容来自证据工具链。管理层简报的显示和复制使用同一份内容。

重新运行期间保留上次成功结果，成功后整体替换，失败不覆盖。结果目前按国家保存在当前页面内存中，刷新后需要重新运行；切换到未运行的国家仍显示调研资料。

## 公司 AI Router Live 模式

项目内置 Dmall AI Router provider，使用 OpenAI Responses 协议：

```dotenv
AGENT_MODE=live
AGENT_PROVIDER=dmall-router
AGENT_BASE_URL=https://ai-router.dmall.com/v1
AGENT_MODEL=gpt-5.6-luna
AGENT_THINKING_EFFORT=high
DMALL_AI_API_KEY=<仅保存在本地 .env>
```

运行一次真实链路：

```bash
npm run live
```

API Key 不应写入源码、`.env.example`、日志或版本库。本次验证报告见 [live-model-evaluation.md](./docs/live-model-evaluation.md)。

## 其他 Live 模型

复制 `.env.example` 为 `.env`，选择一个 provider：

```dotenv
AGENT_MODE=live
AGENT_PROVIDER=openai
AGENT_MODEL=gpt-5-mini
OPENAI_API_KEY=...
```

或：

```dotenv
AGENT_MODE=live
AGENT_PROVIDER=anthropic
AGENT_MODEL=<pi-ai catalog 中的 Anthropic model id>
ANTHROPIC_API_KEY=...
```

所有 Live 模式共享证据库和人工确认门禁。当前 pi Agent 在第 7 阶段直接撰写能力匹配的结构化工具参数，在第 9 阶段直接撰写英文邮件；这不是额外启动多个子 Agent，也不是先跑规则匹配再润色。后端校验能力 ID、分数范围、证据归属和英文邮件格式，保留基础能力约束，再把接受后的结果交给后续阶段与前端。

demo 模式仍使用规则匹配和邮件模板，并明确标注来源。live 模式缺少/校验不通过的生成内容会让模型在同一阶段修正，连续三次失败则终止，不静默回退成模板。证据 ID 有效并不等于语义完全正确；所有匹配建议与邮件仍需人工审核。详见 [material-generation.md](./docs/material-generation.md)。

## P0 功能点 2–10

| 功能点 | Agent 工具 | 主要输出 |
|---|---|---|
| 2 市场雷达 | `scan_market` | 市场热度、维度解释、推荐国家、证据 |
| 3 目标客户池 | `generate_customer_pool` | 真实客户池、统一排序依据、信息缺口扣分 |
| 4 客户画像 | `build_customer_profile` | 体量、业态、区域、IT、系统、组织和动态 |
| 5 商机信号 | `detect_opportunity_signals` | 扩张、数字化、系统和活动信号，事实/推断分层 |
| 6 客户准入 | `assess_customer_admission` | 高潜/可跟进/观察中等建议、参考分、待确认项 |
| 7 证据链 | `build_evidence_chain` | 来源、时间、摘要、A/B/C 级、置信度和原文链接 |
| 8 能力匹配 | `match_dmall_capabilities` | Dmall 切入模块、匹配原因、前置条件、禁止宣称 |
| 9 风险提示 | `assess_customer_risks` | 系统、本地化、合规、预算、决策链和证据缺口 |
| 10 研究 Brief | `generate_research_brief` | 摘要、拜访问题、英文邮件、内部协同和下一步 |

## 首批真实样例

- Cencosud：南美多国家、多业态零售集团。
- Sigma Healthcare / Chemist Warehouse：澳新药房、批发、加盟和物流生态。
- Loblaw Companies Limited：加拿大食品、药房、会员、电商与自动化配送中心网络。

事实来自年报、官方公告、官方供应商案例和活动名单；Agent 推断单独标记为 `inference`，不会伪装成事实。详见 [source-manifest.md](./docs/source-manifest.md)。

## API

- `GET /api/health`：运行模式与 P0 能力。
- `GET /api/catalog`：区域、客户与 Dmall 能力目录。
- `GET /api/evidence/:customerId`：客户证据链。
- `POST /api/agent/runs`：创建 Agent 运行。
- `GET /api/agent/runs/:runId/events`：SSE 实时事件。
- `GET /api/agent/runs/:runId`：状态和最终结构化结果。

创建运行示例：

```bash
curl -X POST http://127.0.0.1:8787/api/agent/runs \
  -H 'content-type: application/json' \
  -d '{"regionId":"canada","countryId":"canada","countryName":"加拿大","customerId":"loblaw","mode":"demo"}'
```

## 验证

```bash
npm run typecheck
npm test
npm run build
npm run demo
```

当前测试覆盖三家客户的 P0 4–10、完整 pi Agent 工具顺序、HTTP 创建/完成运行链路，以及多页回填、最小化后持续运行、重新运行更新、跨国家隔离、Markdown 安全渲染和简报复制一致性。
