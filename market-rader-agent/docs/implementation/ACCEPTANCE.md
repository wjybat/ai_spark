# 发布验收清单

## Evidence 与血缘

- [ ] UI 中 100% 的 Score 和 Metric 可追到公式、Metric Definition 和 Verified Claim。
- [ ] 100% Verified Claim 有 Snapshot、quote、locator、来源类型和验证记录。
- [ ] Candidate 不能被 Metric 查询读取。
- [ ] 修正和替代不覆盖历史记录。
- [ ] 计划值和实际值使用不同 Predicate。

## 计算

- [ ] 同一 Scenario Revision、Evidence Set、Metric Set 和 Scoring Model 重放结果完全一致。
- [ ] 固定基准不受本次国家集合变化影响。
- [ ] 缺失数据无静默补零。
- [ ] Entry Difficulty 精确等于 100 - Entry Ease。
- [ ] Hard Blocker 优先于平均分和 Priority。
- [ ] Rank Stability 已执行并展示。

## Workflow

- [ ] 无永久 running Job。
- [ ] Lease 丢失的 Worker 无法提交。
- [ ] Job 重放不产生重复 Snapshot、Candidate、Claim、Metric、Score。
- [ ] Cancel 后不启动后续阶段。
- [ ] 新 Scenario Revision 不覆盖旧 Run。
- [ ] Partial 结果不包装成完整区域排名。

## Agent

- [ ] Agent 不拥有 Repository、Fetcher、Evidence verify、Metric 或 Score Tool。
- [ ] 关键事实引用覆盖率 100%。
- [ ] Candidate/Rejected Claim 从不作为正式引用。
- [ ] Provisional、Conflict、Blocked 状态披露率 100%。

## 运维

- [ ] SQLite 位于本地持久化卷。
- [ ] WAL、foreign_keys、busy_timeout、synchronous 已验证。
- [ ] 备份恢复演练通过。
- [ ] `PRAGMA integrity_check` 和 foreign key check 通过。
- [ ] 新环境能完成 install、migrate、seed、verify 和 fixture replay。
