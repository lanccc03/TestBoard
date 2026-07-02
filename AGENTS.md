# AGENTS.md

## 项目背景

TestBoard 是公司内网测试结果平台。后端使用 FastAPI、Pydantic v2、SQLAlchemy 2.x、Alembic 和 PostgreSQL；前端使用 React、TypeScript、Vite、shadcn/ui 和 Tailwind CSS。

变更应聚焦当前阶段，避免无关重构。


## 后端

- 在 `backend/` 下工作。
- 使用 Python 3.12、`uv`、Ruff、strict mypy 和 pytest。
- 在仓库根目录同步依赖：`source .venv/bin/activate && uv sync --active --project backend`。
- 在 `backend/` 下本地启动：`uvicorn app.main:app --reload`。
- 后端变更验证：`ruff check .`、`ruff format --check .`、`mypy app tests`、`pytest`。
- 数据库结构变更必须通过 Alembic migration；不要手工修改数据库 schema。
- 从 `DATABASE_URL` 读取数据库配置；不要硬编码凭据。

## 前端

- 在 `frontend/` 下工作。
- 使用 pnpm 10、React、TypeScript、Vite、shadcn/ui 和 Tailwind CSS。
- 安装依赖：`pnpm install`。
- 本地启动：`pnpm dev`。
- 前端变更验证：`pnpm lint`、`pnpm format:check`、`pnpm test`、`pnpm build`。
- 基础 UI 控件优先复用或通过 shadcn/ui 引入，不要手写；图标优先使用 `lucide-react`。
- `src/pages/` 只放路由级页面；页面内部组件、业务展示组件和业务工具函数放到 `src/features/<feature>/`。
- `src/components/` 只放跨业务复用组件，`src/components/ui/` 保持为基础 UI 控件层。
- `src/api/` 和 `src/hooks/` 保持当前共享分层；只有当某类能力明确只属于单一业务 feature 且不会跨页面复用时，才考虑迁入对应 `features/`。
- 避免新增 barrel export；优先使用直接路径导入，保持依赖关系明确。

## 通用规则

- 不要把密钥提交到 git；本地 `.env` 以 `.env.example` 为模板。
- API 边界优先使用类型化接口和显式校验。
- 行为变更需要新增或更新聚焦的测试。
- 保持现有格式和风格；完成前运行相关检查。
