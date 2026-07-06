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
    error_type: str | None = None,
    error_message: str | None = None,
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
            ended_at=started_at + timedelta(minutes=10),
            duration_ms=600_000,
            result=result,
            report_file_path=f"reports/{idempotency_key}.html",
            report_filename="report.html",
            report_content_type="text/html",
            report_size_bytes=100,
            error_type=error_type,
            error_message=error_message,
        )
    )
    session.flush()


def _seed_dashboard_reports(session: Session) -> None:
    today_start = _today_start()
    _seed_runner(session, "runner-a", "alice", "Runner A")
    _seed_runner(session, "runner-b", "bob", "Runner B")
    _seed_runner(session, "runner-c", "alice", "Runner C")

    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000001",
        idempotency_key="before-today",
        runner_id="runner-a",
        runner_owner="alice",
        case_id="CASE-0",
        case_name="Previous day failure",
        module="login",
        started_at=today_start - timedelta(microseconds=1),
        result="failed",
        error_type="AssertionError",
        error_message="old failure",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000002",
        idempotency_key="today-pass-alice",
        runner_id="runner-a",
        runner_owner="alice",
        case_id="CASE-1",
        case_name="Login succeeds",
        module="login",
        started_at=today_start + timedelta(hours=1),
        result="passed",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000003",
        idempotency_key="today-failed-bob",
        runner_id="runner-b",
        runner_owner="bob",
        case_id="CASE-2",
        case_name="Checkout applies coupon",
        module="checkout",
        started_at=today_start + timedelta(hours=2),
        result="failed",
        error_type="AssertionError",
        error_message="expected discount",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000004",
        idempotency_key="today-error-alice",
        runner_id="runner-c",
        runner_owner="alice",
        case_id="CASE-3",
        case_name="Search index refresh",
        module="search",
        started_at=today_start + timedelta(hours=3),
        result="error",
        error_type="RuntimeError",
        error_message="timeout",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000006",
        idempotency_key="today-blocked-alice",
        runner_id="runner-c",
        runner_owner="alice",
        case_id="CASE-5",
        case_name="Search dependency unavailable",
        module="search",
        started_at=today_start + timedelta(hours=4),
        result="blocked",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000007",
        idempotency_key="today-skipped-bob",
        runner_id="runner-b",
        runner_owner="bob",
        case_id="CASE-6",
        case_name="Checkout optional flow",
        module="checkout",
        started_at=today_start + timedelta(hours=5),
        result="skipped",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000005",
        idempotency_key="tomorrow-skipped",
        runner_id="runner-b",
        runner_owner="bob",
        case_id="CASE-4",
        case_name="Tomorrow skipped",
        module="checkout",
        started_at=today_start + timedelta(days=1),
        result="skipped",
    )
    session.commit()


@pytest.mark.anyio
async def test_dashboard_summary_returns_today_metrics_and_aggregations(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_dashboard_reports(db_session)
    today_start = _today_start()

    response = await client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["today_start"].startswith(today_start.isoformat())
    assert response_json["today_end"].startswith((today_start + timedelta(days=1)).isoformat())
    assert response_json["generated_at"]
    assert response_json["today"] == {
        "total": 5,
        "passed": 1,
        "failed": 2,
        "pass_rate": pytest.approx(1 / 3),
    }
    assert response_json["owner_summaries"] == [
        {
            "runner_owner": "alice",
            "total": 3,
            "passed": 1,
            "failed": 1,
            "pass_rate": 0.5,
        },
        {
            "runner_owner": "bob",
            "total": 2,
            "passed": 0,
            "failed": 1,
            "pass_rate": 0.0,
        },
    ]
    assert [
        (item["runner_id"], item["runner_owner"], item["last_result"])
        for item in response_json["recent_runners"]
    ] == [
        ("runner-b", "bob", "skipped"),
        ("runner-c", "alice", "blocked"),
        ("runner-a", "alice", "passed"),
    ]
    assert response_json["recent_runners"][0]["last_reported_at"].startswith(
        (today_start + timedelta(days=1)).replace(tzinfo=None).isoformat()
    )
    assert [
        (item["case_report_id"], item["result"]) for item in response_json["recent_failures"]
    ] == [
        ("aaaaaaaa-0000-0000-0000-000000000004", "error"),
        ("aaaaaaaa-0000-0000-0000-000000000003", "failed"),
        ("aaaaaaaa-0000-0000-0000-000000000001", "failed"),
    ]
    latest_failure = response_json["recent_failures"][0]
    assert latest_failure["case_id"] == "CASE-3"
    assert latest_failure["case_name"] == "Search index refresh"
    assert latest_failure["module"] == "search"
    assert latest_failure["runner_id"] == "runner-c"
    assert latest_failure["runner_owner"] == "alice"
    assert latest_failure["error_type"] == "RuntimeError"
    assert latest_failure["error_message"] == "timeout"
    assert latest_failure["report_url"] == (
        "/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000004/report"
    )


@pytest.mark.anyio
async def test_dashboard_summary_returns_empty_state_when_no_reports(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["today"] == {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "pass_rate": None,
    }
    assert response_json["owner_summaries"] == []
    assert response_json["recent_runners"] == []
    assert response_json["recent_failures"] == []
