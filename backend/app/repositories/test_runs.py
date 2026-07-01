from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.test_run import TestRun
from app.schemas.test_report import TestReportRequest


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
