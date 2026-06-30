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
4. 阶段 3：后端查询与统计 API。
5. 阶段 4：前端基础能力与页面。
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

## 7. 阶段 3：后端查询与统计 API

### 阶段目标

提供前端页面所需的全部查询接口，包括首页看板、任务列表、任务详情、失败用例和统计查询。

### 开发任务

1. 实现任务列表接口：
   - `GET /api/v1/runs`
   - 支持时间范围筛选
   - 支持 owner 筛选
   - 支持执行机筛选
   - 支持任务状态筛选
   - 支持分页
2. 实现任务详情接口：
   - `GET /api/v1/runs/{run_id}`
   - 返回任务基础信息
   - 返回汇总结果
   - 返回用例结果列表
3. 实现任务详情用例筛选：
   - 按结果筛选
   - 按模块筛选
   - 按 case ID 搜索
   - 按用例名称搜索
4. 实现首页看板接口：
   - `GET /api/v1/dashboard/summary`
   - 今日任务总数
   - 今日任务通过率
   - 今日用例总数
   - 今日用例通过率
   - 今日失败用例数
   - 按 owner 聚合
   - 按执行机展示最近执行结果和最近上报时间
   - 最近失败任务
   - 最近失败用例
5. 实现失败用例接口：
   - `GET /api/v1/cases/failures`
   - 支持时间范围、owner、runner、module、case ID 搜索
6. 实现统计接口：
   - `GET /api/v1/stats/by-date`
   - `GET /api/v1/stats/by-owner`
   - `GET /api/v1/stats/by-runner`
   - `GET /api/v1/stats/by-case`
7. 固化统计口径。
   - 用例通过率 = 通过用例数 / 已执行用例数
   - 任务通过率 = 通过任务数 / 已结束任务数
   - 跳过用例不计入失败，但需要单独展示
8. 编写查询和统计测试。

### 建议产物

- `backend/app/api/v1/runs.py`
- `backend/app/api/v1/dashboard.py`
- `backend/app/api/v1/cases.py`
- `backend/app/api/v1/stats.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/services/stats_service.py`
- `backend/tests/api/test_runs.py`
- `backend/tests/api/test_dashboard.py`
- `backend/tests/api/test_stats.py`

### 验收标准

- API 能覆盖首页、任务列表、任务详情、失败用例、统计查询的数据需求。
- 所有列表接口支持分页。
- 常用筛选条件可用。
- 通过率、失败数、跳过数计算一致。
- 统计接口在有多 owner、多 runner、多日期数据时结果正确。

## 8. 阶段 4：前端基础能力与页面

### 阶段目标

交付一个可用的内网测试平台后台页面，让用户可以查看测试任务、定位失败用例、进入详情、查看统计趋势。

### 开发任务

1. 接入 OpenAPI 类型生成。
   - 使用 `openapi-typescript`
   - 生成 `frontend/src/api/schema.d.ts`
2. 封装 API client。
   - 使用 `openapi-fetch`
   - 统一 base URL
   - 统一错误处理
3. 封装业务 API 模块。
   - `dashboard.ts`
   - `runs.ts`
   - `cases.ts`
   - `stats.ts`
4. 接入 TanStack Query。
   - dashboard hooks
   - runs hooks
   - run detail hooks
   - failure cases hooks
   - stats hooks
5. 搭建前端主布局。
   - 顶部导航或侧边导航
   - 页面容器
   - loading 状态
   - empty 状态
   - error 状态
6. 实现路由。
   - `/`
   - `/runs`
   - `/runs/:runId`
   - `/failures`
   - `/stats`
7. 实现首页看板。
   - 今日核心指标
   - owner 维度统计
   - 执行机最近状态
   - 最近失败任务
   - 最近失败用例
8. 实现任务列表页。
   - 筛选表单
   - 任务状态展示
   - 用例总数
   - 失败数
   - 通过率
   - 分页
9. 实现任务详情页。
   - 任务基础信息
   - 汇总结果
   - 用例列表
   - 失败错误信息
   - 日志链接
   - 截图链接
   - 报告链接
10. 实现失败用例页。
    - 失败用例列表
    - owner、runner、module、case ID 筛选
    - 跳转任务详情
11. 实现统计页。
    - 按日期趋势
    - 按 owner 对比
    - 按执行机统计
    - 按用例失败次数统计
12. 编写前端基础测试。

### 建议产物

- `frontend/src/api/client.ts`
- `frontend/src/api/dashboard.ts`
- `frontend/src/api/runs.ts`
- `frontend/src/api/cases.ts`
- `frontend/src/api/stats.ts`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/hooks/useRuns.ts`
- `frontend/src/hooks/useRunDetail.ts`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/RunsPage.tsx`
- `frontend/src/pages/RunDetailPage.tsx`
- `frontend/src/pages/FailuresPage.tsx`
- `frontend/src/pages/StatsPage.tsx`
- `frontend/src/routes/index.tsx`

### 验收标准

- 用户可以从首页进入失败任务和任务详情。
- 任务列表筛选可用。
- 任务详情能快速定位失败用例。
- 日志、截图、报告链接可以点击打开。
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

### 里程碑 3：查询可用

覆盖阶段：

- 阶段 3

交付结果：

- 后端查询和统计 API 完成。
- 可以通过 API 查看任务、详情、失败用例和统计数据。

### 里程碑 4：页面可用

覆盖阶段：

- 阶段 4

交付结果：

- 首页看板、任务列表、任务详情、失败用例、统计页面完成。
- 用户可以通过页面完成核心查看和排查流程。

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
