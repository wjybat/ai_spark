# Market Radar Agent 实施方案

## 1. 实施目标

本方案将 Market Radar Agent V2.0 转换为可以逐任务施工的工程计划。Code Agent 应严格按 Phase Gate 推进，先建立可信评分闭环，再接入开放网络研究，最后接入 Pi Agent。

### 1.1 最终闭环

```text
用户创建 Scenario
→ 创建不可变 Scenario Revision
→ 发起 Scan Run 并冻结规则版本
→ 生成 Research Plan
→ 复用或收集 Source Snapshot
→ 抽取 Evidence Candidate
→ 自动校验或人工审核为 Verified Claim
→ Metric Engine 计算指标、Coverage 和 EQI
→ Scoring Engine 计算 Dimension、Opportunity、Priority 和稳定性
→ Quality Gate 判定 Published / Provisional / Blocked / Insufficient
→ Dashboard 和 Agent 查询已保存结果
```

### 1.2 MVP 固定业务范围

```text
区域：Southeast Asia
国家：VN、ID、TH、MY、PH
业态：convenience_store、mini_mart
产品：ai_video_loss_prevention@1.0.0
策略：overall_v1、growth_first_v1、entry_first_v1
目标客户：连锁零售商，默认最少 500 店
```

### 1.3 不在本轮实现

```text
全球国家和任意行业
用户自定义公式执行
多租户计费
CRM 写入和个人联系人抓取
多 Agent 协作
Redis、Temporal、Kafka
PostgreSQL 集群和多区域部署
OCR、登录墙或付费墙绕过
自动执行高风险 Evidence 审核
```

## 2. 技术决策

### 2.1 Runtime 与工作区

- Node.js 24 LTS。
- pnpm workspace，不引入 Turborepo；根脚本使用 `pnpm -r --if-present` 和明确 filter。
- TypeScript `strict: true`，启用 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`useUnknownInCatchVariables`。
- 全仓 ESM。

### 2.2 SQLite 驱动

- 业务数据库使用 `better-sqlite3`，由 Drizzle 访问。
- Agent 会话使用 Pi 官方 SQLite session backend，单独文件 `agent-sessions.db`。
- 两个数据库不能建立跨库外键，通过 `agent_session_links` 进行业务关联。
- 业务 DB 连接初始化执行：foreign_keys、WAL、busy_timeout、synchronous FULL。

### 2.3 数值稳定性

所有分数和比例使用 basis points：

```text
100.00 → 10000
78.35  → 7835
0.84 Coverage API 值 → DB 8400
20% 权重 → 2000
```

计算中使用整数贡献：

```text
contribution_bps = round(score_bps * weight_bps / 10000)
```

最终 API 通过统一 formatter 转为两位小数。禁止每层自行 round。

### 2.4 配置执行

- Metric aggregation、normalization、Priority 和 Hard Blocker 使用有限枚举和显式实现。
- 配置文件通过 Zod 校验后导入数据库。
- `draft` 配置可编辑；一旦 `published`，修改需要创建新版本。

## 3. 包和依赖边界

### 3.1 `packages/domain`

包含：

```text
实体和值对象
状态机
评分纯函数类型
ID、时间、BasisPoint、Hash 类型
领域错误
```

不得包含：Zod、Drizzle、HTTP、React、Pi、日志 SDK。

### 3.2 `packages/contracts`

包含：

```text
Zod Schema
API DTO
SSE Event
Tool Input/Output
Config Schema
LLM Candidate Schema
```

### 3.3 `packages/application`

包含：

```text
Use Case
Repository Port
Search/Fetcher/Parser/LLM Port
Transaction Port
Scan Orchestrator
Quality Gate
```

### 3.4 `packages/infrastructure`

包含：

```text
Drizzle Schema 和 Repository Adapter
SQLite Connection/Transaction
Fetcher
Search Provider
HTML/PDF Parser
Source Cache
Pi AI 调用 Adapter
日志和 Telemetry Adapter
```

### 3.5 `packages/agent`

包含：

```text
Pi Agent Runtime Adapter
Tool Definitions
Prompt
Grounding Renderer
Agent Event 转换
```

### 3.6 `apps/web`

包含：

```text
Next.js App Router 页面
Route Handlers
SSE
UI Components
```

