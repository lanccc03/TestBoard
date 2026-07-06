from collections.abc import AsyncIterator, Iterator
from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models as _models  # noqa: F401
from app.db.session import Base, get_db
from app.main import app as fastapi_app
from app.models.runner import Runner
from app.models.test_case_report import TestCaseReport as CaseReportModel

SHANGHAI = ZoneInfo("Asia/Shanghai")


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


def _today_start() -> datetime:
    now = datetime.now(tz=SHANGHAI)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


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


def _seed_case_report(
    session: Session,
    *,
    case_report_id: str,
    idempotency_key: str,
    runner_id: str,
    runner_owner: str,
    case_id: str,
    case_name: str,
    module: str | None,
    started_at: datetime,
    result: str,
) -> None:
    session.add(
        CaseReportModel(
            case_report_id=UUID(case_report_id),
            idempotency_key=idempotency_key,
            runner_id=runner_id,
            runner_owner=runner_owner,
            case_id=case_id,
            case_name=case_name,
            module=module,
            started_at=started_at,
            ended_at=started_at + timedelta(minutes=3),
            duration_ms=180_000,
            result=result,
            report_file_path=f"reports/{idempotency_key}.html",
            report_filename="report.html",
            report_content_type="text/html",
            report_size_bytes=100,
        )
    )
    session.flush()


def _seed_stats_reports(session: Session) -> None:
    today_start = _today_start()
    _seed_runner(session, "runner-a", "alice", "Runner A")
    _seed_runner(session, "runner-b", "bob", "Runner B")
    _seed_runner(session, "runner-c", "alice", "Runner C")

    reports = [
        (
            "bbbbbbbb-0000-0000-0000-000000000001",
            "old",
            "runner-a",
            "alice",
            "CASE-0",
            "Old",
            "login",
            -8,
            "failed",
        ),
        (
            "bbbbbbbb-0000-0000-0000-000000000002",
            "pass-a",
            "runner-a",
            "alice",
            "CASE-1",
            "Login succeeds",
            "login",
            -1,
            "passed",
        ),
        (
            "bbbbbbbb-0000-0000-0000-000000000003",
            "fail-a",
            "runner-a",
            "alice",
            "CASE-1",
            "Login succeeds",
            "login",
            -1,
            "failed",
        ),
        (
            "bbbbbbbb-0000-0000-0000-000000000004",
            "error-b",
            "runner-b",
            "bob",
            "CASE-2",
            "Checkout applies coupon",
            "checkout",
            -1,
            "error",
        ),
        (
            "bbbbbbbb-0000-0000-0000-000000000005",
            "skip-b",
            "runner-b",
            "bob",
            "CASE-2",
            "Checkout applies coupon",
            "checkout",
            0,
            "skipped",
        ),
        (
            "bbbbbbbb-0000-0000-0000-000000000006",
            "block-c",
            "runner-c",
            "alice",
            "CASE-3",
            "Search index refresh",
            "search",
            0,
            "blocked",
        ),
        (
            "bbbbbbbb-0000-0000-0000-000000000007",
            "pass-c",
            "runner-c",
            "alice",
            "CASE-3",
            "Search index refresh",
            "search",
            0,
            "passed",
        ),
    ]
    for index, (
        case_report_id,
        idempotency_key,
        runner_id,
        runner_owner,
        case_id,
        case_name,
        module,
        day_offset,
        result,
    ) in enumerate(reports):
        _seed_case_report(
            session,
            case_report_id=case_report_id,
            idempotency_key=idempotency_key,
            runner_id=runner_id,
            runner_owner=runner_owner,
            case_id=case_id,
            case_name=case_name,
            module=module,
            started_at=today_start + timedelta(days=day_offset, hours=1, minutes=index),
            result=result,
        )
    session.commit()


