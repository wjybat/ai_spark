# 数据库施工规格

## 1. 通用约定

```text
Database: SQLite
ORM: Drizzle
ID: TEXT PRIMARY KEY
Timestamp: INTEGER epoch milliseconds
Boolean: INTEGER 0/1
JSON: TEXT canonical JSON
Score/Coverage/Weight/EQI: INTEGER basis points 0..10000
Money: INTEGER minor units + currency，或 decimal string
```

外键默认 `ON UPDATE RESTRICT`。历史/血缘表默认 `ON DELETE RESTRICT`；纯关联表可 `ON DELETE CASCADE`。业务记录采用归档或状态变更，不提供普通硬删除。

所有表至少有 `created_at`，需要更新的主数据增加 `updated_at`。所有 `status` 在应用层和 migration CHECK 中双重约束。

## 2. Migration 0001_foundation

### `users`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | text | PK，`usr_` 前缀 |
| email | text | not null, unique, lower-case |
| display_name | text | not null |
| created_at | integer | not null |
| updated_at | integer | not null |

### `countries`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | text | PK |
| iso2 | text | unique, length 2 |
| iso3 | text | unique, length 3 |
| name_en | text | not null |
| name_local | text | nullable |
| region_code | text | indexed |
| currency_code | text | length 3 |
| timezone | text | not null |
| active | integer | not null default 1 |
| created_at | integer | not null |

Seed：VN/VNM、ID/IDN、TH/THA、MY/MYS、PH/PHL。

### `retail_formats`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | text | PK |
| code | text | unique |
| name_en | text | not null |
| taxonomy_version | text | not null |
| active | integer | default 1 |
| created_at | integer | not null |

Seed：`convenience_store`、`mini_mart`。

### `retail_format_aliases`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | text | PK |
| retail_format_id | text | FK retail_formats |
| country_id | text | nullable FK countries |
| language | text | not null |
| alias | text | not null |
| normalized_alias | text | not null |
| source | text | seed/manual/evidence |
| created_at | integer | not null |

Unique：`retail_format_id, country_id, language, normalized_alias`。

## 3. Migration 0002_product_scenario

### `product_profiles`

```text
id PK
code UNIQUE
name
current_revision_id nullable
status: draft/published/archived
created_at
updated_at
```

### `product_profile_revisions`

```text
id PK
product_profile_id FK
revision_no INTEGER
version TEXT
config_json TEXT
config_hash TEXT
status draft/published/retired
created_by FK users
created_at
published_at nullable
UNIQUE(product_profile_id, revision_no)
UNIQUE(product_profile_id, config_hash)
```

`current_revision_id` 在 revision 创建后通过短事务更新。Published revision 不允许 update config。

### `scenarios`

```text
id PK
name
owner_user_id FK users
current_revision_id nullable
status active/archived
created_at
updated_at
archived_at nullable
```

### `scenario_revisions`

```text
id PK
scenario_id FK
revision_no INTEGER
parent_revision_id nullable FK self
country_scope_json TEXT
retail_format_codes_json TEXT
product_profile_revision_id FK
customer_filter_json TEXT
research_window_json TEXT
strategy_code TEXT
weight_profile_id TEXT
config_hash TEXT
change_summary TEXT
created_by FK users
created_at INTEGER
UNIQUE(scenario_id, revision_no)
UNIQUE(scenario_id, config_hash)
```

数组在哈希前按 code 排序。Revision 记录禁止 update 和 delete。

## 4. Migration 0003_evidence_core

### `retailers`

```text
id PK
canonical_name
normalized_name
country_id FK
website nullable
status active/merged/archived
merged_into_retailer_id nullable FK self
created_at
updated_at
UNIQUE(country_id, normalized_name)
```

### `retailer_aliases`

```text
id PK
retailer_id FK
language
alias
normalized_alias
source_snapshot_id nullable FK
created_at
UNIQUE(retailer_id, language, normalized_alias)
```

### `source_documents`

```text
id PK
canonical_url UNIQUE
publisher nullable
source_type
origin_cluster_id nullable
first_seen_at
last_seen_at
status active/blocked/unavailable
created_at
updated_at
```