### 3.7 `apps/worker`

包含：

```text
Job Poller
Lease Reaper
Scan Scheduler
Job Handlers
Graceful Shutdown
```

## 4. 运行模式

### 4.1 本地开发

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm dev` 并行启动 Web 和 Worker。默认使用 fixture search、fixture LLM 和手工 Evidence Pack，不需要外部 Key 即可跑通 Phase 1。

### 4.2 生产进程

```text
web: Next.js Node server，1 replica
worker: Node worker，1 replica
volume: 本地持久化卷，同时挂载 /app/data
```

不得把 SQLite 放在 NFS、对象存储挂载或无持久化 serverless 文件系统中。

### 4.3 环境变量

```text
NODE_ENV
APP_BASE_URL
MARKET_DB_PATH
AGENT_DB_PATH
SOURCE_CACHE_DIR
BACKUP_DIR
LOG_LEVEL
WORKER_ID
WORKER_POLL_MS
JOB_LEASE_MS
JOB_HEARTBEAT_MS
SQLITE_BUSY_TIMEOUT_MS
SEARCH_PROVIDER
SEARCH_API_KEY
LLM_PROVIDER
LLM_MODEL_EXTRACTOR
LLM_MODEL_AGENT
LLM_MAX_TOKENS_PER_SCAN
SCAN_MAX_COST_USD
FETCH_MAX_HTML_BYTES
FETCH_MAX_PDF_BYTES
FETCH_CONNECT_TIMEOUT_MS
FETCH_TOTAL_TIMEOUT_MS
```

所有变量由单一 `loadConfig()` 在进程启动时校验。不得在业务代码任意读取 `process.env`。

## 5. 领域状态机

### 5.1 Scan Run

允许转换：

```text
created → validating
validating → planning | failed | cancelled
planning → researching | failed | cancelled
researching → validating_evidence | partial | failed | cancelled
validating_evidence → calculating_metrics | partial | failed | cancelled
calculating_metrics → scoring | partial | failed | cancelled
scoring → generating_insights | quality_gate | failed | cancelled
generating_insights → quality_gate | failed | cancelled
quality_gate → completed | partial | failed
completed → stale
partial → stale
```

终态：`completed`、`partial`、`failed`、`cancelled`、`stale`。终态不得回退。重试失败任务创建新的 Job Attempt，不重置历史事件。

### 5.2 Research Job

```text
queued → running | cancelled | stale
running → succeeded | failed | cancelled | queued
failed → queued  仅 retryable 且 attempt_count < max_attempts
succeeded → stale  当所属 Revision 被替代且策略要求失效
```

租约丢失后的旧执行路径只能放弃提交，不能自行把 Job 改为失败。

### 5.3 Evidence

```text
candidate → verified | rejected | disputed
verified → superseded | expired | disputed
rejected → candidate  仅通过创建新 Candidate
superseded/expired → 不恢复 active；需要新 Claim
```

## 6. 核心算法

### 6.1 Canonical Hash

统一算法：

1. 删除 `undefined`。
2. Object key 按 Unicode code point 升序。
3. Array 保持业务顺序；集合语义的数组在调用前显式排序。
4. Date 转 UTC ISO 字符串。
5. 数值禁止 NaN/Infinity。
6. UTF-8 编码后 SHA-256。
7. 输出 `sha256:<lowercase hex>`。

必须覆盖 Scenario Config、Product Config、Research Plan、Candidate、Metric Input、Score Input 和 Tool Args。

### 6.2 Normalization

支持：

```text
piecewise_linear
ordinal_rubric
binary_gate
reference_percentile
identity_bps
```

`piecewise_linear`：在相邻 anchor 之间线性插值，区间外截断。支持非单调 anchors，但配置发布前必须校验 raw 值严格递增。

`ordinal_rubric`：输入等级必须来自结构化 Evidence 或人工审核，不允许模型自由产生分数。

`reference_percentile`：只读取已发布 Reference Set，不读取本次国家集合。

### 6.3 Coverage

```text
indicator_coverage = 10000 或 0
```

MVP 单个 Indicator 有有效 Metric Value 时为 10000，否则 0。Dimension Coverage：

```text
sum(available_indicator_weight_bps) / sum(all_indicator_weight_bps)
```

达到 6000 才计算 Dimension Score；计算时对可用权重重新归一化。国家 Published 门槛：总 Coverage ≥ 7500，Market Size、Customer Value、Entry Ease 各 ≥ 6000。

### 6.4 EQI

```text
eqi_bps =
  source_quality_bps * 3000 / 10000