@pytest.mark.anyio
async def test_stats_by_date_returns_default_seven_day_trend_with_zero_filled_dates(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_stats_reports(db_session)
    today_start = _today_start()

    response = await client.get("/api/v1/stats/by-date")

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["range"]["started_at_from"].startswith(
        (today_start - timedelta(days=6)).isoformat()
    )
    assert response_json["range"]["started_at_to"].startswith(
        (today_start + timedelta(days=1)).isoformat()
    )
    assert [item["date"] for item in response_json["items"]] == [
        (today_start.date() - timedelta(days=6 - index)).isoformat() for index in range(7)
    ]
    assert response_json["items"][-2] == {
        "date": (today_start.date() - timedelta(days=1)).isoformat(),
        "total": 3,
        "passed": 1,
        "failed": 1,
        "error": 1,
        "skipped": 0,
        "blocked": 0,
        "failure_count": 2,
        "pass_rate": pytest.approx(1 / 3),
    }
    assert response_json["items"][-1] == {
        "date": today_start.date().isoformat(),
        "total": 3,
        "passed": 1,
        "failed": 0,
        "error": 0,
        "skipped": 1,
        "blocked": 1,
        "failure_count": 0,
        "pass_rate": 1.0,
    }


@pytest.mark.anyio
async def test_stats_group_endpoints_return_top_groups_with_consistent_counts(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_stats_reports(db_session)

    owner_response = await client.get("/api/v1/stats/by-owner")
    runner_response = await client.get("/api/v1/stats/by-runner", params={"limit": 2})
    case_response = await client.get("/api/v1/stats/by-case")

    assert owner_response.status_code == 200
    assert runner_response.status_code == 200
    assert case_response.status_code == 200

    owner_items = owner_response.json()["items"]
    assert owner_items == [
        {
            "runner_owner": "alice",
            "total": 4,
            "passed": 2,
            "failed": 1,
            "error": 0,
            "skipped": 0,
            "blocked": 1,
            "failure_count": 1,
            "pass_rate": pytest.approx(2 / 3),
        },
        {
            "runner_owner": "bob",
            "total": 2,
            "passed": 0,
            "failed": 0,
            "error": 1,
            "skipped": 1,
            "blocked": 0,
            "failure_count": 1,
            "pass_rate": 0.0,
        },
    ]

    runner_items = runner_response.json()["items"]
    assert [(item["runner_id"], item["total"]) for item in runner_items] == [
        ("runner-a", 2),
        ("runner-b", 2),
    ]
    assert runner_items[0]["runner_name"] == "Runner A"
    assert runner_items[0]["runner_owner"] == "alice"

    case_items = case_response.json()["items"]
    assert [
        (item["case_id"], item["case_name"], item["module"], item["total"]) for item in case_items
    ] == [
        ("CASE-1", "Login succeeds", "login", 2),
        ("CASE-2", "Checkout applies coupon", "checkout", 2),
        ("CASE-3", "Search index refresh", "search", 2),
    ]


@pytest.mark.anyio
async def test_stats_returns_empty_groups_and_zero_filled_dates_when_no_reports(
    client: httpx.AsyncClient,
) -> None:
    by_date_response = await client.get("/api/v1/stats/by-date")
    by_owner_response = await client.get("/api/v1/stats/by-owner")

    assert by_date_response.status_code == 200
    assert len(by_date_response.json()["items"]) == 7
    assert all(
        item["total"] == 0 and item["pass_rate"] is None
        for item in by_date_response.json()["items"]
    )
    assert by_owner_response.status_code == 200
    assert by_owner_response.json()["items"] == []


@pytest.mark.anyio
async def test_stats_rejects_invalid_time_range(client: httpx.AsyncClient) -> None:
    response = await client.get(
        "/api/v1/stats/by-owner",
        params={
            "started_at_from": "2026-07-02T00:00:00+08:00",
            "started_at_to": "2026-07-01T00:00:00+08:00",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "started_at_from must be less than started_at_to"
