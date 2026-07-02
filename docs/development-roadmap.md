# 测试平台开发路线图

## 1. 项目现状

当前项目已有前后端工程骨架、基础配置、数据库模型、上报接口和部分查询页面。早期文档以“完整测试任务一次性上报”为目标；根据最新设计，首版调整为“每条用例执行完成后独立上报一条用例报告”。

本文档以后续目标为准：平台不建模测试套件或测试任务，核心数据围绕执行机和用例报告展开。

## 2. 总体目标

搭建一个公司内网测试平台。测试框架在每条用例执行完成后，将该用例的执行结果和报告文件通过 API 上报到平台。平台负责保存执行机、报告文件、用例报告记录，并提供用例报告查询、失败分析、统计看板和基础部署能力。

首版明确不做以下能力：

- 不调度测试任务。
- 不执行测试用例。
- 不做实时过程监控。
- 不建模测试套件。
- 不建模测试任务或批次。
- 不接收独立附件；用例报告文件是上报必填内容，由平台保存。
- 不保存独立日志链接和截图链接字段。
- 不引入复杂权限系统，优先依赖内网访问控制和上报 API token。

## 3. 推荐阶段顺序

建议按以下顺序推进：

1. 阶段 0：项目骨架和开发环境。
2. 阶段 1：用例报告中心化数据模型。
3. 阶段 2：单条用例报告上报链路。
4. 阶段 3：核心查询和失败排查。
5. 阶段 4：看板统计。
6. 阶段 5：联调、测试与部署。
7. 阶段 6：首版后增强。

优先级原则：

- 先打通真实数据闭环，再完善页面体验。
- 先保证上报幂等和数据可靠，再做复杂统计。
- 先交付内网首版，再扩展 SSO、告警、附件、全文检索等能力。

## 4. 阶段 0：项目骨架和开发环境

### 阶段目标

保持后端、前端、本地 PostgreSQL、Docker Compose 和基础检查命令可运行。

### 开发任务

1. 维护后端 FastAPI、Pydantic v2、SQLAlchemy 2.x、Alembic、pytest、ruff、mypy 配置。
2. 维护前端 React、TypeScript、Vite、Tailwind CSS、shadcn/ui 配置。
3. 维护 `.env.example`、README 和 Docker Compose。
4. 保持 `GET /health` 可用。

### 验收标准

- 后端可以本地启动。
- 前端可以本地启动。
- 本机已安装的 PostgreSQL 可以被后端连接。
- Docker Compose 不包含 PostgreSQL 服务。
- `GET /health` 返回正常状态。
- 后端和前端检查命令可运行。

## 5. 阶段 1：用例报告中心化数据模型

### 阶段目标

建立首版核心数据模型，为单条用例上报、查询和统计提供稳定数据基础。

### 开发任务

1. 定义 `runners` 表。
   - `runner_id`
   - `runner_name`
   - `runner_owner`
   - `ip`
   - `created_at`
   - `updated_at`
2. 定义 `test_case_reports` 表。
   - `case_report_id`
   - `idempotency_key`
   - `runner_id`
   - `runner_owner`
   - `case_id`
   - `case_name`
   - `module`
   - `started_at`
   - `ended_at`
   - `duration_ms`
   - `result`
   - `report_file_path`
   - `report_filename`
   - `report_content_type`
   - `report_size_bytes`
   - `error_type`
   - `error_message`
   - `created_at`
3. 创建或调整 Alembic migration。
4. 添加关键索引。
   - `test_case_reports.idempotency_key` 唯一索引
   - `test_case_reports.started_at`
   - `test_case_reports.runner_owner`
   - `test_case_reports.runner_id`
   - `test_case_reports.result`
   - `test_case_reports.case_id`
   - `test_case_reports.module`
5. 明确字段长度限制。
   - 名称字段
   - 文件路径字段
   - 错误信息字段
6. 编写 migration smoke test 或数据库模型基础测试。

### 建议产物