+ freshness_bps     * 2000 / 10000
+ coverage_bps      * 3000 / 10000
+ consistency_bps   * 1500 / 10000
+ independence_bps  *  500 / 10000
```

全部项先计算整数，再统一 round。Independence：1/2/3/4+ 个独立来源族分别为 3000/6000/8000/10000。

### 6.5 Opportunity

```text
overall_v1 =
market_size 2000
growth 2000
expansion 1500
digital 1500
customer_value 2000
entry_ease 1000
```

Market Attractiveness 仅使用前五个维度，并把 9000 权重归一化至 10000。

```text
entry_difficulty_bps = 10000 - entry_ease_bps
```

### 6.6 Priority

按顺序匹配：

1. Hard Blocker → `hold`，result `blocked`。
2. 发布门槛失败 → `insufficient_evidence`，result `provisional` 或 `insufficient_evidence`。
3. Opportunity ≥ 8000、Difficulty ≤ 6500、Coverage ≥ 8000、EQI ≥ 7000 → `p1`。
4. Opportunity 6500..7999，或 Difficulty 6501..7500 → `p2`。
5. Opportunity 5000..6499 → `p3`。
6. 其余 → `watch`。

### 6.7 Rank Stability

对每个维度权重分别执行 `×0.9` 和 `×1.1`，其余权重重新归一化，共 12 组扰动。Blocked 和 Insufficient 国家不参与正式排名。

```text
stable:
  所有扰动 Top 1 不变，且 Top 3 集合保持率 ≥ 0.90
moderately_sensitive:
  Top 1 变化次数 ≤ 2，且 Top 3 集合保持率 ≥ 0.70
highly_sensitive:
  其他
```

## 7. Research 与 Evidence Pipeline

### 7.1 固定 Topic

```text
market_size
market_growth
format_store_count
retailer_expansion
retailer_landscape
digital_readiness
video_infrastructure
loss_prevention_need
competition
privacy_and_video_regulation
data_residency
partner_ecosystem
```

### 7.2 Research Plan

Plan Builder 是确定性函数，输入 Scenario Revision、Product Profile、Research Policy、当前可复用 Claim 清单，输出 Plan Items。LLM 只能补充 Query 文本，不能改变预算、必需 Topic 和完成规则。

每个 Plan Item 包含：

```text
required_predicates
minimum_verified_claims
minimum_independent_sources
query_budget
document_budget
max_failures
languages
source_type_priority
freshness_window_days
completion_rule
```

### 7.3 Fetch

处理顺序：

```text
normalize URL
→ fetch document
→ enforce size/time/MIME budgets
→ compute content hash
→ persist raw cache atomically
→ persist Snapshot metadata and normalized text
```

HTML 最大 5 MB，PDF 最大 25 MB，重定向最多 5 次，连接超时 10 秒，总读取 30 秒，单域并发 2。

### 7.4 Parser

HTML 输出：

```text
title
publisher
published_at
language
normalized_text
blocks[{block_id, heading_path, text, start_offset, end_offset}]
```

PDF 输出同一结构，locator 使用 page number、block index 和字符范围。MVP 不做 OCR；无文本 PDF 进入 `parse_failed_requires_manual_source`。

### 7.5 Candidate Extraction

- 文本按 block 分组，目标 6k tokens，重叠不超过 300 tokens。
- 模型只能输出 `EvidenceCandidateBatch` JSON。
- `quote_text` 必须是 normalized_text 的精确子串。
- locator 必须覆盖 quote 的位置。
- 模型无法确定字段时返回 null 和 validation errors。
- `model_confidence` 只用于审核排序。

### 7.6 Candidate Validation

按顺序：

```text
Schema
→ Snapshot/quote/locator exact match
→ predicate allowed
→ subject/entity resolution
→ unit/currency normalization
→ time range validity
→ scenario scope
→ duplicate hash
→ conflict key
→ auto-verification policy
```

监管、Hard Blocker、冲突、推断、时间/单位缺失和单一二手来源全部进入 Review Queue。

### 7.7 Claim 与冲突

每条 Claim 保留 source_snapshot_id。新增两个哈希：

```text
claim_identity_hash:
  source_snapshot_id + normalized subject + predicate + value + unit + period + geo/format

