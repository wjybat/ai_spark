# 客户情报中心

基于 TypeScript 的全栈客户情报 MVP。材料进入系统后由独立 Worker 抽取事件与事实，自动计算客户阶段、生成总结、经验和下一步建议，并通过中文工作台展示。需求、阻碍、洞察、经验、建议和时间线均可打开证据抽屉，定位并高亮原始材料中的逐字依据。

## 技术栈

- Next.js 15 + React 19 + TypeScript
- Next.js Route Handlers（REST API）
- Node.js `node:sqlite`（SQLite WAL）
- 独立 TypeScript Worker（`tsx`）
- Zod 输入与 Agent 结构化输出校验
- Pi SDK 基座 Agent + 受控客户情报工具
- Pi 不可用时回退 OpenAI-compatible 或本地规则抽取器

要求 Node.js 22.13 或更高版本。

## 本地启动

```bash
cp .env.example .env
pnpm install
pnpm seed            # 可选：生成演示客户
```

开启两个终端：

```bash
pnpm dev              # http://localhost:3001
pnpm worker           # 异步处理材料
```

页面将“新建客户”和“更新材料”分开；人工更新材料必须选择已有客户，可粘贴文本或上传 PDF、DOCX、Markdown、TXT。提交后右下角任务中心会持续显示等待、Pi Agent 分析中、完成或失败状态，完成后自动刷新客户情报；失败任务可直接重新分析。任务记录保存在浏览器中，刷新页面后仍可继续跟踪。外部接口只有显式传入 `auto_create_customer: true` 时才会自动创建未知客户。

客户详情页提供“问 Agent”入口。对话 Agent 只读取当前客户的画像、有效事实、时间线和来源材料，回答中会返回可打开的参考材料；对话历史按客户保存在浏览器本地，不写入数据库。

接入一条材料：

```bash
curl -X POST http://localhost:3001/api/v1/ingest \
  -H 'content-type: application/json' \
  -d '{
    "source_type":"MEETING",
    "source_system":"sales-system",
    "external_id":"meeting-001",
    "customer":{"name":"Tesco"},
    "title":"Tesco PoC 讨论",
    "content":"客户希望选择 10 家门店开展 PoC，但 ROI 模型和预算审批仍需确认。",
    "occurred_at":"2026-09-03T02:00:00.000Z",
    "metadata":{},
    "auto_create_customer":true
  }'
```

## 命令

```bash
pnpm dev           # 开发服务器
pnpm worker        # 持续运行 Worker
pnpm worker:once   # 最多处理一个任务
pnpm seed          # 写入演示数据并处理完任务
pnpm test          # 核心链路测试
pnpm test:case     # 验证香港惠康真实项目案例
pnpm typecheck     # TypeScript 检查
pnpm build         # 生产构建
```

## API

- `POST /api/v1/customers`
- `GET /api/v1/customers`
- `GET /api/v1/customers/:id`
- `GET /api/v1/customers/:id/timeline`
- `GET /api/v1/customers/:id/sources`
- `POST /api/v1/customers/:id/refresh`
- `POST /api/v1/customers/:id/chat`
- `POST /api/v1/ingest`
- `POST /api/v1/ingest/file`
- `POST /api/v1/events`
- `GET /api/v1/jobs/:id`
- `POST /api/v1/jobs/:id/retry`
- `GET /api/health`

文件接入支持 PDF、DOCX、Markdown、TXT；扫描 PDF 不做 OCR。

## Pi 基座 Agent

Worker 使用 `@earendil-works/pi-coding-agent` SDK 创建隔离的内存会话，默认选择本机 Pi 配置中的 `dmall-router/glm-5.3-zp`，并使用 `high` 推理等级。Provider URL 和 Key 继续从 `~/.pi/agent/models.json` 解析，不写入项目。首次使用前可运行：

```bash
pi
/login
```

可以在 `.env` 中通过 `PI_AGENT_MODEL=provider/model` 覆盖模型。Agent 不启用 Pi 的文件、Shell 或写入工具，只能使用以下业务工具：

- `get_customer_profile`：读取当前客户画像与旧总结
- `read_source_material`：读取当前任务的完整材料
- `list_current_facts`：读取当前有效事实
- `list_customer_timeline`：读取客户历史事件
- `submit_customer_analysis`：提交经过 Zod 校验的 Event、Fact 和 Next Action

`submit_customer_analysis` 是终止工具，Agent 无权直接修改数据库。LLM 调用期间不会持有 SQLite 事务。Pi 不可用时，根据 `PI_AGENT_FALLBACK` 回退到 OpenAI-compatible 抽取器或确定性本地规则。

客户对话使用独立的临时内存会话，并且仅启用 `get_customer_context`、`list_customer_facts`、`list_customer_timeline`、`list_customer_sources` 和 `read_customer_source` 五个只读客户域工具。来源读取会校验客户归属；不启用 Shell、文件或数据库写入工具。可通过 `PI_AGENT_CHAT_THINKING` 和 `PI_AGENT_CHAT_TIMEOUT_MS` 单独调整对话推理级别与超时。

## 端到端测试案例

`fixtures/hong-kong-wellcome/` 保存了由真实项目分享整理的香港惠康电商履约案例，包含项目概述、里程碑以及挑战与经验三份材料和最低验收预期。该案例用于验证多来源连续接入、Pi Agent 与确定性规则互补抽取、状态计算、经验沉淀、下一步建议以及结论到原始证据的精确溯源。

当前版本仅使用本地 Node.js 进程运行，不包含 Docker 配置。