- `backend/app/models/runner.py`
- `backend/app/models/test_case_report.py`
- `backend/alembic/versions/<revision>_case_report_schema.py`
- `backend/tests/db/test_migrations.py`

### 验收标准

- 可以一键创建完整数据库 schema。
- `idempotency_key` 唯一约束生效。
- 执行机和用例报告关系清晰。
- 常用筛选字段已有索引。
- migration 可以在空库上成功执行。

## 6. 阶段 2：单条用例报告上报链路

### 阶段目标

优先打通最核心业务闭环：测试框架每条用例执行完成后可以上报一条用例报告，平台可靠入库，并保证重复上报不生成重复记录。

### 开发任务

1. 定义上报请求 schema。
   - `idempotency_key`
   - `runner`
   - `case`
   - `report_file`
2. 定义上报响应 schema。
   - `case_report_id`
   - `status`
   - `message`
3. 实现 `POST /api/v1/test-reports`。
4. 实现 API token 校验。
5. 实现 runner 自动创建或更新。
6. 实现 `runner_owner` 写入用例报告快照。
7. 实现用例报告入库。
8. 实现报告文件保存。
   - 接收必填 `report_file`。
   - 生成平台内部唯一文件路径。
   - 保存原始文件名、MIME 类型和文件大小。
   - 查询接口返回平台生成的报告访问入口。
9. 实现报告文件访问接口。
   - 实现 `GET /api/v1/case-reports/{case_report_id}/report`。
   - 只通过平台接口访问报告文件，不暴露服务器文件路径。
10. 实现幂等逻辑。
   - 同一个 `idempotency_key` 重复上报时返回已有 `case_report_id`。
   - 重复上报不重复写入用例报告，也不覆盖已保存报告文件。
11. 实现上报数据校验。
   - 必填字段校验
   - 枚举值校验
   - 开始结束时间校验
   - 字段长度校验
   - 报告文件必传校验
   - 报告文件大小限制校验
12. 编写 API 测试。
    - 正常上报
    - 重复上报
    - 缺少必填字段
    - 非法状态
    - 缺少报告文件
    - token 错误

### 建议产物

- `backend/app/api/v1/test_reports.py`
- `backend/app/schemas/test_report.py`
- `backend/app/services/test_report_importer.py`
- `backend/app/services/report_file_storage.py`
- `backend/app/repositories/runners.py`
- `backend/app/repositories/test_case_reports.py`
- `backend/tests/api/test_test_reports.py`

### 验收标准

- 一次上报能保存报告文件并生成一条用例报告。
- 首次出现的执行机能自动创建。
- 重复 `idempotency_key` 不产生重复用例报告。
- 重复上报返回已有 `case_report_id`。
- 非法 payload 返回明确错误。
- 未授权请求无法上报。

## 7. 阶段 3：核心查询和失败排查

### 阶段目标

在上报链路稳定后，交付用户排查失败的核心闭环：

- 查看用例报告列表。
- 进入用例报告详情。
- 筛选失败用例。
- 打开平台保存的用例报告。

### 建议实现顺序

1. 功能切片 A：基础应用框架。
   - 前端：接入 TanStack Query。
   - 前端：实现主布局、导航、页面容器。
   - 前端：实现 `/`、`/case-reports`、`/case-reports/:caseReportId`、`/failures` 路由占位。
   - 前端：提供统一 loading、empty、error 状态组件。
   - 前后端：约定统一错误响应展示策略。
2. 功能切片 B：用例报告列表查询。
   - 后端：实现 `GET /api/v1/case-reports`。
   - 后端：支持时间范围、owner、执行机、结果、模块、用例 ID 或名称筛选。
   - 后端：支持分页和稳定排序。
   - 后端：返回用例信息、执行结果、耗时、报告访问入口。
   - 前端：封装 API client、case reports API 模块和 `useCaseReports` hook。
   - 前端：实现 `/case-reports` 页面、筛选表单、状态展示和分页。
