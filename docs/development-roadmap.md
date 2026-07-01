# 测试平台开发路线图

## 1. 项目现状

当前项目处于需求与技术选型阶段，已有文档：

- `prd.md`：定义测试平台的背景、核心约束、功能需求和验收标准。
- `tech-stack.md`：定义推荐技术栈、目录结构、工程化工具和实施顺序。

当前还没有后端、前端、数据库迁移、部署配置等源码实现。因此开发路线图应从工程初始化开始，逐步交付一个可运行、可上报、可查询、可统计、可部署的内网测试结果平台。

## 2. 总体目标

搭建一个公司内网测试平台。测试框架在用例执行完成后，将本次完整测试结果通过 API 上报到平台。平台负责保存执行机、测试任务、用例结果，并提供任务查询、失败分析、统计看板和基础部署能力。

首版明确不做以下能力：

- 不调度测试任务。
- 不执行测试用例。
- 不做实时过程监控。
- 不保存附件文件，只保存报告、日志、截图等链接。
- 不引入复杂权限系统，优先依赖内网访问控制和上报 API token。

## 3. 推荐阶段顺序

建议按以下顺序推进：

1. 阶段 0：项目定型与骨架初始化。
2. 阶段 1：数据库模型与迁移。
3. 阶段 2：上报链路 MVP。
4. 阶段 3：核心查询功能切片并行交付。
5. 阶段 4：看板统计功能切片并行交付。
6. 阶段 5：联调、测试与部署。
7. 阶段 6：首版后增强。

优先级原则：

- 先打通真实数据闭环，再完善页面体验。
- 先保证上报幂等和数据可靠，再做复杂统计。
- 先交付内网首版，再扩展 SSO、告警、附件、全文检索等能力。

## 4. 阶段 0：项目定型与骨架初始化

### 阶段目标

把当前文档项目变成一个可运行、可测试、可继续开发的前后端分离工程。

### 开发任务

1. 初始化 Git 仓库。
2. 创建基础目录结构：
   - `backend/`
   - `frontend/`
   - `docs/`
   - `docker-compose.yml`
3. 初始化后端项目：
   - FastAPI
   - Pydantic v2
   - SQLAlchemy 2.x
   - Alembic
   - pytest
   - ruff
   - mypy
4. 初始化前端项目：
   - React
   - TypeScript
   - Vite
   - Tailwind CSS
   - shadcn/ui
5. 增加环境配置文件：
   - `.env.example`
   - 后端配置读取模块
   - 前端 API base URL 配置
6. 增加后端健康检查接口：
   - `GET /health`
7. 增加基础 README：
   - 本地启动方式
   - 后端测试方式
   - 前端开发方式
   - 本地 PostgreSQL 配置方式
   - Docker Compose 应用启动方式

### 建议产物

- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/tests/test_health.py`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `docker-compose.yml`
- `.env.example`
- `README.md`

### 验收标准

- 后端可以本地启动。
- 前端可以本地启动。
- 本机已安装的 PostgreSQL 可以被后端连接。
- Docker Compose 不包含 PostgreSQL 服务。
- `GET /health` 返回正常状态。
- 后端 lint、类型检查和测试命令可运行。
- 前端 lint、格式化和测试命令可运行。

## 5. 阶段 1：数据库模型与迁移

### 阶段目标

建立首版核心数据模型，为上报、查询、统计提供稳定的数据基础。

### 开发任务

1. 定义 `runners` 表。
   - `runner_id`
   - `runner_name`
   - `runner_owner`
   - `ip`
   - `created_at`
   - `updated_at`
2. 定义 `test_runs` 表。
   - `run_id`
   - `idempotency_key`
   - `runner_id`
   - `runner_owner`
   - `started_at`
   - `ended_at`
   - `duration_ms`
   - `status`
   - `report_url`
   - 汇总字段：total、passed、failed、skipped、blocked、error
   - `created_at`
3. 定义 `test_case_results` 表。
   - `id`
   - `run_id`
   - `case_id`
   - `case_name`
   - `module`
   - `result`
   - `duration_ms`
   - `error_type`
   - `error_message`
   - `log_url`
   - `screenshot_url`
   - `created_at`
4. 创建 Alembic 初始 migration。
5. 添加关键索引。
   - `test_runs.idempotency_key` 唯一索引
   - `test_runs.started_at`
   - `test_runs.runner_owner`
   - `test_runs.runner_id`
   - `test_runs.status`
   - `test_case_results.run_id`
   - `test_case_results.case_id`
   - `test_case_results.result`
   - `test_case_results.module`
6. 明确字段长度限制。
   - 名称字段
   - URL 字段
   - 错误信息字段
7. 编写 migration smoke test 或数据库模型基础测试。

### 建议产物

- `backend/app/models/runner.py`
- `backend/app/models/test_run.py`
- `backend/app/models/test_case_result.py`
- `backend/alembic/versions/<revision>_initial_schema.py`
- `backend/tests/db/test_migrations.py`

### 验收标准

- 可以一键创建完整数据库 schema。
- `idempotency_key` 唯一约束生效。
- 三类核心实体关系清晰。
- 常用筛选字段已有索引。
- migration 可以在空库上成功执行。

## 6. 阶段 2：上报链路 MVP

### 阶段目标

优先打通最核心业务闭环：测试框架可以上报完整测试结果，平台可以可靠入库，并保证重复上报不生成重复任务。

### 开发任务

1. 定义上报请求 schema。
   - `idempotency_key`
   - `runner`
   - `run`
   - `summary`
   - `cases`
2. 定义上报响应 schema。
   - `run_id`
   - `status`
   - `message`
3. 实现 `POST /api/v1/test-reports`。
4. 实现 API token 校验。
5. 实现 runner 自动创建或更新。
6. 实现 `runner_owner` 写入任务快照。
7. 实现测试任务入库。
8. 实现用例结果批量入库。
9. 实现幂等逻辑。
   - 同一个 `idempotency_key` 重复上报时返回已有 `run_id`。
   - 重复上报不重复写入用例结果。
10. 实现上报数据校验。
    - 必填字段校验
    - 枚举值校验
    - 开始结束时间校验
    - 汇总数与用例明细一致性校验
11. 编写 API 测试。
    - 正常上报
    - 重复上报
    - 缺少必填字段
    - 非法状态
    - token 错误

### 建议产物

- `backend/app/api/v1/test_reports.py`
- `backend/app/schemas/test_report.py`
- `backend/app/services/test_report_importer.py`
- `backend/app/repositories/runners.py`
- `backend/app/repositories/test_runs.py`
- `backend/app/repositories/test_case_results.py`
- `backend/tests/api/test_test_reports.py`

### 验收标准

- 一次完整上报能生成一条测试任务和多条用例结果。
- 首次出现的执行机能自动创建。
- 重复 `idempotency_key` 不产生重复任务。
- 重复上报返回已有 `run_id`。
- 非法 payload 返回明确错误。
- 未授权请求无法上报。

## 7. 阶段 3：核心查询功能切片并行交付

### 阶段目标

在上报链路 MVP 稳定后，不再按“后端 API 全部完成后再做前端页面”的串行方式推进，而是按用户可独立验收的功能切片并行交付。每个切片同时包含后端接口、OpenAPI 契约、前端页面、数据请求 hooks、测试和联调验收。

本阶段优先交付测试排查的核心闭环：

- 查看任务列表。
- 进入任务详情。
- 定位失败用例。
- 打开报告、日志、截图链接。

### 并行交付规则

1. 每个功能切片先约定 API 契约。
   - 请求路径
   - 查询参数
   - 响应 schema
   - 分页格式
   - 错误响应格式
2. 后端和前端基于同一契约并行开发。
   - 后端实现真实接口、服务、仓储和测试。
   - 前端先基于 OpenAPI 类型和 mock 数据开发页面状态，再切换到真实接口。
3. 每个切片独立验收。
   - 有后端 API 测试。
   - 有前端页面或 hook 测试。
   - 有真实联调数据验证。
   - 页面具备 loading、empty、error 状态。
4. 切片之间只通过稳定接口和共享类型协作。
   - 不要求等待全部查询 API 完成。
   - 不要求等待全部页面完成。
   - 不把统计页面作为任务列表或详情页的前置条件。

### 建议实现顺序

阶段 3 仍按功能切片并行交付，但实际落地时建议先完成基础应用框架的薄版承载层，再按核心排查闭环推进业务切片，最后回到应用框架做一致性收口。

1. 功能切片 D：基础应用框架薄版。
   - 前端：接入 TanStack Query。
   - 前端：实现主布局、导航、页面容器。
   - 前端：实现 `/`、`/runs`、`/runs/:runId`、`/failures` 路由占位。
   - 前端：提供统一 loading、empty、error 状态组件。
   - 前后端：先约定统一错误响应展示策略。
   - 测试：覆盖基础路由渲染。
   - 验收：阶段 3 的业务页面有稳定的路由、布局和请求状态承载层。
2. 功能切片 A：任务列表查询。
   - 后端：实现 `GET /api/v1/runs`。
   - 后端：支持时间范围、owner、执行机、任务状态筛选。
   - 后端：支持分页和稳定排序。
   - 后端：返回任务状态、用例总数、失败数、通过率、报告链接。
   - 前端：接入 OpenAPI 类型生成。
   - 前端：封装 API client、runs API 模块和 `useRuns` hook。
   - 前端：实现 `/runs` 页面、筛选表单、状态展示和分页。
   - 测试：覆盖后端筛选、分页、排序和前端筛选交互。
   - 验收：用户可以按常用条件筛选任务，并从列表进入任务详情。
3. 功能切片 B：任务详情与用例明细。
   - 后端：实现 `GET /api/v1/runs/{run_id}`。
   - 后端：返回任务基础信息、汇总结果和用例结果列表。
   - 后端：支持用例结果、模块、case ID、用例名称筛选。
   - 前端：封装 run detail API 模块和 `useRunDetail` hook。
   - 前端：实现 `/runs/:runId` 页面。
   - 前端：展示任务基础信息、汇总结果、用例列表、错误信息、报告链接、日志链接、截图链接。
   - 测试：覆盖详情查询、用例筛选和链接展示。
   - 验收：用户可以从任务详情快速定位失败用例并打开外部链接。
4. 功能切片 C：失败用例排查。
   - 后端：实现 `GET /api/v1/cases/failures`。
   - 后端：支持时间范围、owner、runner、module、case ID 搜索。
   - 后端：返回失败用例、所属任务、错误类型、错误信息、日志链接、截图链接。
   - 前端：封装 failure cases API 模块和 `useFailureCases` hook。
   - 前端：实现 `/failures` 页面。
   - 前端：支持筛选、分页、跳转任务详情。
   - 测试：覆盖失败用例筛选、分页和跳转。
   - 验收：用户可以从失败用例页直接找到关联任务和排查入口。
5. 功能切片 D：基础应用框架一致性收口。
   - 前端：统一 loading、empty、error 状态。
   - 前端：补齐 `/`、`/runs`、`/runs/:runId`、`/failures` 的导航关系。
   - 前后端：验证并收口统一错误响应展示策略。
   - 测试：覆盖路由渲染、错误态和空状态。
   - 验收：阶段 3 的三个业务页面可以在同一应用框架下稳定访问。

### 建议产物

- `backend/app/api/v1/runs.py`
- `backend/app/api/v1/cases.py`
- `backend/app/services/run_query_service.py`
- `backend/app/services/failure_case_service.py`
- `backend/tests/api/test_runs.py`
- `backend/tests/api/test_failure_cases.py`
- `frontend/src/api/client.ts`
- `frontend/src/api/runs.ts`
- `frontend/src/api/cases.ts`
- `frontend/src/api/schema.d.ts`
- `frontend/src/hooks/useRuns.ts`
- `frontend/src/hooks/useRunDetail.ts`
- `frontend/src/hooks/useFailureCases.ts`
- `frontend/src/pages/RunsPage.tsx`
- `frontend/src/pages/RunDetailPage.tsx`
- `frontend/src/pages/FailuresPage.tsx`
- `frontend/src/routes/index.tsx`

### 验收标准

- 任务列表、任务详情、失败用例三个核心切片均可独立联调和验收。
- 所有列表接口支持分页、筛选和稳定排序。
- 前端页面使用真实接口展示数据，不依赖硬编码 mock 数据。
- 用户可以从任务列表进入详情，也可以从失败用例进入关联任务。
- 日志、截图、报告链接可以点击打开。
- loading、empty、error 状态在核心页面中可见且一致。

## 8. 阶段 4：看板统计功能切片并行交付

### 阶段目标

在阶段 3 的核心排查闭环基础上，继续按功能切片并行交付首页看板、统计趋势和跨页面体验完善。阶段 4 不再是单纯的前端页面阶段，而是将统计口径、聚合 API、页面展示和测试作为同一个交付单元处理。

### 开发任务

1. 功能切片 E：首页看板。
   - 后端：实现 `GET /api/v1/dashboard/summary`。
   - 后端：返回今日任务总数、今日任务通过率、今日用例总数、今日用例通过率、今日失败用例数。
   - 后端：返回 owner 聚合、执行机最近执行结果、执行机最近上报时间、最近失败任务、最近失败用例。
   - 前端：封装 dashboard API 模块和 `useDashboard` hook。
   - 前端：实现 `/` 首页看板。
   - 前端：支持从最近失败任务、最近失败用例跳转到详情或失败用例页。
   - 测试：覆盖聚合计算、空数据状态和跳转。
   - 验收：用户打开首页即可判断当天整体质量和主要失败入口。
2. 功能切片 F：统计趋势与对比。
   - 后端：实现 `GET /api/v1/stats/by-date`。
   - 后端：实现 `GET /api/v1/stats/by-owner`。
   - 后端：实现 `GET /api/v1/stats/by-runner`。
   - 后端：实现 `GET /api/v1/stats/by-case`。
   - 后端：支持时间范围筛选。
   - 前端：封装 stats API 模块和 `useStats` hook。
   - 前端：实现 `/stats` 页面。
   - 前端：展示按日期趋势、按 owner 对比、按执行机统计、按用例失败次数统计。
   - 测试：覆盖多 owner、多 runner、多日期、多 case 数据下的统计结果和页面渲染。
   - 验收：用户可以查看趋势、对比环境质量，并识别高频失败用例。
3. 功能切片 G：统计口径与展示一致性。
   - 后端：固化用例通过率、任务通过率、跳过用例、失败用例的计算口径。
   - 后端：为 dashboard 和 stats 复用同一套统计服务或聚合函数。
   - 前端：统一通过率、数量、状态、时间范围的展示格式。
   - 前端：统一 dashboard、runs、failures、stats 的筛选字段命名。
   - 测试：同一组 seed 数据在 dashboard、stats、列表页面中得到一致数字。
   - 验收：后端 API、前端展示和文档说明中的统计口径一致。
4. 功能切片 H：跨页面体验完善。
   - 前端：补齐 dashboard、runs、run detail、failures、stats 的导航关系。
   - 前端：补齐所有页面的 loading、empty、error 状态。
   - 前端：保证常见桌面分辨率下布局稳定。
   - 前端：统一 API 错误提示、重试入口和空状态文案。
   - 前后端：补齐 OpenAPI schema 生成和契约更新流程。
   - 测试：覆盖页面基础渲染、筛选交互、错误态和空状态。
   - 验收：用户可以从首页、任务列表、失败用例、统计页之间顺畅跳转并完成排查。

### 建议产物

- `frontend/src/api/dashboard.ts`
- `frontend/src/api/stats.ts`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/hooks/useStats.ts`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/StatsPage.tsx`
- `backend/app/api/v1/dashboard.py`
- `backend/app/api/v1/stats.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/services/stats_service.py`
- `backend/tests/api/test_dashboard.py`
- `backend/tests/api/test_stats.py`

### 验收标准

- 首页看板、统计趋势和核心排查页面使用一致统计口径。
- 用户可以从首页进入失败任务、失败用例和任务详情。
- 统计页可以展示日期、owner、执行机、用例维度的聚合结果。
- 通过率、失败数、跳过数计算一致。
- 统计接口在有多 owner、多 runner、多日期数据时结果正确。
- 所有页面有 loading、empty、error 状态。
- 页面在常见桌面分辨率下布局稳定。

## 9. 阶段 5：联调、测试与部署

### 阶段目标

形成可交付的首版内网系统，保证从测试框架上报到页面展示的完整链路可验证。

### 开发任务

1. 准备上报示例。
   - curl 示例
   - Python 示例脚本
   - 示例 JSON payload
2. 准备 seed 数据。
   - 多 owner
   - 多 runner
   - 多任务状态
   - 多用例结果
   - 多日期数据
3. 完善后端测试。
   - schema 校验
   - 上报幂等
   - 查询筛选
   - 统计口径
   - API token
4. 完善前端测试。
   - 页面基础渲染
   - 筛选交互
   - 错误态
   - 空状态
5. 配置 Docker Compose。
   - backend
   - frontend
   - reverse-proxy
6. 配置后端连接本机 PostgreSQL。
   - 创建数据库
   - 创建数据库用户
   - 配置 `DATABASE_URL`
   - 验证 migration 可连接本机数据库
7. 配置 Nginx 或 Caddy。
   - 页面入口 `/`
   - API 入口 `/api/*`
   - OpenAPI 文档 `/docs`
8. 编写部署说明。
   - 环境变量
   - 安装和启动本机 PostgreSQL
   - 初始化数据库和用户
   - 执行 migration
   - 启动服务
   - 查看日志
   - 备份数据库
9. 执行端到端验收。
   - 上报一批数据
   - 查看首页看板
   - 查看任务列表
   - 查看任务详情
   - 验证失败用例筛选
   - 验证重复上报不会生成重复任务

### 建议产物

- `examples/report_payload.json`
- `examples/submit_report.py`
- `backend/app/scripts/seed_data.py`
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `deploy/nginx.conf` 或 `deploy/Caddyfile`
- `docs/deployment.md`
- `docs/api-reporting.md`

### 验收标准

- 新环境可以按文档启动。
- 测试框架或示例脚本能真实上报数据。
- 页面能展示上报结果。
- PRD 中的 6 条验收标准全部可验证。
- 重启服务后数据仍然存在。

## 10. 阶段 6：首版后增强

### 阶段目标

在首版稳定后，围绕权限、分析、运维和扩展能力做增强。

### 候选任务

1. 接入公司 SSO 或统一登录。
2. 增加 owner、runner、module 字典接口。
3. 增加失败 Top N 看板。
4. 增加用例稳定性分析。
5. 增加失败趋势和连续失败统计。
6. 增加上报失败告警。
7. 增加数据保留和归档策略。
8. 增加附件存储能力。
9. 增加日志全文检索能力。
10. 评估 Redis、任务队列、异步处理是否必要。

### 验收标准

- 增强能力不破坏首版上报、查询、统计链路。
- 权限能力不会影响测试框架自动上报。
- 统计增强有清晰口径说明。
- 新增基础设施有明确收益，不为未来假设过早引入复杂度。

## 11. 建议里程碑

### 里程碑 1：工程可运行

覆盖阶段：

- 阶段 0
- 阶段 1

交付结果：

- 后端、前端、数据库工程骨架完成。
- 数据库 schema 完成。
- 本地开发环境可运行。

### 里程碑 2：上报可用

覆盖阶段：

- 阶段 2

交付结果：

- 测试框架可以上报测试结果。
- 数据可入库。
- 幂等逻辑可用。

### 里程碑 3：核心排查切片可用

覆盖阶段：

- 阶段 3

交付结果：

- 任务列表、任务详情、失败用例三个切片完成前后端联调。
- 用户可以通过页面查看任务、进入详情并定位失败用例。
- 核心查询接口、页面状态和基础测试同步完成。

### 里程碑 4：看板统计切片可用

覆盖阶段：

- 阶段 4

交付结果：

- 首页看板和统计趋势切片完成前后端联调。
- 统计口径在 dashboard、stats、列表页面中保持一致。
- 用户可以通过首页、任务列表、任务详情、失败用例和统计页面完成核心查看和排查流程。

### 里程碑 5：首版交付

覆盖阶段：

- 阶段 5

交付结果：

- Docker Compose 部署完成。
- 应用服务可以连接本机 PostgreSQL。
- 示例上报完成。
- 文档和验收流程完成。
- 首版可以在内网试运行。

## 12. 风险与注意事项

1. 幂等逻辑必须优先实现并测试。
   - 这是上报链路可靠性的核心。
   - 不能只依赖前端或测试框架避免重复请求。

2. `runner_owner` 需要作为任务快照保存。
   - 执行机 owner 后续可能变化。
   - 历史任务统计应使用上报当时的 owner。

3. 统计口径需要保持一致。
   - 后端 API、前端展示、文档说明必须一致。
   - 跳过用例不计入失败，但必须单独展示。

4. 列表接口必须分页。
   - 测试结果数据增长会比较快。
   - 首版就应避免无分页全量返回。

5. 字段长度需要限制。
   - `error_message`、URL、名称字段可能异常大。
   - 应在 schema 和数据库层同时约束。

6. 首版不要过早引入复杂基础设施。
   - 暂不引入 Redis、Celery、WebSocket、对象存储、全文检索、Kubernetes。
   - 等实际需求明确后再扩展。

## 13. 首版完成定义

首版完成需要满足以下条件：

1. 测试框架执行完成后，可以通过 API 上报完整测试结果。
2. 平台可以按执行机 owner 查询和统计不同环境的执行情况。
3. 平台可以展示任务列表、任务详情和用例明细。
4. 平台可以筛选失败任务和失败用例。
5. 平台可以展示失败用例的错误信息和日志链接。
6. 同一次执行重复上报时，不产生重复任务。
7. 系统可以使用本机 PostgreSQL，并通过 Docker Compose 部署应用服务。
8. 有上报示例、部署说明和基础运维说明。
