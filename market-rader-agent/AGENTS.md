# AGENTS.md

## 1. 任务目标

你正在开发 Market Radar Agent MVP。产品面向海外市场拓展、战略分析和销售团队，输出东南亚五国的机会排名、指标拆解、重点零售商和证据链。

MVP 固定范围：

```text
国家：Vietnam、Indonesia、Thailand、Malaysia、Philippines
业态：Convenience Store、Mini Mart
产品档案：AI Video Analytics / Loss Prevention v1
权重策略：Overall、Growth First、Entry First
产品形态：Dashboard + Agent + Evidence
```

## 2. 执行协议

1. 先阅读全部实现文档，再修改代码。
2. 从 `TASKS.yaml` 中选择第一个 `status: todo` 且依赖全部完成的任务。
3. 一次只完成一个 Task ID。不得顺手扩大范围。
4. 开始前列出将修改的文件和该任务的验收命令。
5. 完成后运行类型检查、相关测试和任务验收命令。
6. 测试失败时先修复，不得把失败标记为已知问题后继续。
7. 更新 `TASKS.yaml`：`status: done`、`notes`、`changed_files`。
8. 每个任务形成一个原子提交，提交信息格式：`<type>(<area>): <Task ID> <summary>`。
9. Phase Gate 失败时停止后续 Phase。
10. 遇到文档没有定义的业务规则，不自行创造生产规则。使用显式 `TODO-BUSINESS-DECISION`，同时保持系统可运行、可测试和状态透明。

## 3. 不可违反的架构规则

### 3.1 事实与评分

- Agent 不是事实来源。
- LLM 输出只能进入 `EvidenceCandidate`，不能直接写 `EvidenceClaim`、`MetricValue`、`ScoreComponent` 或 `CountryScore`。
- 只有 `verification_status = verified`、`active = true`、未过期且在 Scenario 范围内的 Claim 可以进入 Metric Engine。
- Metric Engine 和 Scoring Engine 是确定性代码。
- 禁止通过 Prompt 计算分数、覆盖率、EQI、Priority 或排名。
- 缺失数据返回 `insufficient_evidence`，禁止静默填 0。
- 已发布的 Scenario Revision、Product Profile Revision、Metric Definition Set、Reference Set、Weight Profile、Scoring Model、Prompt Version 不允许原地修改。
- 任何修正都创建新版本或新记录，保留历史血缘。

### 3.2 分层依赖

允许的依赖方向：

```text
presentation/apps
  → agent/application/infrastructure/contracts
application
  → domain/contracts
agent
  → application/domain/contracts + Pi SDK
infrastructure
  → application/domain/contracts
contracts
  → 无业务实现依赖
domain
  → Node 标准库；不依赖 Next.js、Drizzle、Pi 或模型 SDK
```

禁止：

- `domain` 导入 Drizzle、Next.js、Pi、HTTP SDK。
- React Component 直接访问数据库。
- Route Handler 直接写 SQL。
- Agent Tool 直接访问 Repository。
- Repository 返回 Drizzle Row 给上层。
- Infrastructure 类型泄漏到 API Contract。

### 3.3 数据与数值约定

- ID：`TEXT`，使用带前缀 UUID，例如 `scn_<uuid>`、`scan_<uuid>`。
- 时间：数据库保存 UTC Epoch Milliseconds，API 输出 ISO 8601 UTC。
- 百分比、权重、Coverage、EQI 和分数：数据库保存 basis points，范围 `0..10000`；API 输出 `0..100`，最多两位小数。
- 金额：保存整数最小货币单位或 Decimal 字符串，禁止用 IEEE 浮点直接保存金额。
- JSON：数据库保存 canonical JSON 字符串；参与哈希前递归排序键。
- 哈希：`sha256:<hex>`。
- 所有枚举使用小写 snake_case。
- 所有 API JSON 使用 snake_case。
- UI 文案可以中文，领域 code 和数据库字段保持英文。

### 3.4 幂等与事务

