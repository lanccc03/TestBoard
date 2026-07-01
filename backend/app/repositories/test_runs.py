from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.test_run import TestRun
from app.schemas.run import RunListQuery
from app.schemas.test_report import TestReportRequest


def _apply_run_list_filters(
    statement: Select[tuple[TestRun]],
    query: RunListQuery,
) -> Select[tuple[TestRun]]:
    if query.started_at_from is not None:
        statement = statement.where(TestRun.started_at >= query.started_at_from)
    if query.started_at_to is not None:
        statement = statement.where(TestRun.started_at <= query.started_at_to)
    if query.runner_owner is not None:
        statement = statement.where(TestRun.runner_owner == query.runner_owner)
    if query.runner_id is not None:
        statement = statement.where(TestRun.runner_id == query.runner_id)
    if query.status is not None:
        statement = statement.where(TestRun.status == query.status)

    return statement


class TestRunRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_idempotency_key(self, idempotency_key: str) -> TestRun | None:
        return self._session.scalar(
            select(TestRun).where(TestRun.idempotency_key == idempotency_key)
        )

    def create(self, payload: TestReportRequest) -> TestRun:
        test_run = TestRun(
            idempotency_key=payload.idempotency_key,
            runner_id=payload.runner.runner_id,
            runner_owner=payload.runner.runner_owner,
            started_at=payload.run.started_at,
            ended_at=payload.run.ended_at,
            duration_ms=payload.run.duration_ms,
            status=payload.run.status,
            report_url=payload.run.report_url,
            total=payload.summary.total_count,
            passed=payload.summary.passed_count,
            failed=payload.summary.failed_count,
            skipped=payload.summary.skipped_count,
            blocked=payload.summary.blocked_count,
            error=payload.summary.error_count,
        )
        self._session.add(test_run)
        self._session.flush()
        return test_run

    def count_runs(self, query: RunListQuery) -> int:
        statement = select(TestRun)
        statement = _apply_run_list_filters(statement, query)
        count_statement = select(func.count()).select_from(statement.subquery())
        return self._session.scalar(count_statement) or 0

    def list_runs(self, query: RunListQuery) -> list[TestRun]:
        statement = select(TestRun)
        statement = _apply_run_list_filters(statement, query)
        statement = statement.order_by(TestRun.started_at.desc(), TestRun.run_id.desc())
        statement = statement.offset(query.offset).limit(query.page_size)
        return list(self._session.scalars(statement).all())
