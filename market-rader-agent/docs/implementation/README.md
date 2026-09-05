# Market Radar Agent Code Agent 开发包

本目录把《Market Radar Agent 设计方案 V2.0》转换为可以直接交给 Code Agent 执行的工程规格。

## 使用方式

1. 将本目录复制到目标代码仓库的 `docs/implementation/`，把 `AGENTS.md` 复制到仓库根目录。
2. 让 Code Agent 先阅读 `AGENTS.md`、`IMPLEMENTATION_PLAN.md`、`DB_SCHEMA.md`、`CONTRACTS.md` 和 `TASKS.yaml`。
3. 从 `MR-000` 开始，严格按 `depends_on` 顺序执行。一次只完成一个任务。
4. 每个任务完成后运行该任务的验收命令，并更新 `TASKS.yaml` 中的 `status`、`notes` 和实际变更文件。
5. Phase Gate 未通过时，不进入下一阶段。

## 文件说明

- `AGENTS.md`：Code Agent 的强制工程规则、边界和工作方式。
- `IMPLEMENTATION_PLAN.md`：系统架构、模块职责、阶段顺序、每个任务的施工说明。
- `DB_SCHEMA.md`：SQLite/Drizzle 的精确数据模型、约束、索引和迁移分组。
- `CONTRACTS.md`：配置、API、SSE、Tool、状态机、评分和 Evidence 契约。
- `TASKS.yaml`：机器可读任务清单、依赖和验收标准。

## 开发目标

最终 MVP 需要完成以下闭环：

```text
Scenario Revision
→ Scan Run
→ Research Plan / Fixed Evidence Pack
→ Verified Claim
→ Metric Value
→ Score Run
→ Quality Gate
→ Dashboard / Agent
```

项目优先证明 Evidence 到 Score 的可信闭环。自动研究和 Agent 交互只能建立在该闭环之上。