- 网络请求、搜索和模型调用不能放在数据库事务内。
- 事务只用于短时间状态变更、租约获取和批量提交。
- 所有 Command API 支持 `Idempotency-Key`。
- 所有 Job Handler 可幂等重放。
- Snapshot、Candidate、Claim、Metric 和 Score 都有唯一哈希或输入哈希。
- `SQLITE_BUSY` 仅做有上限抖动退避，不无限重试。
- Job 租约丢失后，旧 Worker 不得提交结果。

## 4. 技术基线

```text
Runtime: Node.js 24 LTS
Package manager: pnpm workspace
Frontend/API: Next.js 16 App Router + React 19 + TypeScript strict
Styling: Tailwind CSS
Charts: ECharts
Validation: Zod
Business DB: SQLite + better-sqlite3 + Drizzle ORM
Agent: @earendil-works/pi-agent-core + @earendil-works/pi-ai
Agent session DB: @earendil-works/pi-session-backend-sqlite-node
Unit/integration tests: Vitest
E2E: Playwright
Logging: Pino-compatible structured JSON logger
```

规则：`package.json` 可以声明兼容 major，`pnpm-lock.yaml` 必须锁定精确版本。生产构建禁止浮动升级。

## 5. 仓库布局

```text
market-radar/
├── apps/
│   ├── web/
│   └── worker/
├── packages/
│   ├── domain/
│   ├── contracts/
│   ├── application/
│   ├── infrastructure/
│   ├── agent/
│   └── evals/
├── config/
├── drizzle/
├── data/
├── scripts/
├── docs/
├── AGENTS.md
├── pnpm-workspace.yaml
└── package.json
```

每个 package 有自己的 `package.json`、`tsconfig.json` 和明确 exports。禁止依赖根目录隐式路径别名。

## 6. 必须提供的根命令

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:worker
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:evals
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:reset:test
pnpm backup
pnpm restore:check
pnpm replay:fixture
pnpm build
pnpm verify
```

`pnpm verify` 至少执行：lint、typecheck、unit、integration、build。

## 7. 错误处理

- 使用 `AppError`，包含 `code`、`message`、`retryable`、`details`、`cause`。
- Route Handler 把内部错误映射为统一 API 错误。
- Tool 执行失败时抛出错误，不能把错误伪装成成功文本。
- AbortSignal 必须贯穿 HTTP、搜索、Fetcher、Parser、模型和 Job Handler。
- 不吞异常。所有失败都记录 `request_id`、`trace_id`、相关资源 ID。

## 8. 测试规则

- 每个领域纯函数都有表驱动单元测试。
- 每个 Repository 有真实临时 SQLite 集成测试。
- Migration 必须能从空库完整执行。
- 每个状态机测试合法和非法转换。
- 每个幂等 Command 至少测试两次相同请求。
- Snapshot/Evidence/Score 的回归 Fixture 固定，预期变化需要显式更新版本和快照。
- 不以 mock 替代核心 SQL、哈希、归一化和评分逻辑。

## 9. UI 规则

- Dashboard 是主入口，Agent 是右侧 Drawer。
- 所有结果显示 `result_status`、Coverage、Evidence Quality、Data As Of 和版本。
- Partial、Provisional、Stale、Blocked、Insufficient Evidence 不能仅靠颜色表达。
- Why Drawer 中的数字读取已保存的 Metric/Score，不在页面请求时重新计算。
- 所有交互满足键盘访问和基础无障碍标签。

## 10. Agent 规则

Agent 只可使用以下应用级 Tool：

```text
get_current_scenario
get_scan_status
query_country_ranking
get_country_detail
compare_countries
explain_metric
query_evidence
query_retailers
get_retailer_profile
```

不得暴露：

```text
fetch_source
save_source_snapshot
extract_candidate
verify_claim
persist_verified_claim
calculate_metric
commit_score_run
update_job_lease
```

Agent 关键事实必须引用由 Tool 返回的内部 Claim ID。模型生成的 URL 不作为正式引用。没有 Verified Claim 时明确回答证据不足。

## 11. 完成定义

一个任务只有同时满足以下条件才算完成：

- 代码和文档已提交。
- 相关测试通过。
- 类型检查通过。
- API/DB/配置契约同步更新。
- `TASKS.yaml` 已更新。
- 任务 Acceptance Criteria 全部可观察验证。