3. 功能切片 C：用例报告详情。
   - 后端：实现 `GET /api/v1/case-reports/{case_report_id}`。
   - 后端：返回执行机、owner、用例信息、执行时间、结果、错误信息和报告访问入口。
   - 前端：封装 case report detail API 模块和 `useCaseReportDetail` hook。
   - 前端：实现 `/case-reports/:caseReportId` 页面。
4. 功能切片 D：失败用例排查。
   - 后端：实现 `GET /api/v1/cases/failures`。
   - 后端：支持时间范围、owner、runner、module、case ID 搜索。
   - 后端：返回失败用例、错误类型、错误信息、报告访问入口。
   - 前端：封装 failure cases API 模块和 `useFailureCases` hook。
   - 前端：实现 `/failures` 页面。

### 建议产物

- `backend/app/api/v1/case_reports.py`
- `backend/app/api/v1/cases.py`
- `backend/app/services/case_report_query_service.py`
- `backend/app/services/failure_case_service.py`
- `backend/tests/api/test_case_reports.py`
- `backend/tests/api/test_failure_cases.py`
- `frontend/src/api/caseReports.ts`
- `frontend/src/api/cases.ts`
- `frontend/src/hooks/useCaseReports.ts`
- `frontend/src/hooks/useCaseReportDetail.ts`
- `frontend/src/hooks/useFailureCases.ts`
- `frontend/src/pages/CaseReportsPage.tsx`
- `frontend/src/pages/CaseReportDetailPage.tsx`
- `frontend/src/pages/FailuresPage.tsx`

### 验收标准

- 用例报告列表、详情、失败用例三个核心切片均可独立联调和验收。
- 所有列表接口支持分页、筛选和稳定排序。
- 前端页面使用真实接口展示数据，不依赖硬编码 mock 数据。
- 用户可以从用例报告列表进入详情，也可以从失败用例进入关联详情。
- 平台保存的报告可以点击打开。
- loading、empty、error 状态在核心页面中可见且一致。

## 8. 阶段 4：看板统计

### 阶段目标

在阶段 3 的核心排查闭环基础上，交付首页看板、统计趋势和跨页面体验完善。

### 开发任务

1. 功能切片 E：首页看板。
   - 后端：实现 `GET /api/v1/dashboard/summary`。
   - 后端：返回今日用例报告总数、今日用例通过率、今日失败用例数。
   - 后端：返回 owner 聚合、执行机最近执行结果、执行机最近上报时间、最近失败用例。
   - 前端：封装 dashboard API 模块和 `useDashboard` hook。
   - 前端：实现 `/` 首页看板。
2. 功能切片 F：统计趋势与对比。
   - 后端：实现 `GET /api/v1/stats/by-date`。
   - 后端：实现 `GET /api/v1/stats/by-owner`。
   - 后端：实现 `GET /api/v1/stats/by-runner`。
   - 后端：实现 `GET /api/v1/stats/by-case`。
   - 后端：支持时间范围筛选。
   - 前端：封装 stats API 模块和 `useStats` hook。
   - 前端：实现 `/stats` 页面。
3. 功能切片 G：统计口径与展示一致性。
   - 后端：固化用例通过率、跳过用例、阻塞用例、失败用例的计算口径。
   - 后端：为 dashboard 和 stats 复用同一套统计服务或聚合函数。
   - 前端：统一通过率、数量、状态、时间范围的展示格式。

### 验收标准

- 首页看板、统计趋势和核心排查页面使用一致统计口径。
- 用户可以从首页进入失败用例和用例报告详情。
- 统计页可以展示日期、owner、执行机、用例维度的聚合结果。
- 通过率、失败数、跳过数、阻塞数计算一致。
- 所有页面有 loading、empty、error 状态。

## 9. 阶段 5：联调、测试与部署

### 阶段目标

形成可交付的首版内网系统，保证从测试框架上报到页面展示的完整链路可验证。

### 开发任务

1. 准备上报示例。
   - curl 示例
   - Python 示例脚本
   - 示例 JSON payload
   - 示例报告文件
