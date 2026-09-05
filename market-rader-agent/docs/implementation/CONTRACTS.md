# 配置、API 与 Tool 契约

## 1. 通用 API Envelope

成功响应：

```json
{
  "data": {},
  "meta": {
    "request_id": "req_...",
    "trace_id": "trc_..."
  }
}
```

错误响应：

```json
{
  "error": {
    "code": "INSUFFICIENT_EVIDENCE",
    "message": "Entry Ease coverage is below the publishing threshold.",
    "retryable": false,
    "details": {
      "country_id": "VN",
      "metric_code": "entry_ease",
      "coverage": 42,
      "required": 60
    },
    "request_id": "req_...",
    "trace_id": "trc_..."
  }
}
```

最低错误码：

```text
VALIDATION_ERROR
NOT_FOUND
CONFLICT
IDEMPOTENCY_CONFLICT
SCENARIO_REVISION_STALE
SCAN_ALREADY_EXISTS
SCAN_NOT_CANCELLABLE
INSUFFICIENT_EVIDENCE
HARD_BLOCKER
SOURCE_FETCH_FAILED
SOURCE_PARSE_FAILED
JOB_LEASE_LOST
MODEL_OUTPUT_INVALID
QUALITY_GATE_FAILED
DATABASE_BUSY
BUDGET_EXHAUSTED
```

## 2. Config 文件

### 2.1 目录

```text
config/
├── countries.v1.json
├── retail-formats.v1.json
├── product-profiles/
│   └── ai-video-loss-prevention.1.0.0.json
├── metric-definition-sets/
│   └── southeast-asia-retail.1.0.0.json
├── reference-sets/
│   └── southeast-asia-retail.1.0.0.json
├── weight-profiles/
│   ├── overall.1.0.0.json
│   ├── growth-first.1.0.0.json
│   └── entry-first.1.0.0.json
├── scoring-models/
│   └── market-opportunity.1.0.0.json
├── research-policies/
│   └── southeast-asia-retail.1.0.0.json
├── source-quality/
│   └── default.1.0.0.json
├── predicates/
│   └── retail-market.1.0.0.json
└── prompts/
    ├── evidence-extractor.1.0.0.md
    └── market-agent.1.0.0.md
```

### 2.2 Product Profile

```json
{
  "code": "ai_video_loss_prevention",
  "version": "1.0.0",
  "status": "draft",
  "name": "AI Video Analytics / Loss Prevention v1",
  "use_case": "loss_prevention",
  "ideal_customer_store_count": 500,
  "supported_deployment_modes": ["edge", "hybrid"],
  "camera_compatibility": ["rtsp", "onvif"],
  "edge_hardware_requirement": "supported",
  "cloud_requirement": "optional",
  "data_residency_capability": "country_local_or_edge",
  "supported_languages": ["en"],
  "integration_requirements": ["camera_stream", "store_network"],
  "sales_model": "enterprise_direct_or_partner",
  "target_acv_band": {
    "currency": "USD",
    "min_minor_units": 5000000,
    "max_minor_units": 25000000
  },
  "required_digital_readiness": "medium",
  "weight_profile_default": "overall_v1",
  "hard_blocker_rules": [
    "video_processing_prohibited_for_use_case",
    "data_residency_incompatible",
    "no_qualified_customer"
  ]
}
```

该配置初始为 `draft`。业务负责人确认后通过 Admin Command 发布。

### 2.3 Weight Profiles

```json
{
  "overall_v1": {
    "market_size": 2000,
    "growth": 2000,
    "expansion": 1500,
    "digital": 1500,
    "customer_value": 2000,
    "entry_ease": 1000
  },
  "growth_first_v1": {
    "market_size": 1500,
    "growth": 3000,
    "expansion": 2000,
    "digital": 1000,
    "customer_value": 1500,
    "entry_ease": 1000
  },
  "entry_first_v1": {
    "market_size": 1500,
    "growth": 1500,
    "expansion": 1000,
    "digital": 1500,
    "customer_value": 1500,
    "entry_ease": 3000
  }
}
```

每组权重之和必须为 10000。

### 2.4 Metric Definition

```json
{
  "metric_code": "format_store_cagr_3y",
  "dimension_code": "growth",
  "name": "Format Store CAGR 3Y",
  "value_type": "ratio_percent",
  "raw_unit": "percent",
  "direction": "higher_better",
  "indicator_weight_bps": 4500,
  "aggregation_method": "cagr_from_observations",
  "aggregation_config": {
    "predicate": "format_store_count_actual",
    "minimum_years": 2.5,
    "maximum_years": 3.5
  },
  "normalization_method": "piecewise_linear",
  "normalization_config": {
    "anchors": [
      {"raw": "-5", "score_bps": 0},
      {"raw": "0", "score_bps": 2000},
      {"raw": "5", "score_bps": 5000},
      {"raw": "10", "score_bps": 7500},
      {"raw": "20", "score_bps": 10000}
    ]
  },
  "freshness_window_days": 548,
  "minimum_verified_claims": 2,
  "minimum_independent_sources": 1,
  "critical": false,
  "missing_data_policy": "unknown",
  "outlier_policy": "clip_to_anchor_range",
  "input_predicates": ["format_store_count_actual"],
  "version": "1.0.0",
  "status": "draft"
}
```