conflict_key_hash:
  normalized subject + predicate + geo/format + overlapping period bucket + unit
```

同一 conflict key 下值超出 predicate tolerance 时创建 `conflicts_with`。旧 Claim 不被覆盖；人工修正创建新 Claim，旧 Claim 标记 `superseded`。

## 8. Agent 实现

### 8.1 Pi Adapter

应用层只依赖：

```ts
interface MarketAgentRuntime {
  createSession(input: CreateAgentSessionInput): Promise<AgentSessionRef>;
  sendMessage(input: SendAgentMessageInput): AsyncIterable<AgentEvent>;
  cancelRun(runId: string): Promise<void>;
}
```

Pi 事件映射为内部事件：

```text
agent.run_started
agent.text_delta
agent.tool_started
agent.tool_completed
agent.citation
agent.run_completed
agent.run_failed
```

UI 不依赖 Pi 原生消息结构。

### 8.2 Grounded Tool Result

只读 Tool 返回 `facts`：

```json
{
  "facts": [
    {
      "fact_id": "fact_01",
      "text": "Vietnam growth score is 82.4.",
      "claim_ids": ["clm_01", "clm_02"],
      "metric_value_ids": ["mv_01"],
      "status": "published"
    }
  ]
}
```

模型引用 `[[fact:fact_01]]`。后处理器校验 fact ID，映射到 Claim ID。不存在的 fact 标记导致一次 repair；repair 仍失败则返回结构化错误，不发布无依据回答。

## 9. UI 施工规格

### 9.1 全局布局

```text
左侧导航：Overview / Countries / Retailers / Evidence Review / Tasks
顶部 Context Bar：Scenario、Revision、Product、Strategy、Data As Of、Status
主内容区
右侧 Agent Drawer：360px，移动端全屏
```

### 9.2 Overview

必须包含：

```text
Top Market
Top 3
Average Opportunity
Coverage
Evidence Quality
Data As Of
Scan Status
Opportunity Matrix
Country Ranking Table
```

矩阵：X Difficulty，Y Attractiveness，size Addressable Store Base，color Quality Tier，虚线边框 Provisional。

### 9.3 Country Detail

顶部指标、六维度卡、Raw Indicators、Why Drawer、风险/Blocker、Top Retailers。Why Drawer 必须展示公式、权重、原始值、归一化值、贡献、Coverage、EQI、版本和 Claim。

### 9.4 Evidence Review

左侧 Snapshot 纯文本高亮，右侧 Candidate/Claim 字段和审核动作。排序：Hard Blocker、监管、高分影响、冲突、单一低质量来源、普通候选。

### 9.5 Tasks

展示 Scan 阶段、国家/Topic、Job 状态、尝试次数、失败原因、预算、重试和取消。

## 10. API 和事务边界

- Route Handler 只做解析、调用 Use Case、映射响应。
- 一个 Use Case 对应一个明确事务边界。
- Query 默认无写入。
- Command 响应中返回资源 ID、版本、哈希和状态。
- SSE 从 `scan_events` 按递增 ID读取；支持 `Last-Event-ID`。
- 所有分页采用 opaque cursor，不采用不稳定 offset 作为正式接口。

详细契约见 `CONTRACTS.md`。

## 11. Migration 分组

```text
0001_foundation
  users, countries, retail_formats, aliases

0002_product_scenario
  product_profiles, product_profile_revisions, scenarios, scenario_revisions

0003_evidence_core
  source_documents, source_snapshots, retailers, aliases, observations,
  evidence_candidates, evidence_claims, relations, reviews

0004_metric_scoring
  metric_definition_sets, metric_definitions, reference_sets, weight_profiles,
  scoring_models, metric_values, links, score_runs, components, country_scores

0005_scan_jobs
  scan_runs, scan_events, research_plans, plan_items, queries, jobs, attempts

0006_insights_agent
  generated_insights, links, ai_runs, agent_session_links, tool_call_logs
