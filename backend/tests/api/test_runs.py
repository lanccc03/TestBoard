from collections.abc import AsyncIterator, Iterator
from datetime import datetime
from uuid import UUID

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app as fastapi_app
from app.models import test_case_result as _test_case_result_model  # noqa: F401
from app.models.runner import Runner
from app.models.test_run import TestRun as RunModel


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(engine)

    session = TestingSessionLocal()

    def override_get_db() -> Iterator[Session]:
        yield session

    fastapi_app.dependency_overrides[get_db] = override_get_db
    try:
        yield session
    finally:
        fastapi_app.dependency_overrides.clear()
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
async def client(db_session: Session) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=fastapi_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _seed_runner(
    session: Session,
    runner_id: str,
    runner_owner: str,
    runner_name: str | None = None,
) -> None:
    session.add(
        Runner(
            runner_id=runner_id,
            runner_name=runner_name,
            runner_owner=runner_owner,
            ip="127.0.0.1",
        )
    )


def _seed_run(
    session: Session,
    *,
    run_id: str,
    idempotency_key: str,
    runner_id: str,
    runner_owner: str,
    started_at: str,
    ended_at: str,
    status: str,
    total: int = 10,
    passed: int = 8,
    failed: int = 1,
    skipped: int = 0,
    blocked: int = 0,
    error: int = 1,
    report_url: str | None = "https://example.com/report",
) -> None:
    session.add(
        RunModel(
            run_id=UUID(run_id),
            idempotency_key=idempotency_key,
            runner_id=runner_id,
            runner_owner=runner_owner,
            started_at=_dt(started_at),
            ended_at=_dt(ended_at),
            duration_ms=600_000,
            status=status,
            report_url=report_url,
            total=total,
            passed=passed,
            failed=failed,
            skipped=skipped,
            blocked=blocked,
            error=error,
        )
    )
    session.flush()


def _seed_runs(session: Session) -> None:
    _seed_runner(session, "runner-a", "alice", "Runner A")
    _seed_runner(session, "runner-b", "bob", "Runner B")
    _seed_run(
        session,
        run_id="aaaaaaaa-0000-0000-0000-000000000001",
        idempotency_key="idem-1",
        runner_id="runner-a",
        runner_owner="alice",
        started_at="2026-06-29T10:00:00+08:00",
        ended_at="2026-06-29T10:10:00+08:00",
        status="passed",
    )
    _seed_run(
        session,
        run_id="aaaaaaaa-0000-0000-0000-000000000002",
        idempotency_key="idem-2",
        runner_id="runner-b",
        runner_owner="bob",
        started_at="2026-06-30T10:00:00+08:00",
        ended_at="2026-06-30T10:10:00+08:00",
        status="failed",
    )
    _seed_run(
        session,
        run_id="aaaaaaaa-0000-0000-0000-000000000003",
        idempotency_key="idem-3",
        runner_id="runner-a",
        runner_owner="alice",
        started_at="2026-06-30T10:00:00+08:00",
        ended_at="2026-06-30T10:10:00+08:00",
        status="error",
        report_url=None,
    )
    _seed_run(
        session,
        run_id="aaaaaaaa-0000-0000-0000-000000000004",
        idempotency_key="idem-4",
        runner_id="runner-a",
        runner_owner="alice",
        started_at="2026-07-01T10:00:00+08:00",
        ended_at="2026-07-01T10:10:00+08:00",
        status="passed",
        total=3,
        passed=0,
        failed=0,
        skipped=2,
        blocked=1,
        error=0,
    )
    session.commit()


@pytest.mark.anyio
async def test_list_runs_returns_stable_default_sort_and_pagination(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_runs(db_session)

    response = await client.get("/api/v1/runs", params={"page": 1, "page_size": 2})

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["page"] == 1
    assert response_json["page_size"] == 2
    assert response_json["total"] == 4
    assert response_json["total_pages"] == 2
    assert [item["run_id"] for item in response_json["items"]] == [
        "aaaaaaaa-0000-0000-0000-000000000004",
        "aaaaaaaa-0000-0000-0000-000000000003",
    ]
    first_item = response_json["items"][0]
    assert first_item["runner_id"] == "runner-a"
    assert first_item["runner_owner"] == "alice"
    assert first_item["status"] == "passed"
    assert first_item["total_count"] == 3
    assert first_item["failed_count"] == 0
    assert first_item["pass_rate"] is None
    assert first_item["report_url"] == "https://example.com/report"


@pytest.mark.anyio
async def test_list_runs_filters_by_time_owner_runner_and_status(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_runs(db_session)

    response = await client.get(
        "/api/v1/runs",
        params={
            "started_at_from": "2026-06-30T00:00:00+08:00",
            "started_at_to": "2026-06-30T23:59:59+08:00",
            "runner_owner": "bob",
            "runner_id": "runner-b",
            "status": "failed",
        },
    )

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["total"] == 1
    assert response_json["items"][0]["run_id"] == "aaaaaaaa-0000-0000-0000-000000000002"
    assert response_json["items"][0]["pass_rate"] == 0.8


@pytest.mark.anyio
async def test_list_runs_second_page_returns_remaining_items(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_runs(db_session)

    response = await client.get("/api/v1/runs", params={"page": 2, "page_size": 2})

    assert response.status_code == 200
    assert [item["run_id"] for item in response.json()["items"]] == [
        "aaaaaaaa-0000-0000-0000-000000000002",
        "aaaaaaaa-0000-0000-0000-000000000001",
    ]


@pytest.mark.anyio
@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page_size": 0},
        {"page_size": 101},
        {"status": "skipped"},
        {
            "started_at_from": "2026-07-01T00:00:00+08:00",
            "started_at_to": "2026-06-30T00:00:00+08:00",
        },
    ],
)
async def test_list_runs_rejects_invalid_query_params(
    client: httpx.AsyncClient,
    params: dict[str, int | str],
) -> None:
    response = await client.get("/api/v1/runs", params=params)

    assert response.status_code == 422
