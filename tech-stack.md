# 测试平台技术栈文档

## 1. 结论

本项目采用 `Python + React` 的前后端分离技术栈。

推荐主栈：

- 后端：FastAPI + Pydantic v2 + SQLAlchemy 2.x + Alembic
- 数据库：本地安装的 PostgreSQL
- 前端：React + TypeScript + Vite
- UI：shadcn/ui + Tailwind CSS
- 前端请求和数据层：openapi-fetch + TanStack Query + TanStack Table
- 部署：本地 PostgreSQL + Docker Compose + Nginx 或 Caddy

该选型面向首版内网测试平台，重点服务于单条用例结果和报告文件上报、幂等入库、用例报告查询、统计看板和失败分析。

## 2. 项目特点

根据 `prd.md`，当前系统有以下特点：

- 平台只负责接收和展示测试结果，不负责任务调度和用例执行。
- 每条用例执行完成后独立上报，不需要实时过程监控。
- 每条用例会单独生成测试报告，上报时必须携带报告文件，由平台保存。
- 首版只在公司内网使用。
- 核心数据模型清晰，主要围绕执行机和用例报告两类实体。
- 首版不建模测试套件或测试任务。

因此，技术栈应优先考虑：

- API 数据校验清晰。
- 数据入库和迁移可靠。
- 查询统计实现直接。
- 前端后台页面开发效率高。
- 首版部署简单。
- 后续仍有可维护性和扩展空间。

## 3. 后端技术栈

### 3.1 FastAPI

用途：

- 提供单条用例报告上报接口。
- 保存上报的报告文件，并提供报告访问入口。
- 提供用例报告列表、详情、统计看板等查询接口。
- 自动生成 OpenAPI 文档，方便测试框架和前端对接。

选择原因：

- 适合构建 JSON API。
- 基于 Python 类型注解和 Pydantic 做请求体验证。
- 内置 OpenAPI、Swagger UI、ReDoc 文档能力。
- 与测试平台常见的 Python 技术生态匹配。

首版接口重点：

- `POST /api/v1/test-reports`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/case-reports`
- `GET /api/v1/case-reports/{case_report_id}`
- `GET /api/v1/case-reports/{case_report_id}/report`
- `GET /api/v1/cases/failures`
- `GET /api/v1/stats/by-date`
- `GET /api/v1/stats/by-owner`
- `GET /api/v1/stats/by-runner`
- `GET /api/v1/stats/by-case`

### 3.2 Pydantic v2

用途：

- 定义 API 请求和响应 schema。
- 校验用例报告上报数据和报告文件必传规则。
- 管理环境变量和配置。

推荐搭配：

- `pydantic`：请求、响应、领域 DTO。
- `pydantic-settings`：服务配置，例如数据库地址、API token、部署环境。

### 3.3 SQLAlchemy 2.x

用途：

- 定义数据库模型。
- 实现执行机和用例报告的增删查改。
- 实现报告文件元数据持久化。
- 实现统计查询。

选择原因：

- Python 生态成熟的数据库工具。
- 同时支持 ORM 和 SQL Expression。
- 适合在常规业务查询中使用 ORM，在复杂统计中使用 SQL 表达式或原生 SQL。

首版建议使用同步 SQLAlchemy + `psycopg3`，原因是上报和查询压力预计不高，同步模型更简单，排查问题也更直接。后续如果有明确高并发需求，再评估异步 SQLAlchemy + `asyncpg`。

### 3.4 Alembic

用途：

- 管理数据库 schema 迁移。
- 记录表结构变更历史。
- 支持开发、测试、生产环境一致演进。

基本约定：

- 所有表结构变更必须通过 Alembic migration。
- 不直接手工修改生产库表结构。
- migration 文件需要跟随代码提交。

### 3.5 PostgreSQL

用途：

- 保存执行机、用例报告和报告文件元数据。
- 支撑按时间、owner、执行机、状态、模块、用例 ID 的查询和统计。

部署约定：

- 首版使用本机已安装的 PostgreSQL，不通过 Docker Compose 启动数据库服务。
- 后端通过环境变量 `DATABASE_URL` 连接本机 PostgreSQL。
- 如果后端运行在 Docker 容器内，需要按宿主机环境配置数据库主机名，例如 macOS/Windows 可使用 `host.docker.internal`，Linux 可使用 host gateway 或部署机内网地址。

选择原因：

- 关系模型适合当前数据结构。
- 聚合查询能力强，适合看板统计。
- 索引能力成熟，能覆盖常见筛选和排序。

核心表：

- `runners`
- `test_case_reports`

关键索引：

- `test_case_reports.idempotency_key` 唯一索引。
- `test_case_reports.started_at` 普通索引。
- `test_case_reports.runner_owner` 普通索引。
- `test_case_reports.runner_id` 普通索引。
- `test_case_reports.result` 普通索引。
- `test_case_reports.case_id` 普通索引。
- `test_case_reports.module` 普通索引。

报告文件字段：

- `report_file_path`：平台保存的报告文件相对路径。
- `report_filename`：原始报告文件名。
- `report_content_type`：报告文件 MIME 类型。
- `report_size_bytes`：报告文件大小。

文件保存约定：

- `POST /api/v1/test-reports` 使用 `multipart/form-data`。
- 表单字段 `payload` 保存用例执行结果 JSON。
- 表单字段 `report_file` 保存必传报告文件。
- 后端生成内部唯一文件路径，避免直接信任上传文件名。
- 查询接口返回平台生成的报告访问入口，前端不直接依赖服务器文件路径。

## 4. 前端技术栈

### 4.1 React + TypeScript + Vite

用途：

- 构建内网测试平台管理后台。
- 实现首页看板、用例报告列表、用例报告详情、失败用例列表和统计页面。

选择原因：

- React 适合组件化构建后台 UI。
- TypeScript 能提升接口数据使用的可靠性。
- Vite 开发体验轻量，适合前后端分离项目。

### 4.2 shadcn/ui + Tailwind CSS

用途：

- 构建按钮、输入框、弹窗、下拉选择、Tabs、Badge、Card、表单等基础 UI。
- 通过 Tailwind CSS 控制页面布局和视觉细节。

选择原因：

- shadcn/ui 不是黑盒组件库，组件代码会进入项目，后续可直接修改。
- Tailwind CSS 适合快速构建可控的后台页面。
- 比 Ant Design 更不容易被固定视觉风格锁住。
- 对当前项目这类中等复杂度后台更灵活。

### 4.3 React Router

用途：

- 管理前端页面路由。

建议路由：

- `/`：首页看板
- `/case-reports`：用例报告列表
- `/case-reports/:caseReportId`：用例报告详情
- `/failures`：失败用例
- `/stats`：统计查询

### 4.4 TanStack Query

用途：

- 管理服务端状态、缓存、加载状态、错误状态和重新拉取。
- 降低页面中手写 loading/error/refetch 状态的复杂度。

适用场景：

- 首页看板数据。
- 用例报告列表查询。
- 用例报告详情查询。
- 统计图表查询。

### 4.5 openapi-fetch

用途：

- 作为前端默认 HTTP client。
- 基于 FastAPI 暴露的 OpenAPI schema 提供类型安全请求。
- 统一处理 API base URL、请求 header、错误返回和响应数据。

建议封装：

```text
frontend/src/
  api/
    schema.d.ts
    client.ts
    dashboard.ts
    caseReports.ts
    cases.ts
    stats.ts
