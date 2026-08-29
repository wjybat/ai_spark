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

默认 `AGENT_MODE=auto`。没有模型密钥时自动使用 `demo` provider：它不是前端计时器，而是 `pi-agent-core` 的真实 Agent 循环、9 个真实工具调用、事件订阅和结构化结果；工具从真实样例知识库检索证据并计算结果，因此路演无需外部模型也能稳定运行。

## 公司 AI Router Live 模式

项目内置 Dmall AI Router provider，使用 OpenAI Responses 协议：

```dotenv
AGENT_MODE=live
AGENT_PROVIDER=dmall-router
AGENT_BASE_URL=https://ai-router.dmall.com/v1
AGENT_MODEL=gpt-5.6-luna
AGENT_THINKING_EFFORT=xhigh
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

所有 Live 模式仍使用相同工具、证据库和人工确认门禁；模型负责编排和最终自然语言总结，结构化事实不由模型凭空生成。

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
  -d '{"regionId":"canada","customerId":"loblaw","mode":"demo"}'
```

## 验证

```bash
npm run typecheck
npm test
npm run build
npm run demo
```

当前测试覆盖三家客户的 P0 4–10、完整 pi Agent 工具顺序和 HTTP 创建/完成运行链路。
