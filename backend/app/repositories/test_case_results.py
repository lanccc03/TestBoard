import uuid

from sqlalchemy.orm import Session

from app.models.test_case_result import TestCaseResult
from app.schemas.test_report import TestReportCase


class TestCaseResultRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_many(self, run_id: uuid.UUID, cases: list[TestReportCase]) -> None:
        self._session.add_all(
            [
                TestCaseResult(
                    run_id=run_id,
                    case_id=test_case.case_id,
                    case_name=test_case.case_name,
                    module=test_case.module,
                    result=test_case.result,
                    duration_ms=test_case.duration_ms,
                    error_type=test_case.error_type,
                    error_message=test_case.error_message,
                    log_url=test_case.log_url,
                    screenshot_url=test_case.screenshot_url,
                )
                for test_case in cases
            ]
        )