```

分工：

- `schema.d.ts`：由 `openapi-typescript` 根据后端 `/openapi.json` 生成。
- `client.ts`：创建 `openapi-fetch` client，配置 base URL 和公共 header。
- `caseReports.ts`、`dashboard.ts` 等：按业务模块封装 API 函数。
- React 页面和 hooks 不直接调用底层 client，而是调用业务 API 函数。

### 4.6 TanStack Table

用途：

- 构建用例报告列表。
- 支持分页、排序、筛选、列定义和表格状态管理。

适用页面：

- 用例报告列表。
- 失败用例列表。
- 按用例统计失败次数列表。

### 4.7 React Hook Form + Zod

用途：

- 管理筛选表单。
- 管理后续可能增加的配置表单。
- 做前端表单校验和类型推导。

适用场景：

- 时间范围筛选。
- owner 筛选。
- 执行机筛选。
- 状态筛选。
- 模块筛选。
- 用例 ID 或用例名称搜索。

### 4.8 ECharts

用途：

- 实现统计图表。

适用图表：

- 按日期的用例数、失败数、通过率趋势。
- 按 owner 的用例数、失败数、通过率对比。
- 按执行机的最近执行结果和上报时间展示。

## 5. API 类型同步

推荐使用 FastAPI 生成的 OpenAPI 作为前后端契约来源。

建议工具：

- `openapi-typescript`：根据 OpenAPI schema 生成前端 TypeScript 类型。
- `openapi-fetch`：基于生成的类型发送类型安全 API 请求。
- 前端保留轻量 API client，统一处理 base URL、错误、鉴权 header。

基本流程：

1. 后端通过 FastAPI 暴露 `/openapi.json`。
2. 前端使用 `openapi-typescript` 生成 API 类型。
3. 前端使用 `openapi-fetch` 创建类型安全 API client。
4. 按业务模块封装请求函数，例如 `caseReports.ts`、`dashboard.ts`、`stats.ts`。
5. 页面通过 `TanStack Query` 调用业务请求函数，管理缓存、加载和错误状态。

示例分层：

```text
React Page
  -> useCaseReportsQuery
    -> getCaseReports
      -> openapi-fetch client
        -> FastAPI
