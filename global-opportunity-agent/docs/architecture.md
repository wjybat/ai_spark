# MVP 架构与运行链路

```text
global-opportunity-radar
        │ POST /api/agent/runs
        │ GET  /events (SSE)
        ▼
Fastify API + in-memory RunStore
        │
        ▼
@earendil-works/pi-agent-core Agent
        │ sequential tool calls + lifecycle events
        ├─ 1 scan_market
        ├─ 2 generate_customer_pool
        ├─ 3 build_customer_profile
        ├─ 4 detect_opportunity_signals
        ├─ 5 assess_customer_admission
        ├─ 6 build_evidence_chain
        ├─ 7 match_dmall_capabilities
        ├─ 8 assess_customer_risks
        └─ 9 generate_research_brief
                │
                ▼
Evidence retriever + typed knowledge base + deterministic analysis
```

## 关键设计

1. **先检索、再判断、后生成**：工具从证据库读取事实，再生成准入、匹配、风险和 Brief。
2. **可解释**：所有判断携带 `evidenceIds`，前端可展示原始来源。
3. **事实与推断分离**：每条证据有 `kind=fact|inference`、来源等级和置信度。
4. **人工确认门禁**：预算、RFP、决策链、部署和系统版本缺失时不作绝对判断。
5. **稳定路演模式**：无密钥时使用 pi-ai faux provider 驱动真实 Agent 工具循环；不是预先返回一个静态 JSON。
6. **Live 可切换**：提供 OpenAI/Anthropic provider，复用完全相同的工具合同。

## MVP 边界

- 运行状态保存在内存中，服务重启后清空；路演足够，生产化可换持久 Session backend。
- 首批客户知识库来自两份飞书材料；不在运行时爬取第三方网页，避免路演受网络和站点策略影响。
- 机会分与准入标签用于排序和讨论，不代表成交概率。
- 法规提示不替代当地律师或合规顾问。
