# TestBoard

公司内网测试结果平台。测试框架执行完成后，将完整测试结果上报到平台；平台负责保存、查询和统计。

当前已完成阶段 0：前后端工程骨架、环境配置、健康检查、基础测试和容器启动配置。

## 环境准备

- Python 3.12
- 根目录 Python 虚拟环境：`.venv`
- uv
- Node.js
- pnpm 10.34.1
- 本机 PostgreSQL
- Docker（可选，用于 Compose 启动）

复制环境变量示例：

```bash
cp .env.example .env
```

本地开发默认数据库连接串：

```bash
DATABASE_URL=postgresql+psycopg://testboard:testboard@localhost:5432/testboard
```

如果后端运行在 Docker 容器中，并连接宿主机 PostgreSQL，macOS/Windows 通常使用：

```bash
DATABASE_URL=postgresql+psycopg://testboard:testboard@host.docker.internal:5432/testboard
```

## 后端

安装依赖到根目录 `.venv`：

```bash
source .venv/bin/activate
uv sync --active --project backend
```

启动 FastAPI：

```bash
cd backend
uvicorn app.main:app --reload
```

健康检查：

```bash
curl http://127.0.0.1:8000/health
```

期望响应：

```json
{"status":"ok","service":"testboard-backend"}
```

后端检查：

```bash
cd backend
ruff check .
ruff format --check .
mypy app tests
pytest
```

数据库迁移：

```bash
cd backend
alembic upgrade head
```

回滚全部迁移：

```bash
cd backend
alembic downgrade base
```

PostgreSQL 连通性 smoke check：

```bash
cd backend
DATABASE_URL=postgresql+psycopg://testboard:testboard@localhost:5432/testboard python -m app.db.check
```

可选迁移 smoke test 会在 `TEST_DATABASE_URL` 指向名称包含 `test` 的一次性 PostgreSQL
数据库时执行；未设置时自动跳过：

```bash
cd backend
TEST_DATABASE_URL=postgresql+psycopg://testboard:testboard@localhost:5432/testboard_test pytest tests/db/test_migrations.py
```

## 前端

安装依赖：

```bash
cd frontend
pnpm install
```

启动 Vite：

```bash
cd frontend
pnpm dev
```

前端检查：

```bash
cd frontend
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

前端 API 地址通过 `VITE_API_BASE_URL` 配置，默认是：

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## 局域网开发启动

如果需要让局域网内其他 PC 访问当前开发机上的前后端服务，需要让服务监听所有网卡，并把前端 API 地址和后端 CORS 源配置为开发机的真实局域网 IP。

先确认开发机局域网 IP，例如：

```bash
ipconfig getifaddr en0
```

以下示例假设开发机局域网 IP 是 `192.168.1.23`，实际使用时请替换为本机 IP。

启动后端：

```bash
cd backend
BACKEND_CORS_ORIGINS=http://192.168.1.23:5173 \
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动前端：

```bash
cd frontend
VITE_API_BASE_URL=http://192.168.1.23:8000 \
pnpm dev -- --host 0.0.0.0 --port 5173
```

局域网内其他 PC 访问：

- 前端：`http://192.168.1.23:5173`
- 后端健康检查：`http://192.168.1.23:8000/health`

注意事项：

- `0.0.0.0` 只用于服务监听所有网卡，浏览器访问地址和 `VITE_API_BASE_URL` 必须使用开发机真实局域网 IP。
- 不要在局域网 PC 上使用 `localhost` 访问开发机服务；`localhost` 指向访问者自己的机器。
- 如果无法访问，检查开发机防火墙是否放行 `5173` 和 `8000` 端口。

## Docker Compose

Compose 只启动应用服务，不包含 PostgreSQL 服务。启动前请先在宿主机准备 PostgreSQL，并配置 `DATABASE_URL`。

```bash
docker compose up --build
```

默认端口：

- 后端：`http://localhost:8000`
- 前端：`http://localhost:8080`

## 目录结构

```text
TestBoard/
  backend/
    app/
    alembic/
    tests/
    pyproject.toml
    uv.lock
  frontend/
    src/
    components.json
    package.json
    pnpm-lock.yaml
  docs/
  docker-compose.yml
  prd.md
  tech-stack.md
```
