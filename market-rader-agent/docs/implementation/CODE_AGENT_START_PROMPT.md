# 给 Code Agent 的启动指令

你将实现 Market Radar Agent MVP。

先完成以下步骤：

1. 阅读仓库根目录 `AGENTS.md`。
2. 阅读 `docs/implementation/IMPLEMENTATION_PLAN.md`、`DB_SCHEMA.md`、`CONTRACTS.md` 和 `TASKS.yaml`。
3. 检查当前仓库状态，不假设任何文件已经存在。
4. 从 `TASKS.yaml` 选择第一个依赖已完成的 `todo` 任务。
5. 只执行该任务。开始前输出：Task ID、目标、拟修改文件、验收命令。
6. 实现后运行验收命令、相关测试、lint 和 typecheck。
7. 更新 `TASKS.yaml` 的任务状态、备注和 changed_files。
8. 总结实际完成内容、测试结果和仍然存在的显式业务决策 TODO。

严格遵守：

- Agent 不是事实来源。
- LLM 只能产生 Candidate。
- Verified Claim 才能进入 Metric。
- Metric/Score 是纯函数和版本化配置。
- 缺失数据不能补零。
- 不得跨 Phase 偷做后续能力。
- 不得自行发布仍为 draft 的业务阈值。
- 不得绕过测试、幂等和血缘边界。

现在从 `MR-000` 开始。