### `source_snapshots`

```text
id PK
source_document_id FK
fetched_at
published_at nullable
publisher nullable
source_type
language nullable
mime_type
http_status
etag nullable
last_modified nullable
content_hash
normalized_text
raw_content_path nullable
parse_status pending/succeeded/failed/unsupported
parser_version
metadata_json
created_at
UNIQUE(source_document_id, content_hash)
```

Index：content_hash、published_at、parse_status。

### `evidence_candidates`

```text
id PK
scan_run_id nullable
subject_entity_type
subject_entity_id nullable
subject_text
predicate_code
text_value nullable
numeric_value_decimal nullable
unit nullable
currency nullable
effective_from nullable
effective_to nullable
observed_at nullable
country_id FK
geo_scope_json
retail_format_id nullable FK
source_snapshot_id FK
quote_text
locator_json
extraction_model
extraction_prompt_version
candidate_hash UNIQUE
model_confidence_bps nullable
validation_status pending/valid/invalid/review_required
validation_errors_json
ai_run_id nullable
created_at
```

`numeric_value_decimal` 使用规范 Decimal 字符串，Metric 聚合时按定义转 number/integer。quote 不能为空。

### `evidence_claims`

```text
id PK
source_candidate_id nullable FK
subject_entity_type
subject_entity_id nullable
subject_text
predicate_code
text_value nullable
numeric_value_decimal nullable
unit nullable
currency nullable
effective_from nullable
effective_to nullable
observed_at nullable
country_id FK
geo_scope_json
retail_format_id nullable FK
source_snapshot_id FK
quote_text
locator_json
verification_status verified/disputed/superseded/expired
verification_method primary_source/corroborated/manual
verified_by nullable FK users
verified_at
source_quality_bps
claim_quality_bps
origin_cluster_id nullable
claim_identity_hash UNIQUE
conflict_key_hash
claim_version INTEGER
supersedes_claim_id nullable FK self
active INTEGER
created_at
```

CHECK：active=1 仅允许 verification_status=verified。Index：country+predicate+status、conflict_key_hash、effective_from/effective_to。

### `evidence_relations`

```text
id PK
from_claim_id FK
to_claim_id FK
relation_type supports/conflicts_with/duplicate_of/supersedes/derived_from
reason
created_by
created_at
UNIQUE(from_claim_id, to_claim_id, relation_type)
CHECK(from_claim_id != to_claim_id)
```

### `evidence_reviews`

```text
id PK
candidate_id nullable FK
claim_id nullable FK
reviewer_user_id FK
action approve/reject/correct/mark_conflict/mark_duplicate/supersede
before_json
after_json
reason
created_at
CHECK(candidate_id IS NOT NULL OR claim_id IS NOT NULL)
```

### `retailer_formats`

```text
retailer_id FK
retail_format_id FK
valid_from nullable
valid_to nullable
claim_id FK evidence_claims
created_at
PRIMARY KEY(retailer_id, retail_format_id, claim_id)
```

### `retailer_observations`

```text
id PK
retailer_id FK
metric_code
numeric_value_decimal nullable
text_value nullable
unit nullable
currency nullable
effective_from nullable
effective_to nullable
claim_id FK
created_at
UNIQUE(retailer_id, metric_code, claim_id)
```

## 5. Migration 0004_metric_scoring

### `metric_definition_sets`

```text
id PK
code
version
status draft/published/retired
config_hash
published_at nullable
created_at
UNIQUE(code, version)
UNIQUE(config_hash)
```

### `reference_sets`

```text
id PK
code
version
scope_json
effective_at
config_json
config_hash
status draft/published/retired
created_at
UNIQUE(code, version)
```

### `metric_definitions`

```text
id PK
metric_definition_set_id FK
metric_code
dimension_code
name
description
value_type
raw_unit nullable
currency_rule nullable
direction
indicator_weight_bps
aggregation_method
aggregation_config_json
normalization_method
normalization_config_json
reference_set_id nullable FK
freshness_window_days
minimum_verified_claims
minimum_independent_sources
critical INTEGER
missing_data_policy
outlier_policy
input_predicates_json
version
status
created_at
UNIQUE(metric_definition_set_id, metric_code)
CHECK(indicator_weight_bps BETWEEN 0 AND 10000)
```