其余 21 个 Indicator 使用相同 Schema。初始 anchor 属于 MVP 校准默认值，只用于实现和内部试运行；生产发布前需通过 Reference Set 评审。Code Agent 不得把 draft 自动改为 published。

### 2.5 默认 Indicator 清单

```text
market_size
  qualified_store_base                 5000
  qualified_retailer_count             3000
  modern_retail_scale                  2000

growth
  format_store_cagr_3y                 4500
  modern_retail_sales_cagr_3y          3500
  qualified_retailer_store_growth      2000

expansion
  announced_openings_ratio             4500
  expanding_retailer_share             3000
  new_entrant_activity                 2500

digital
  store_system_readiness               2500
  video_infrastructure_readiness       2500
  cloud_connectivity_readiness         2500
  retailer_digital_investment_signals  2500

customer_value
  addressable_store_base               3500
  top_customer_concentration           2000
  estimated_acv_potential              2000
  use_case_need_fit                    2500

entry_ease
  privacy_video_regulation_fit         2500
  deployment_data_residency_fit        2000
  partner_channel_availability         2000
  competition_intensity                1500
  localization_sales_friction          2000
```

### 2.6 Source Quality

```json
{
  "government_regulator_official_statistics": 9500,
  "audited_annual_report_exchange_filing": 9200,
  "company_investor_material_official_announcement": 8800,
  "industry_association_transparent_research": 8200,
  "mainstream_business_media": 7500,
  "company_news_product_page": 7000,
  "other_verifiable_public_web": 5000
}
```

无作者、无日期、无快照定位的来源不能产生 Verified Claim。

## 3. Scenario API

### `POST /api/scenarios`

Request：

```json
{
  "name": "SEA Convenience AI Loss Prevention",
  "initial_revision": {
    "country_scope": ["VN", "ID", "TH", "MY", "PH"],
    "retail_format_codes": ["convenience_store", "mini_mart"],
    "product_profile_revision_id": "ppr_...",
    "customer_filter": {"minimum_store_count": 500},
    "research_window": {"from": "2023-01-01", "to": "2026-09-01"},
    "strategy_code": "overall_v1",
    "weight_profile_id": "wp_..."
  }
}
```

Response：scenario + revision + config_hash。

### `POST /api/scenarios/:scenario_id/revisions`

Headers：`Idempotency-Key`。

Request 只发送 patch：

```json
{
  "base_revision_id": "scr_02",
  "changes": {
    "customer_filter": {"minimum_store_count": 1000},
    "strategy_code": "entry_first_v1"
  },
  "change_summary": "Focus on large customers and entry ease"
}
```

Response：

```json
{
  "scenario_revision_id": "scr_03",
  "revision_no": 3,
  "config_hash": "sha256:...",
  "diff": {
    "customer_filter.minimum_store_count": {"from": 500, "to": 1000},
    "strategy_code": {"from": "overall_v1", "to": "entry_first_v1"}
  },
  "affected_outputs": ["customer_value", "retailer_ranking", "opportunity_score"]
}
```

## 4. Scan API

### `POST /api/scan-runs`

Headers：`Idempotency-Key`。

```json
{
  "scenario_revision_id": "scr_03",
  "mode": "fixture|research",
  "data_as_of": "2026-09-01"
}
```

Response：

```json
{
  "scan_run_id": "scan_...",
  "status": "created",
  "input_hash": "sha256:...",
  "frozen_versions": {
    "product_profile": "1.0.0",
    "metric_definition_set": "1.0.0",
    "scoring_model": "1.0.0",
    "research_policy": "1.0.0",
    "extractor_prompt": "1.0.0",
    "validator": "1.0.0"
  }
}
```

### 其他 Command/Query

```text
GET  /api/scan-runs/:scan_run_id
POST /api/scan-runs/:scan_run_id/cancel
POST /api/scan-runs/:scan_run_id/retry-failed
GET  /api/scan-runs/:scan_run_id/events
```

Cancel 使用 Idempotency-Key。Retry 只为 retryable failed Job 创建新 Attempt，不创建重复 Plan Item。

## 5. Result API

