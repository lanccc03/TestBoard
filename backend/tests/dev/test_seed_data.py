from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models as _models  # noqa: F401
from app.core.config import get_settings
from app.db.session import Base
from app.dev.seed_data import build_dev_reports, seed_dev_data
from app.models.runner import Runner
from app.models.test_case_report import TestCaseReport as CaseReportModel


@pytest.fixture
def report_storage_dir(tmp_path: Path) -> Iterator[Path]:
    storage_dir = tmp_path / "reports"
    settings = get_settings()
    original_dir = settings.report_storage_dir
    settings.report_storage_dir = storage_dir
    try:
        yield storage_dir
    finally:
        settings.report_storage_dir = original_dir


@pytest.fixture
def session(report_storage_dir: Path) -> Iterator[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def _count(session: Session, model: type[Runner] | type[CaseReportModel]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_build_dev_reports_returns_valid_deterministic_reports() -> None:
    reports = build_dev_reports()

    assert len(reports) == 6
    assert [report.idempotency_key for report in reports] == [
        "dev-seed-login-pass",
        "dev-seed-checkout-fail",
        "dev-seed-search-error",
        "dev-seed-api-pass",
        "dev-seed-mobile-fail",
        "dev-seed-empty-skipped",
    ]
    assert {report.runner.runner_owner for report in reports} == {"alice", "bob", "carol"}
    assert {report.case.result for report in reports} == {"passed", "failed", "error", "skipped"}
    assert all(report.case.case_id for report in reports)


def test_seed_dev_data_imports_reports_and_is_idempotent(
    session: Session,
    report_storage_dir: Path,
) -> None:
    first_result = seed_dev_data(session)
    reports = session.scalars(select(CaseReportModel)).all()
    original_paths = [report.report_file_path for report in reports]
    second_result = seed_dev_data(session)

    assert first_result.imported == 6
    assert first_result.duplicates == 0
    assert second_result.imported == 0
    assert second_result.duplicates == 6
    assert _count(session, Runner) == 4
    assert _count(session, CaseReportModel) == 6
    assert {report.result for report in reports} == {"passed", "failed", "error", "skipped"}
    assert all((report_storage_dir / path).is_file() for path in original_paths)

    newest_report = session.scalar(
        select(CaseReportModel).where(CaseReportModel.idempotency_key == "dev-seed-empty-skipped")
    )
    assert newest_report is not None
    assert newest_report.result == "skipped"
