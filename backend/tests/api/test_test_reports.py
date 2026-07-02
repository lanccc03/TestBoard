from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from typing import Any

import httpx
import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models as _models  # noqa: F401
from app.core.config import get_settings
from app.db.session import Base, get_db
from app.main import app as fastapi_app
from app.models.runner import Runner
from app.models.test_case_report import TestCaseReport as CaseReportModel

AUTH_HEADER = {"Authorization": "Bearer change-me"}


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def report_storage_dir(tmp_path: Path) -> Iterator[Path]:
    storage_dir = tmp_path / "reports"
    settings = get_settings()
    original_dir = settings.report_storage_dir
    original_limit = settings.report_max_upload_bytes
    settings.report_storage_dir = storage_dir
    settings.report_max_upload_bytes = 32
    try:
        yield storage_dir
    finally:
        settings.report_storage_dir = original_dir
        settings.report_max_upload_bytes = original_limit


@pytest.fixture
def db_session(report_storage_dir: Path) -> Iterator[Session]:
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
        "case": {
            "case_id": "case-1",
            "case_name": "Case 1",
            "module": "login",
            "started_at": "2026-06-30T10:00:00+08:00",
            "ended_at": "2026-06-30T10:00:01+08:00",
            "duration_ms": 1000,
            "result": "failed",
            "error_type": "AssertionError",
            "error_message": "expected true",
        },
    }


def _files(
    payload: dict[str, Any] | str,
    *,
    filename: str = "report.html",
    content: bytes = b"<html>case report</html>",
    content_type: str = "text/html",
) -> dict[str, Any]:
    import json

    payload_value = payload if isinstance(payload, str) else json.dumps(payload)
    return {
        "payload": (None, payload_value, "application/json"),
        "report_file": (filename, content, content_type),
    }