```text
GET /api/scan-runs/:id/ranking
GET /api/scan-runs/:id/countries/:country_id
GET /api/scan-runs/:id/countries/:country_id/metrics
GET /api/metric-values/:id/explanation
GET /api/scan-runs/:id/compare?countries=VN,ID
GET /api/scan-runs/:id/retailers?country_id=VN&cursor=...
GET /api/retailers/:id
GET /api/evidence-claims/:id
```

所有结果含：

```json
{
  "result_status": "published",
  "coverage": 84.0,
  "evidence_quality_index": 78.0,
  "data_as_of": "2026-08-15",
  "scenario_revision_id": "scr_03",
  "scan_run_id": "scan_12",
  "scoring_model_version": "1.0.0"
}
```

Ranking item：

```json
{
  "country": {"id": "cty_vn", "iso2": "VN", "name": "Vietnam"},
  "rank": 1,
  "opportunity_score": 84.25,
  "market_attractiveness": 87.10,
  "entry_difficulty": 41.00,
  "addressable_store_base": 12500,
  "coverage": 86.0,
  "evidence_quality_index": 81.5,
  "quality_tier": "high",
  "priority": "p1",
  "rank_stability": "stable",
  "result_status": "published",
  "data_as_of": "2026-08-15"
}
```

## 6. Evidence Review API

```text
GET  /api/evidence-review/queue?risk=hard_blocker&cursor=...
POST /api/evidence-candidates/:id/approve
POST /api/evidence-candidates/:id/reject
POST /api/evidence-claims/:id/correct
POST /api/evidence-claims/:id/relations
```

Approve：

```json
{
  "expected_candidate_hash": "sha256:...",
  "corrections": {},
  "reason": "Primary source and exact quote verified"
}
```

使用 optimistic concurrency。hash 不匹配返回 `CONFLICT`。

## 7. SSE Contract

HTTP：`text/event-stream`。每条事件：

```text
id: 1842
event: research.topic_completed
data: {"scan_run_id":"scan_...","country_id":"VN","topic_code":"market_size","message_code":"TOPIC_COMPLETED","payload":{},"created_at":"..."}
```

事件类型：

```text
scan.validating
scan.planning
scan.researching
research.country_started
research.topic_started
research.topic_completed
research.topic_failed
evidence.validation_started
evidence.review_required
metrics.country_completed
scoring.completed
quality_gate.completed
scan.completed
scan.partial
scan.failed
scan.cancelled
```

客户端断线后发送 `Last-Event-ID`。服务端从下一条事件开始发送，并每 15 秒发送 comment heartbeat。

## 8. Agent API

```text
POST /api/agent/sessions
POST /api/agent/sessions/:session_id/messages
GET  /api/agent/sessions/:session_id/events
POST /api/agent/runs/:run_id/cancel
```

Message Request：

```json
{
  "message": "比较越南和印尼的客户价值",
  "active_scenario_revision_id": "scr_03",
  "active_scan_run_id": "scan_12"
}
```

引用对象：

```json
{
  "type": "evidence_reference",
  "claim_id": "clm_01",
  "label": "Retailer annual report, 2026",
  "supports": "store_opening_plan"
}
```

## 9. Tool Contract

每个 Tool 对象包含：

```ts
interface ApplicationTool<I, O> {
  name: string;
  description: string;
  inputSchema: ZodSchema<I>;
  outputSchema: ZodSchema<O>;
  timeoutMs: number;
  retryPolicy: 'none' | 'transient_once';
  execute(context: ToolContext, input: I, signal: AbortSignal): Promise<O>;
}
```

Tool 只返回业务 DTO、Fact 和内部 Citation Reference。

## 10. Tool 输入输出摘要

```text
get_current_scenario
  in: scenario_id?
  out: active revision and config

get_scan_status
  in: scan_run_id
  out: stage, progress, failures, result status

query_country_ranking
  in: scan_run_id, limit?
  out: ranking + grounded facts

get_country_detail
  in: scan_run_id, country_id
  out: score, dimensions, risks, facts

compare_countries
  in: scan_run_id, country_ids[2..5], dimension_codes?
  out: deterministic deltas + facts

explain_metric
  in: metric_value_id
  out: formula, raw, normalized, coverage, EQI, claim references

query_evidence
  in: scan_run_id, country_id?, predicate_code?, status?
  out: verified claims only by default

query_retailers
  in: scan_run_id, country_id?, minimum_store_count?
  out: verified observations and fit
```

## 11. Fixture Contract

`packages/evals/datasets/sea-v1/` 包含：

```text
snapshots/*.json
claims.json
scenario.json
expected-metrics.json
expected-scores.json
expected-ranking.json
```

所有内容标记：

```json
{
  "fixture": true,
  "synthetic": true,
  "not_for_business_use": true
}
```

Fixture 只用于验证系统行为，不得在 UI 中伪装为真实市场结果。开发环境顶部显示 `Synthetic Data` Banner。