```

不建议页面组件直接写 `fetch` 或直接拼 URL。请求入口应收敛到 `src/api/`，页面只关心业务数据和状态。

## 6. 工程化工具

### 6.1 Python 工具

推荐：

- `uv`：Python 包管理、虚拟环境、lockfile 和命令运行。
- `ruff`：lint 和格式化。
- `mypy`：静态类型检查。
- `pytest`：后端测试。
- `httpx`：API 测试客户端。

### 6.2 前端工具

推荐：

- `pnpm`：前端包管理。
- `eslint`：代码检查。
- `prettier`：代码格式化。
- `prettier-plugin-tailwindcss`：Tailwind class 排序。
- `vitest`：前端单元测试。
- `@testing-library/react`：React 组件测试。

### 6.3 Git Hook

可选：

- `pre-commit`

建议首版配置：

- 后端：`ruff check`、`ruff format --check`、`mypy`、`pytest`
- 前端：`eslint`、`prettier --check`、`vitest`

## 7. 部署方案

首版推荐本地 PostgreSQL + Docker Compose。

服务组成：

- `backend`：FastAPI 服务。
- `frontend`：React 构建产物，由 Nginx 或 Caddy 托管。
- `reverse-proxy`：Nginx 或 Caddy，对外提供统一入口。

数据库：

- PostgreSQL 使用本机已安装服务。
- Docker Compose 不包含 `db` 服务。
- 部署时需要提前创建数据库、用户和连接串，并通过环境变量传给后端。

推荐入口：

- 页面：`/`
- API：`/api/*`
- OpenAPI 文档：`/docs`，内网可开放，生产如有安全要求可关闭或限制访问。

## 8. 安全和访问控制

首版内网系统不建议一开始做复杂权限系统，但需要保留基础安全措施。

建议：

- 上报接口使用 API token。
- token 通过环境变量配置，不写入代码仓库。
- 前端页面依赖内网访问控制。
- 如果公司已有 SSO，后续再接入统一登录。
- 对 `POST /api/v1/test-reports` 限制请求体和报告文件大小。
- 对入库字段长度做明确限制，尤其是 `error_message`、URL、名称字段。

## 9. 暂不引入的技术

首版不建议引入：

- Redis：当前没有缓存、分布式锁、实时状态等强需求。
- Celery/RQ：平台不负责任务调度和执行。
- WebSocket：PRD 明确不需要实时过程监控。
- Elasticsearch/OpenSearch：首版只保存报告文件，不做全文检索。
- Kubernetes：内网首版使用本地 PostgreSQL 加应用层 Docker Compose 足够。
- 对象存储：首版先使用平台本地文件存储，不引入对象存储。

这些技术可以在需求明确后再引入，避免首版复杂度过高。

## 10. 推荐目录结构

```text
TestBoard/
  backend/
    app/
      api/
        v1/
      core/
      db/
      models/
      schemas/
      services/
      repositories/
    alembic/
    tests/
    pyproject.toml
    uv.lock

  frontend/
    src/
      api/
        schema.d.ts
        client.ts
        dashboard.ts
        caseReports.ts
        cases.ts
        stats.ts
      components/
      components/ui/
      hooks/
      pages/
      routes/
      types/
      lib/
    package.json
    pnpm-lock.yaml

  docker-compose.yml
  prd.md
  tech-stack.md
```

## 11. 实施顺序

建议按以下顺序落地：

1. 初始化后端项目：FastAPI、配置、健康检查、本地 PostgreSQL 连接。
2. 建立 PostgreSQL 表结构和 Alembic migration。
3. 实现 `POST /api/v1/test-reports`，包括单条用例报告入库、报告文件保存和幂等逻辑。
4. 实现用例报告列表、详情、失败用例和基础统计 API。
5. 初始化前端项目：React、Vite、Tailwind、shadcn/ui。
6. 接入 OpenAPI 类型生成和 `openapi-fetch` API client。
7. 使用 `TanStack Query` 封装首页看板、用例报告列表、详情查询 hooks。
8. 实现首页看板、用例报告列表、用例报告详情和失败用例页。
9. 补充测试、本地 PostgreSQL 配置、Docker Compose 和部署说明。

## 12. 参考文档

- FastAPI：https://fastapi.tiangolo.com/
- React：https://react.dev/
- Vite：https://vite.dev/
- shadcn/ui：https://ui.shadcn.com/
- Tailwind CSS：https://tailwindcss.com/
- SQLAlchemy：https://docs.sqlalchemy.org/
- Alembic：https://alembic.sqlalchemy.org/
- uv：https://docs.astral.sh/uv/
- openapi-fetch：https://openapi-ts.dev/openapi-fetch/
- openapi-typescript：https://openapi-ts.dev/
