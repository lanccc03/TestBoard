from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models as _models  # noqa: F401
from app.db.session import Base
from app.dev.seed_data import build_dev_reports, seed_dev_data
from app.models.runner import Runner
from app.models.test_case_result import TestCaseResult as CaseResultModel
from app.models.test_run import TestRun as RunModel


@pytest.fixture
def session() -> Iterator[Session]:
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


def _count(
    session: Session,
    model: type[Runner] | type[RunModel] | type[CaseResultModel],
) -> int:
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
        "dev-seed-empty-execution",
    ]
    assert {report.runner.runner_owner for report in reports} == {"alice", "bob", "carol"}
    assert {report.run.status for report in reports} == {"passed", "failed", "error"}
    assert all(report.summary.total_count == len(report.cases) for report in reports)


def test_seed_dev_data_imports_reports_and_is_idempotent(session: Session) -> None:
    first_result = seed_dev_data(session)
    second_result = seed_dev_data(session)

    assert first_result.imported == 6
    assert first_result.duplicates == 0
    assert second_result.imported == 0
    assert second_result.duplicates == 6
    assert _count(session, Runner) == 4
    assert _count(session, RunModel) == 6
    assert _count(session, CaseResultModel) == 24

    newest_run = session.scalar(
        select(RunModel).where(RunModel.idempotency_key == "dev-seed-empty-execution")
    )
    assert newest_run is not None
    assert newest_run.passed == 0
    assert newest_run.failed == 0
    assert newest_run.error == 0
