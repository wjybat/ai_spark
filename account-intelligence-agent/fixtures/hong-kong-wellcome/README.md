# 香港惠康电商履约项目测试案例

由用户提供的长截图整理为三份材料，用于客户情报 MVP 端到端验证。

## 材料

1. `01-project-overview.md`：项目背景、目标、实施范围和系统集成。
2. `02-milestones-and-status.md`：已完成及未来里程碑、近期工作、Phase II。
3. `03-challenges-lessons-and-plan.md`：延期、集成和跨文化挑战，以及经验和行动计划。

完成三份材料接入后运行：

```bash
pnpm test:case
```

## 最低验收预期

- 三份材料均创建独立 Source 和 Job，并最终进入 `DONE`。
- 客户应为 `UNCONVERTED / SOLUTION / ACTIVE`，识别已完成方案确认及开发中的推进状态。
- 时间线应包含需求调研和方案确认相关事件，未来“试点上线”计划不能误判为已进入 PoC。
- 画像应识别履约、集成、试点或交付相关需求。
- 洞察应出现 Solution 延期、跨系统集成、合同签署等风险或阻碍。
- 成功因素、失败原因和可复用打法均不为空；经验记录同时覆盖 `SUCCESS`、`FAILURE` 和 `PLAYBOOK`。
- 下一步建议不能为空。
- 所有当前 Fact 均保留逐字 `evidence_text`；从结论点击“证据”应打开对应材料并高亮具体段落。
- 来源页应能看到三份原始 Markdown 材料。