### `weight_profiles`

```text
id PK
code
version
name
dimension_weights_json
config_hash
status draft/published/retired
created_at
UNIQUE(code, version)
```

### `scoring_models`

```text
id PK
code
version
metric_definition_set_id FK
opportunity_formula_json
priority_rules_json
hard_blocker_rules_json
minimum_coverage_json
config_hash
status draft/published/retired
published_at nullable
created_at
UNIQUE(code, version)
```

### `metric_values`

```text
id PK
scan_run_id FK
country_id FK
metric_definition_id FK
raw_value_json
normalized_value_bps nullable
coverage_bps
source_quality_bps
freshness_bps
consistency_bps
independence_bps
evidence_quality_index_bps
status available/insufficient_evidence/disputed/blocked
input_hash
calculation_version
calculated_at
UNIQUE(scan_run_id, country_id, metric_definition_id, input_hash)
```

### `metric_evidence_links`

```text
metric_value_id FK
evidence_claim_id FK
role input/support/conflict/excluded
weight_bps
reason nullable
PRIMARY KEY(metric_value_id, evidence_claim_id, role)
```

### `score_runs`

```text
id PK
scan_run_id FK
scoring_model_id FK
input_hash
status running/succeeded/failed
started_at
finished_at nullable
error_code nullable
UNIQUE(scan_run_id, input_hash)
```

### `score_components`

```text
id PK
score_run_id FK
country_id FK
dimension_code
score_bps nullable
weight_bps
contribution_bps nullable
coverage_bps
evidence_quality_index_bps
status available/insufficient_evidence/blocked
input_hash
UNIQUE(score_run_id, country_id, dimension_code)
```

### `country_scores`

```text
id PK
score_run_id FK
country_id FK
market_attractiveness_bps nullable
entry_ease_bps nullable
entry_difficulty_bps nullable
opportunity_score_bps nullable
priority p1/p2/p3/watch/hold/insufficient_evidence
coverage_bps
evidence_quality_index_bps
rank nullable
rank_stability stable/moderately_sensitive/highly_sensitive/not_ranked
result_status published/provisional/blocked/insufficient_evidence
data_as_of nullable
input_hash
UNIQUE(score_run_id, country_id)
```

## 6. Migration 0005_scan_jobs

### `scan_runs`

```text
id PK
scenario_revision_id FK
status created/validating/planning/researching/validating_evidence/calculating_metrics/scoring/generating_insights/quality_gate/completed/partial/failed/cancelled/stale
stage
input_hash
result_status draft/running/partial/provisional/published/stale/insufficient_evidence/blocked/failed/cancelled
product_profile_revision_id FK
metric_definition_set_id FK
scoring_model_id FK
research_policy_version
extractor_prompt_version
validator_version
model_provider nullable
model_name nullable
data_as_of nullable
requested_by FK users
idempotency_key
cancel_requested_at nullable
started_at nullable
finished_at nullable
error_code nullable
error_message nullable
created_at
UNIQUE(requested_by, idempotency_key)
UNIQUE(input_hash, status) 仅应用层保证活跃 Run 唯一
```

### `scan_events`

```text
id INTEGER PRIMARY KEY AUTOINCREMENT
scan_run_id FK
event_type
stage
country_id nullable FK
topic_code nullable
message_code
payload_json
created_at
INDEX(scan_run_id, id)
```

SSE Event ID 直接使用该自增 ID。

### `research_plans`

```text
id PK
scan_run_id FK UNIQUE
research_policy_version
plan_hash UNIQUE
status draft/active/completed/partial/cancelled
created_at
completed_at nullable
```

### `research_plan_items`

```text
id PK
research_plan_id FK
country_id FK
topic_code
requirements_json
budgets_json
preferred_source_types_json
languages_json
freshness_requirement_json
reuse_decision_json
completion_rule_json
status pending/running/completed/partial/failed/cancelled
stop_reason nullable
created_at
completed_at nullable
UNIQUE(research_plan_id, country_id, topic_code)
```

