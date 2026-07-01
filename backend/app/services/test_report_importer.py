from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.runners import RunnerRepository
from app.repositories.test_case_results import TestCaseResultRepository
from app.repositories.test_runs import TestRunRepository
from app.schemas.test_report import TestReportRequest, TestReportResponse


class TestReportImporter:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._runners = RunnerRepository(session)
        self._test_runs = TestRunRepository(session)
        self._test_case_results = TestCaseResultRepository(session)

    def import_report(self, payload: TestReportRequest) -> TestReportResponse:
        existing_run = self._test_runs.get_by_idempotency_key(payload.idempotency_key)
        if existing_run is not None:
            return TestReportResponse(
                run_id=existing_run.run_id,
                status="duplicate",
                message="test report already imported",
            )

        try:
            self._runners.upsert(payload.runner)
            test_run = self._test_runs.create(payload)
            self._test_case_results.create_many(test_run.run_id, payload.cases)
            self._session.commit()
            self._session.refresh(test_run)
        except IntegrityError:
            self._session.rollback()
            existing_run = self._test_runs.get_by_idempotency_key(payload.idempotency_key)
            if existing_run is None:
                raise
            return TestReportResponse(
                run_id=existing_run.run_id,
                status="duplicate",
                message="test report already imported",
            )

        return TestReportResponse(
            run_id=test_run.run_id,
            status="imported",
            message="test report imported",
        )