2. 准备 seed 数据。
   - 多 owner
   - 多 runner
   - 多用例结果
   - 多日期数据
3. 完善后端测试。
   - schema 校验
   - 上报幂等
   - 报告文件保存
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
6. 编写部署说明。
   - 环境变量
   - 安装和启动本机 PostgreSQL
   - 初始化数据库和用户
   - 执行 migration
   - 启动服务
   - 查看服务日志
   - 备份数据库
7. 执行端到端验收。
   - 上报多条用例报告
   - 验证报告文件已保存并可打开
   - 查看首页看板
   - 查看用例报告列表
   - 查看用例报告详情
   - 验证失败用例筛选
   - 验证重复上报不会生成重复记录

### 建议产物

- `examples/report_payload.json`
- `examples/submit_report.py`
- `backend/app/dev/seed_data.py`
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
- PRD 中的验收标准全部可验证。
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
8. 增加报告文件清理和归档能力。
9. 增加报告内容索引能力。
10. 评估 Redis、任务队列、异步处理是否必要。

### 验收标准

- 增强能力不破坏首版上报、查询、统计链路。
- 权限能力不会影响测试框架自动上报。
- 统计增强有清晰口径说明。
- 新增基础设施有明确收益，不为未来假设过早引入复杂度。

## 11. 建议里程碑

### 里程碑 1：工程可运行

- 后端、前端、数据库工程骨架完成。
- 数据库 schema 完成。
- 本地开发环境可运行。

### 里程碑 2：上报可用

- 测试框架可以上报单条用例结果和报告文件。
- 数据可入库。
- 幂等逻辑可用。

### 里程碑 3：核心排查切片可用

- 用例报告列表、用例报告详情、失败用例三个切片完成前后端联调。
- 用户可以通过页面查看用例报告并定位失败用例。

### 里程碑 4：看板统计切片可用

- 首页看板和统计趋势切片完成前后端联调。
- 统计口径在 dashboard、stats、列表页面中保持一致。

### 里程碑 5：首版交付

- Docker Compose 部署完成。
- 应用服务可以连接本机 PostgreSQL。
- 示例上报完成。
- 文档和验收流程完成。
- 首版可以在内网试运行。

## 12. 风险与注意事项

1. 幂等逻辑必须优先实现并测试。
   - 这是上报链路可靠性的核心。
   - 不能只依赖前端或测试框架避免重复请求。

2. `runner_owner` 需要作为用例报告快照保存。
   - 执行机 owner 后续可能变化。
   - 历史统计应使用上报当时的 owner。

3. 统计口径需要保持一致。
   - 后端 API、前端展示、文档说明必须一致。
   - `skipped` 和 `blocked` 不计入通过率分母，但必须单独展示。

4. 列表接口必须分页。
   - 测试结果数据增长会比较快。
   - 首版就应避免无分页全量返回。

5. 字段长度和文件大小需要限制。
   - `error_message`、文件路径、名称字段可能异常大。
   - 应在 schema 和数据库层同时约束。
   - 报告文件大小必须在 API 层限制，避免异常请求耗尽磁盘。

6. 首版不要过早引入复杂基础设施。
   - 暂不引入 Redis、Celery、WebSocket、对象存储、全文检索、Kubernetes。
   - 等实际需求明确后再扩展。

## 13. 首版完成定义

首版完成需要满足以下条件：

1. 测试框架每条用例执行完成后，可以通过 API 上报单条用例结果和报告文件。
2. 平台可以按执行机 owner 查询和统计不同环境的执行情况。
3. 平台可以展示用例报告列表和用例报告详情。
4. 平台可以筛选失败用例。
5. 平台可以展示失败用例的错误信息，并打开平台保存的报告。
6. 同一条用例执行结果重复上报时，不产生重复记录。
7. 系统可以使用本机 PostgreSQL，并通过 Docker Compose 部署应用服务。
8. 有上报示例、部署说明和基础运维说明。
