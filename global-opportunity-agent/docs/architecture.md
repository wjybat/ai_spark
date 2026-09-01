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
        ├─ 7 match_dmall_capabilities (live: LLM authors analysis → validation)
        ├─ 8 assess_customer_risks
        └─ 9 generate_research_brief (live: LLM authors email → validation + Brief assembly)
                │
                ▼
Evidence retriever + typed knowledge base + deterministic analysis + model-authored material
```

## 关键设计

1. **先检索、再判断、后生成**：工具从证据库读取事实，再生成准入、匹配、风险和 Brief。
2. **可解释**：所有判断携带 `evidenceIds`，前端可展示原始来源。
3. **事实与推断分离**：每条证据有 `kind=fact|inference`、来源等级和置信度。
4. **人工确认门禁**：预算、RFP、决策链、部署和系统版本缺失时不作绝对判断。
5. **稳定路演模式**：无密钥时使用 pi-ai faux provider 驱动真实 Agent 工具循环；不是预先返回一个静态 JSON。
6. **Live 可切换**：提供 Dmall Router/OpenAI/Anthropic provider。live 的第 7/9 阶段要求模型提供生成内容，demo 保留规则/模板合同；最终结果结构兼容，并通过 `generation.source` 标明来源。
7. **生成与校验分离**：匹配排序、理由、试点范围、邮件主题和正文由当前 pi Agent 在工具调用参数中撰写。固定能力目录和事实证据是上下文约束；工具不伪造模型文本。只有成功执行才推进阶段；错误可原阶段修正，三次失败或超过 18 轮则结束。
8. **国家为报告范围**：前端任务携带 `countryId/countryName`；区域雷达只作为背景，当前客户作为首个潜客样本。最终结论不得以公司名作为整份报告标题，客户发现阶段可以继续扩充该国家的企业名单。

## MVP 边界

- 运行状态保存在内存中，服务重启后清空；路演足够，生产化可换持久 Session backend。
- 首批客户知识库来自两份飞书材料；不在运行时爬取第三方网页，避免路演受网络和站点策略影响。
- 机会分与准入标签用于排序和讨论，不代表成交概率。
- 法规提示不替代当地律师或合规顾问。