```

每个 Migration 有 up SQL、结构验证测试和从上一版本升级测试。生产不提供自动 down migration；回滚使用备份恢复或向前修复。

## 12. Phase 0：工程与契约

目标：从空仓库得到可构建、可测试、可迁移、可 Seed 的骨架。

完成项：

```text
workspace 和 package boundaries
统一 TypeScript/ESLint/format
环境变量校验
ID、时间、basis points、canonical hash
错误和日志
全部 Contract/Config Schema
Migration 0001/0002
Seed 五国、业态、用户、Product Profile、Metric/Scoring draft config
测试配置和本地 pnpm verify
```

Gate 0：

```text
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm verify
```

全部成功；重复 seed 不产生重复记录。

## 13. Phase 1：可信评分闭环

目标：完全不依赖开放网络和 LLM，使用人工 Fixture 跑通 Evidence→Score→Dashboard。

施工顺序：

1. Migration 0003/0004。
2. 手工 Verified Evidence Importer。
3. Source Snapshot 和 Claim Repository。
4. Metric Registry Loader。
5. Aggregator、Normalizer、Coverage、EQI。
6. Scoring、Priority、Hard Blocker、Rank Stability。
7. Scan Run 的 fixture execution mode。
8. Scenario API、Result API。
9. Overview、Country Detail、Why Drawer、Retailers。
10. Golden Replay。

Gate 1：

```text
五国 synthetic fixture 可完整导入
同一输入重放得到相同 hash 和分数
所有 Score/Metric 可追到 Claim 和 Snapshot
缺失关键指标的国家不进入正式排名
UI 能查看 Published、Provisional、Blocked 和 Insufficient 状态
```

## 14. Phase 2：Research 与 Evidence Pipeline

目标：自动研究可以增量补充 Candidate，但不能破坏已发布结果。

施工顺序：

1. Migration 0005。
2. Scan Orchestrator 和状态机。
3. Job Poller、租约、心跳、Lease Reaper、取消。
4. Research Plan Builder。
5. Search Provider Port 和 fixture provider。
6. Fetcher。
7. Source Cache 和 Parser。
8. LLM Candidate Extractor。
9. Candidate Validator、Review Queue、冲突和版本。
10. Incremental Metric/Score Run。
11. SSE 和 Tasks 页面。

Gate 2：

```text
Worker 在任意阶段崩溃后可恢复
同一 Job 重放无重复 Snapshot/Claim/Metric/Score
Candidate 无法绕过验证进入 Metric
旧 Published Score 在自动研究失败时保持可查询
取消后不启动后续阶段
```

## 15. Phase 3：Pi Agent

目标：Agent 能查询、比较和解释已保存的市场研究结果。

施工顺序：

1. Migration 0006。
2. Pi Runtime Adapter 和 Session Backend。
3. 只读 Tool。
4. Fact/Citation Grounding。
5. Agent API、SSE、Drawer。
6. Agent eval。

Gate 3：

```text
Agent 无 DB/Fetcher/Scoring 直接能力
关键事实引用 Claim ID 覆盖率 100%
Provisional/Conflict/Blocked 状态披露率 100%
无 Evidence 时能拒绝确定回答
Pi 升级回归测试通过
```

## 16. Phase 4：可靠性与部署

完成：

```text
备份、恢复和 integrity check
结构化 observability
故障注入
Docker/Compose
生产 health/readiness
成本预算
发布 Quality Gate 报表
```

Gate 4 即发布门槛，详见 `ACCEPTANCE` 章节和 `TASKS.yaml`。

## 17. Code Agent 工作切片

每个任务应控制在一个清晰边界内：

```text
一个表组或一个迁移
一个领域纯函数组
一个 Repository Adapter
一个 Use Case
一个 API 资源组
一个 UI 页面或一个复杂组件
一个外部 Adapter
一组同类评测
```

禁止一次提交同时修改 DB、评分公式、UI 和 Agent Prompt，除非任务明确要求契约纵向切片。

## 18. 质量红线

以下任一情况阻止发布：

```text
Score 或 Metric 无 Evidence lineage
Verified Claim 无 quote/locator/snapshot
缺失数据被当成零
同一 fixture 重放分数变化
永久 running Job
取消后继续创建后续 Job
Agent 能直接写 Claim 或 Score
引用中存在模型自由构造 URL
备份未经过恢复验证
未解决关键冲突进入 Published
```