### `research_queries`

```text
id PK
research_plan_item_id FK
query_text
language
query_hash
source
status planned/executed/failed/skipped
result_count nullable
created_at
executed_at nullable
UNIQUE(research_plan_item_id, query_hash)
```

### `research_jobs`

```text
id PK
scan_run_id FK
scenario_revision_id FK
research_plan_item_id FK
country_id FK
topic_code
payload_json
idempotency_key UNIQUE
status queued/running/succeeded/failed/cancelled/stale
priority INTEGER
worker_id nullable
lease_token nullable
lease_until nullable
heartbeat_at nullable
attempt_count INTEGER default 0
max_attempts INTEGER
next_retry_at nullable
last_error_code nullable
last_error_message nullable
stop_reason nullable
result_summary_json nullable
created_at
started_at nullable
finished_at nullable
cancelled_at nullable
```

Job 领取条件：queued、next_retry_at <= now、所属 Scan 未取消。领取时生成新的随机 `lease_token`。所有提交必须携带当前 token。

### `job_attempts`

```text
id PK
research_job_id FK
attempt_no
worker_id
lease_token
started_at
finished_at nullable
status running/succeeded/failed/lease_lost/cancelled
error_code nullable
error_message nullable
metrics_json
UNIQUE(research_job_id, attempt_no)
```

## 7. Migration 0006_insights_agent

### `generated_insights`

```text
id PK
scan_run_id FK
country_id nullable FK
insight_type
version INTEGER
title
content
status draft/published/superseded
model_run_id nullable FK ai_runs
input_hash
evidence_set_hash
created_at
UNIQUE(scan_run_id, country_id, insight_type, version)
```

### `insight_evidence_links`

```text
insight_id FK
evidence_claim_id FK
role support/risk/conflict
PRIMARY KEY(insight_id, evidence_claim_id, role)
```

### `ai_runs`

```text
id PK
purpose search_planning/evidence_extraction/insight_generation/agent
provider
model
prompt_version
input_hash
output_hash nullable
status running/succeeded/failed/invalid_output
input_tokens nullable
output_tokens nullable
latency_ms nullable
cost_minor_units nullable
cost_currency nullable
error_code nullable
created_at
finished_at nullable
```

### `agent_session_links`

```text
session_id PK
user_id FK
scenario_id nullable FK
active_scenario_revision_id nullable FK
created_at
last_active_at
```

### `tool_call_logs`

```text
id PK
tool_call_id UNIQUE
session_id
run_id
user_id FK
tool_name
args_hash
result_hash nullable
status started/succeeded/failed
error_code nullable
resource_ids_json
latency_ms nullable
created_at
finished_at nullable
```

## 8. 索引最低集合

```text
source_documents(canonical_url)
source_documents(origin_cluster_id)
source_snapshots(content_hash)
evidence_candidates(candidate_hash)
evidence_candidates(validation_status, created_at)
evidence_claims(claim_identity_hash)
evidence_claims(conflict_key_hash)
evidence_claims(country_id, predicate_code, verification_status, active)
metric_values(scan_run_id, country_id, metric_definition_id)
score_components(score_run_id, country_id)
country_scores(score_run_id, rank)
research_jobs(status, priority, next_retry_at)
research_jobs(lease_until)
research_plan_items(research_plan_id, country_id, topic_code)
research_queries(query_hash)
retailers(country_id, normalized_name)
retailer_observations(retailer_id, metric_code, effective_from)
```

## 9. Repository 端口

至少实现：

```text
UserRepository
CountryRepository
RetailFormatRepository
ProductProfileRepository
ScenarioRepository
ScanRunRepository
ScanEventRepository
ResearchPlanRepository
ResearchJobRepository
SourceRepository
EvidenceCandidateRepository
EvidenceClaimRepository
EvidenceReviewRepository
RetailerRepository
MetricDefinitionRepository
MetricValueRepository
ScoreRepository
AgentSessionLinkRepository
ToolCallLogRepository
```

Repository 返回领域对象。每个 Repository 提供测试工厂，集成测试使用临时数据库文件，不共享全局开发 DB。
