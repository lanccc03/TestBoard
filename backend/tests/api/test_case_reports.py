from collections.abc import AsyncIterator, Iterator
from datetime import datetime
from uuid import UUID

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


def _seed_case_report(
    session: Session,
    *,
    case_report_id: str,
    idempotency_key: str,
    runner_id: str,
    runner_owner: str,
    case_id: str,
    case_name: str,
    module: str,
    started_at: str,
    ended_at: str,
    result: str,
    report_file_path: str,
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
            started_at=_dt(started_at),
            ended_at=_dt(ended_at),
            duration_ms=600_000,
            result=result,
            report_file_path=report_file_path,
            report_filename="report.html",
            report_content_type="text/html",
            report_size_bytes=100,
            error_type=error_type,
            error_message=error_message,
        )
    )
    session.flush()


def _seed_case_reports(session: Session) -> None:
    _seed_runner(session, "runner-a", "alice", "Runner A")
    _seed_runner(session, "runner-b", "bob", "Runner B")
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000001",
        idempotency_key="idem-1",
        runner_id="runner-a",
        runner_owner="alice",
        case_id="CASE-1",
        case_name="Login succeeds",
        module="login",
        started_at="2026-06-29T10:00:00+08:00",
        ended_at="2026-06-29T10:10:00+08:00",
        result="passed",
        report_file_path="2026/06/one.html",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000002",
        idempotency_key="idem-2",
        runner_id="runner-b",
        runner_owner="bob",
        case_id="CASE-2",
        case_name="Checkout applies coupon",
        module="checkout",
        started_at="2026-06-30T10:00:00+08:00",
        ended_at="2026-06-30T10:10:00+08:00",
        result="failed",
        report_file_path="2026/06/two.html",
        error_type="AssertionError",
        error_message="expected discount",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000003",
        idempotency_key="idem-3",
        runner_id="runner-a",
        runner_owner="alice",
        case_id="CASE-3",
        case_name="Search index refresh",
        module="search",
        started_at="2026-06-30T10:00:00+08:00",
        ended_at="2026-06-30T10:10:00+08:00",
        result="error",
        report_file_path="2026/06/three.html",
        error_type="RuntimeError",
        error_message="timeout",
    )
    _seed_case_report(
        session,
        case_report_id="aaaaaaaa-0000-0000-0000-000000000004",
        idempotency_key="idem-4",
        runner_id="runner-a",
        runner_owner="alice",
        case_id="CASE-4",
        case_name="Feature flag disabled",
        module="empty",
        started_at="2026-07-01T10:00:00+08:00",
        ended_at="2026-07-01T10:10:00+08:00",
        result="skipped",
        report_file_path="2026/07/four.html",
    )
    session.commit()


@pytest.mark.anyio
async def test_list_case_reports_returns_stable_default_sort_and_pagination(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_case_reports(db_session)

    response = await client.get("/api/v1/case-reports", params={"page": 1, "page_size": 2})

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["page"] == 1
    assert response_json["page_size"] == 2
    assert response_json["total"] == 4
    assert response_json["total_pages"] == 2
    assert [item["case_report_id"] for item in response_json["items"]] == [
        "aaaaaaaa-0000-0000-0000-000000000004",
        "aaaaaaaa-0000-0000-0000-000000000003",
    ]
    first_item = response_json["items"][0]
    assert first_item["runner_id"] == "runner-a"
    assert first_item["runner_owner"] == "alice"
    assert first_item["case_id"] == "CASE-4"
    assert first_item["case_name"] == "Feature flag disabled"
    assert first_item["module"] == "empty"
    assert first_item["result"] == "skipped"
    assert first_item["report_url"].endswith(
        "/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000004/report"
    )


@pytest.mark.anyio
async def test_list_case_reports_filters_by_time_owner_runner_result_module_and_query(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_case_reports(db_session)

    response = await client.get(
        "/api/v1/case-reports",
        params={
            "started_at_from": "2026-06-30T00:00:00+08:00",
            "started_at_to": "2026-06-30T23:59:59+08:00",
            "runner_owner": "bob",
            "runner_id": "runner-b",
            "result": "failed",
            "module": "checkout",
            "query": "coupon",
        },
    )

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["total"] == 1
    assert response_json["items"][0]["case_report_id"] == ("aaaaaaaa-0000-0000-0000-000000000002")
    assert response_json["items"][0]["error_type"] == "AssertionError"
    assert response_json["items"][0]["error_message"] == "expected discount"


@pytest.mark.anyio
async def test_list_case_reports_second_page_returns_remaining_items(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_case_reports(db_session)

    response = await client.get("/api/v1/case-reports", params={"page": 2, "page_size": 2})

    assert response.status_code == 200
    assert [item["case_report_id"] for item in response.json()["items"]] == [
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
        {"result": "unknown"},
        {
            "started_at_from": "2026-07-01T00:00:00+08:00",
            "started_at_to": "2026-06-30T00:00:00+08:00",
        },
    ],
)
async def test_list_case_reports_rejects_invalid_query_params(
    client: httpx.AsyncClient,
    params: dict[str, int | str],
) -> None:
    response = await client.get("/api/v1/case-reports", params=params)

    assert response.status_code == 422


@pytest.mark.anyio
async def test_get_case_report_detail_returns_runner_case_error_and_report_metadata(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    _seed_case_reports(db_session)

    response = await client.get("/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000002")

    assert response.status_code == 200
    response_json = response.json()
    assert response_json == {
        "case_report_id": "aaaaaaaa-0000-0000-0000-000000000002",
        "runner": {
            "runner_id": "runner-b",
            "runner_name": "Runner B",
            "runner_owner": "bob",
            "ip": "127.0.0.1",
        },
        "runner_owner": "bob",
        "case_id": "CASE-2",
        "case_name": "Checkout applies coupon",
        "module": "checkout",
        "started_at": response_json["started_at"],
        "ended_at": response_json["ended_at"],
        "duration_ms": 600000,
        "result": "failed",
        "error_type": "AssertionError",
        "error_message": "expected discount",
        "report_url": "/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000002/report",
        "report_filename": "report.html",
        "report_content_type": "text/html",
        "report_size_bytes": 100,
        "created_at": response_json["created_at"],
    }
    assert response_json["started_at"].startswith("2026-06-30T10:00:00")
    assert response_json["ended_at"].startswith("2026-06-30T10:10:00")


@pytest.mark.anyio
async def test_get_case_report_detail_returns_404_when_not_found(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/api/v1/case-reports/bbbbbbbb-0000-0000-0000-000000000099")

    assert response.status_code == 404
    assert response.json() == {"detail": "Case report not found"}


@pytest.mark.anyio
async def test_get_case_report_detail_rejects_invalid_uuid(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/api/v1/case-reports/not-a-uuid")

    assert response.status_code == 422