def _count(session: Session, model: type[Runner] | type[CaseReportModel]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


@pytest.mark.anyio
async def test_imports_case_report_and_saves_report_file(
    client: httpx.AsyncClient,
    db_session: Session,
    report_storage_dir: Path,
) -> None:
    response = await client.post(
        "/api/v1/test-reports",
        files=_files(_payload()),
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["status"] == "imported"
    assert response_json["message"] == "test report imported"
    assert response_json["case_report_id"]
    assert response_json["report_url"].endswith(
        f"/api/v1/case-reports/{response_json['case_report_id']}/report"
    )

    runner = db_session.get(Runner, "runner-1")
    assert runner is not None
    assert runner.runner_name == "Runner 1"
    assert runner.runner_owner == "alice"
    assert runner.ip == "127.0.0.1"

    case_report = db_session.scalar(
        select(CaseReportModel).where(CaseReportModel.idempotency_key == "idem-1")
    )
    assert case_report is not None
    assert str(case_report.case_report_id) == response_json["case_report_id"]
    assert case_report.runner_id == "runner-1"
    assert case_report.runner_owner == "alice"
    assert case_report.case_id == "case-1"
    assert case_report.case_name == "Case 1"
    assert case_report.module == "login"
    assert case_report.result == "failed"
    assert case_report.report_filename == "report.html"
    assert case_report.report_content_type == "text/html"
    assert case_report.report_size_bytes == len(b"<html>case report</html>")
    assert case_report.error_type == "AssertionError"
    assert case_report.error_message == "expected true"
    assert (report_storage_dir / case_report.report_file_path).read_bytes() == (
        b"<html>case report</html>"
    )


@pytest.mark.anyio
async def test_report_file_endpoint_returns_platform_saved_file(
    client: httpx.AsyncClient,
) -> None:
    create_response = await client.post(
        "/api/v1/test-reports",
        files=_files(
            _payload(),
            filename="result.txt",
            content=b"saved report",
            content_type="text/plain",
        ),
        headers=AUTH_HEADER,
    )

    response = await client.get(create_response.json()["report_url"])

    assert response.status_code == 200
    assert response.content == b"saved report"
    assert response.headers["content-type"].startswith("text/plain")
    assert "result.txt" in response.headers["content-disposition"]


@pytest.mark.anyio
async def test_duplicate_idempotency_key_returns_existing_case_report_without_overwrite(
    client: httpx.AsyncClient,
    db_session: Session,
    report_storage_dir: Path,
) -> None:
    first_response = await client.post(
        "/api/v1/test-reports",
        files=_files(_payload(), content=b"first file"),
        headers=AUTH_HEADER,
    )
    duplicate_payload = _payload()
    duplicate_payload["runner"]["runner_owner"] = "bob"
    duplicate_payload["case"]["case_name"] = "Changed name"

    duplicate_response = await client.post(
        "/api/v1/test-reports",
        files=_files(duplicate_payload, content=b"second file"),
        headers=AUTH_HEADER,
    )

    assert first_response.status_code == 200
    assert duplicate_response.status_code == 200
    assert duplicate_response.json() == {
        "case_report_id": first_response.json()["case_report_id"],
        "report_url": first_response.json()["report_url"],
        "status": "duplicate",
        "message": "test report already imported",
    }
    assert _count(db_session, Runner) == 1
    assert _count(db_session, CaseReportModel) == 1

    case_report = db_session.scalar(select(CaseReportModel))
    assert case_report is not None
    assert case_report.runner_owner == "alice"
    assert case_report.case_name == "Case 1"
    assert (report_storage_dir / case_report.report_file_path).read_bytes() == b"first file"


@pytest.mark.anyio
async def test_existing_runner_is_updated_but_report_owner_is_snapshot(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    first_response = await client.post(
        "/api/v1/test-reports",
        files=_files(_payload()),
        headers=AUTH_HEADER,
    )
    second_payload = _payload(idempotency_key="idem-2")
    second_payload["runner"] = {
        "runner_id": "runner-1",
        "runner_name": "Runner Renamed",
        "runner_owner": "bob",
        "ip": "127.0.0.2",
    }

    second_response = await client.post(
        "/api/v1/test-reports",
        files=_files(second_payload, filename="second.html", content=b"second"),
        headers=AUTH_HEADER,
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    runner = db_session.get(Runner, "runner-1")
    assert runner is not None
    assert runner.runner_name == "Runner Renamed"
    assert runner.runner_owner == "bob"
    assert runner.ip == "127.0.0.2"

    reports = db_session.scalars(
        select(CaseReportModel).order_by(CaseReportModel.idempotency_key)
    ).all()
    assert [report.runner_owner for report in reports] == ["alice", "bob"]


@pytest.mark.anyio
async def test_missing_required_payload_field_returns_422(client: httpx.AsyncClient) -> None:
    payload = _payload()
    del payload["runner"]["runner_id"]

    response = await client.post(
        "/api/v1/test-reports",
        files=_files(payload),
        headers=AUTH_HEADER,
    )

    assert response.status_code == 422


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("mutator", "expected_fragment"),
    [
        (lambda payload: payload["case"].update({"result": "unknown"}), "result"),
        (
            lambda payload: payload["case"].update({"ended_at": "2026-06-30T09:59:59+08:00"}),
            "ended_at",
        ),
        (lambda payload: payload["case"].update({"duration_ms": -1}), "duration_ms"),
    ],
)
async def test_invalid_payload_returns_422(
    client: httpx.AsyncClient,
    mutator: Any,
    expected_fragment: str,
) -> None:
    payload = _payload()
    mutator(payload)

    response = await client.post(
        "/api/v1/test-reports",
        files=_files(payload),
        headers=AUTH_HEADER,
    )

    assert response.status_code == 422
    assert expected_fragment in response.text


@pytest.mark.anyio
async def test_invalid_payload_json_returns_422(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/test-reports",
        files=_files("{invalid-json"),
        headers=AUTH_HEADER,
    )

    assert response.status_code == 422
    assert "payload" in response.text


@pytest.mark.anyio
async def test_missing_report_file_returns_422(client: httpx.AsyncClient) -> None:
    import json

    response = await client.post(
        "/api/v1/test-reports",
        data={"payload": json.dumps(_payload())},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 422


@pytest.mark.anyio
async def test_oversized_report_file_returns_413_and_does_not_persist_rows(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    response = await client.post(
        "/api/v1/test-reports",
        files=_files(_payload(), content=b"x" * 33),
        headers=AUTH_HEADER,
    )

    assert response.status_code == 413
    assert _count(db_session, Runner) == 0
    assert _count(db_session, CaseReportModel) == 0


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
    response = await client.post("/api/v1/test-reports", files=_files(_payload()), headers=headers)

    assert response.status_code == 401


@pytest.mark.anyio
async def test_validation_failure_does_not_persist_partial_rows(
    client: httpx.AsyncClient,
    db_session: Session,
) -> None:
    payload = _payload()
    payload["case"]["result"] = "unknown"

    response = await client.post(
        "/api/v1/test-reports",
        files=_files(payload),
        headers=AUTH_HEADER,
    )

    assert response.status_code == 422
    assert _count(db_session, Runner) == 0
    assert _count(db_session, CaseReportModel) == 0
