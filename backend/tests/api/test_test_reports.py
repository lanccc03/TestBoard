from collections.abc import AsyncIterator, Iterator
from copy import deepcopy
from typing import Any

import httpx
import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models as _models  # noqa: F401
from app.db.session import Base, get_db
from app.main import app as fastapi_app
from app.models.runner import Runner
from app.models.test_case_result import TestCaseResult as CaseResultModel
from app.models.test_run import TestRun as RunModel

AUTH_HEADER = {"Authorization": "Bearer change-me"}


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


def _payload(idempotency_key: str = "idem-1") -> dict[str, Any]:
    return {
        "idempotency_key": idempotency_key,
        "runner": {
            "runner_id": "runner-1",
            "runner_name": "Runner 1",
            "runner_owner": "alice",
            "ip": "127.0.0.1",
        },
        "run": {
            "started_at": "2026-06-30T10:00:00+08:00",
            "ended_at": "2026-06-30T10:30:00+08:00",
            "duration_ms": 1800000,
            "status": "failed",
            "report_url": "https://example.com/report",
        },
        "summary": {
            "total_count": 5,
            "passed_count": 1,
            "failed_count": 1,
            "skipped_count": 1,
            "blocked_count": 1,
            "error_count": 1,
        },
        "cases": [
            {
                "case_id": "case-1",
                "case_name": "Case 1",
                "module": "login",
                "result": "passed",
                "duration_ms": 100,
                "log_url": "https://example.com/log-1",
            },
            {
                "case_id": "case-2",
                "case_name": "Case 2",
                "module": "login",
                "result": "failed",
                "duration_ms": 200,
                "error_type": "AssertionError",
                "error_message": "expected true",
                "log_url": "https://example.com/log-2",
                "screenshot_url": "https://example.com/screenshot-2",
            },
            {
                "case_id": "case-3",
                "case_name": "Case 3",
                "module": "payment",
                "result": "skipped",
            },
            {
                "case_id": "case-4",
                "case_name": "Case 4",
                "module": "payment",
                "result": "blocked",
            },
            {
                "case_id": "case-5",
                "case_name": "Case 5",
                "module": "search",
                "result": "error",
                "error_type": "RuntimeError",
                "error_message": "framework crashed",
            },
        ],
    }


def _count(
    session: Session,
    model: type[Runner] | type[RunModel] | type[CaseResultModel],
) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


@pytest.mark.anyio
async def test_imports_complete_report_and_persists_runner_run_and_cases(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    response = await client.post("/api/v1/test-reports", json=_payload(), headers=AUTH_HEADER)

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["status"] == "imported"
    assert response_json["message"] == "test report imported"
    assert response_json["run_id"]

    runner = db_session.get(Runner, "runner-1")
    assert runner is not None
    assert runner.runner_name == "Runner 1"
    assert runner.runner_owner == "alice"
    assert runner.ip == "127.0.0.1"

    test_run = db_session.scalar(select(RunModel).where(RunModel.idempotency_key == "idem-1"))
    assert test_run is not None
    assert str(test_run.run_id) == response_json["run_id"]
    assert test_run.runner_id == "runner-1"
    assert test_run.runner_owner == "alice"
    assert test_run.status == "failed"
    assert test_run.total == 5
    assert test_run.passed == 1
    assert test_run.failed == 1
    assert test_run.skipped == 1
    assert test_run.blocked == 1
    assert test_run.error == 1

    case_results = db_session.scalars(
        select(CaseResultModel).where(CaseResultModel.run_id == test_run.run_id)
    ).all()
    assert len(case_results) == 5


@pytest.mark.anyio
async def test_duplicate_idempotency_key_returns_existing_run_without_extra_rows(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    first_response = await client.post("/api/v1/test-reports", json=_payload(), headers=AUTH_HEADER)
    duplicate_payload = _payload()
    duplicate_payload["runner"]["runner_owner"] = "bob"
    duplicate_payload["cases"][0]["case_name"] = "Changed name"

    duplicate_response = await client.post(
        "/api/v1/test-reports",
        json=duplicate_payload,
        headers=AUTH_HEADER,
    )

    assert first_response.status_code == 200
    assert duplicate_response.status_code == 200
    assert duplicate_response.json() == {
        "run_id": first_response.json()["run_id"],
        "status": "duplicate",
        "message": "test report already imported",
    }
    assert _count(db_session, Runner) == 1
    assert _count(db_session, RunModel) == 1
    assert _count(db_session, CaseResultModel) == 5


@pytest.mark.anyio
async def test_existing_runner_is_updated_but_run_owner_is_snapshot(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    first_response = await client.post("/api/v1/test-reports", json=_payload(), headers=AUTH_HEADER)
    second_payload = _payload(idempotency_key="idem-2")
    second_payload["runner"] = {
        "runner_id": "runner-1",
        "runner_name": "Runner Renamed",
        "runner_owner": "bob",
        "ip": "127.0.0.2",
    }

    second_response = await client.post(
        "/api/v1/test-reports",
        json=second_payload,
        headers=AUTH_HEADER,
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    runner = db_session.get(Runner, "runner-1")
    assert runner is not None
    assert runner.runner_name == "Runner Renamed"
    assert runner.runner_owner == "bob"
    assert runner.ip == "127.0.0.2"

    runs = db_session.scalars(select(RunModel).order_by(RunModel.idempotency_key)).all()
    assert [run.runner_owner for run in runs] == ["alice", "bob"]


@pytest.mark.anyio
async def test_missing_required_field_returns_422(client: httpx.AsyncClient) -> None:
    payload = _payload()
    del payload["runner"]["runner_id"]

    response = await client.post("/api/v1/test-reports", json=payload, headers=AUTH_HEADER)

    assert response.status_code == 422


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("mutator", "expected_fragment"),
    [
        (lambda payload: payload["run"].update({"status": "skipped"}), "status"),
        (lambda payload: payload["cases"][0].update({"result": "unknown"}), "result"),
        (
            lambda payload: payload["run"].update({"ended_at": "2026-06-30T09:59:59+08:00"}),
            "ended_at",
        ),
        (lambda payload: payload["summary"].update({"failed_count": 2}), "summary"),
    ],
)
async def test_invalid_payload_returns_422(
    client: httpx.AsyncClient,
    mutator: Any,
    expected_fragment: str,
) -> None:
    payload = _payload()
    mutator(payload)

    response = await client.post("/api/v1/test-reports", json=payload, headers=AUTH_HEADER)

    assert response.status_code == 422
    assert expected_fragment in response.text


@pytest.mark.anyio
@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer wrong-token"},
        {"Authorization": "change-me"},
    ],
)
async def test_token_errors_return_401(
    client: httpx.AsyncClient,
    headers: dict[str, str],
) -> None:
    response = await client.post("/api/v1/test-reports", json=_payload(), headers=headers)

    assert response.status_code == 401


@pytest.mark.anyio
async def test_validation_failure_does_not_persist_partial_rows(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    payload = deepcopy(_payload())
    payload["summary"]["total_count"] = 6

    response = await client.post("/api/v1/test-reports", json=payload, headers=AUTH_HEADER)

    assert response.status_code == 422
    assert _count(db_session, Runner) == 0
    assert _count(db_session, RunModel) == 0
    assert _count(db_session, CaseResultModel) == 0
