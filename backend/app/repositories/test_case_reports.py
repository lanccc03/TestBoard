from typing import Protocol

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.test_case_report import TestCaseReport
from app.schemas.case_report import CaseReportListQuery
from app.schemas.failure_case import FailureCaseListQuery
from app.schemas.test_report import TestReportRequest


class StoredReportFile(Protocol):
    @property
    def relative_path(self) -> str: ...

    @property
    def filename(self) -> str: ...

    @property
    def content_type(self) -> str: ...

    @property
    def size_bytes(self) -> int: ...


def _apply_case_report_list_filters(
    statement: Select[tuple[TestCaseReport]],
    query: CaseReportListQuery,
) -> Select[tuple[TestCaseReport]]:
    if query.started_at_from is not None:
        statement = statement.where(TestCaseReport.started_at >= query.started_at_from)
    if query.started_at_to is not None:
        statement = statement.where(TestCaseReport.started_at <= query.started_at_to)
    if query.runner_owner is not None:
        statement = statement.where(TestCaseReport.runner_owner == query.runner_owner)
    if query.runner_id is not None:
        statement = statement.where(TestCaseReport.runner_id == query.runner_id)
    if query.result is not None:
        statement = statement.where(TestCaseReport.result == query.result)
    if query.module is not None:
        statement = statement.where(TestCaseReport.module == query.module)
    if query.query is not None:
        pattern = f"%{query.query}%"
        statement = statement.where(
            or_(
                TestCaseReport.case_id.ilike(pattern),
                TestCaseReport.case_name.ilike(pattern),
            )
        )

    return statement


def _apply_failure_case_list_filters(
    statement: Select[tuple[TestCaseReport]],
    query: FailureCaseListQuery,
) -> Select[tuple[TestCaseReport]]:
    statement = statement.where(TestCaseReport.result.in_(("failed", "error")))

    if query.started_at_from is not None:
        statement = statement.where(TestCaseReport.started_at >= query.started_at_from)
    if query.started_at_to is not None:
        statement = statement.where(TestCaseReport.started_at <= query.started_at_to)
    if query.runner_owner is not None:
        statement = statement.where(TestCaseReport.runner_owner == query.runner_owner)
    if query.runner_id is not None:
        statement = statement.where(TestCaseReport.runner_id == query.runner_id)
    if query.module is not None:
        statement = statement.where(TestCaseReport.module == query.module)
    if query.case_id is not None:
        statement = statement.where(TestCaseReport.case_id.ilike(f"%{query.case_id}%"))

    return statement


class TestCaseReportRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, case_report_id: object) -> TestCaseReport | None:
        return self._session.get(TestCaseReport, case_report_id)

    def get_by_idempotency_key(self, idempotency_key: str) -> TestCaseReport | None:
        return self._session.scalar(
            select(TestCaseReport).where(TestCaseReport.idempotency_key == idempotency_key)
        )

    def create(
        self,
        payload: TestReportRequest,
        stored_file: StoredReportFile,
    ) -> TestCaseReport:
        case_report = TestCaseReport(
            idempotency_key=payload.idempotency_key,
            runner_id=payload.runner.runner_id,
            runner_owner=payload.runner.runner_owner,
            case_id=payload.case.case_id,
            case_name=payload.case.case_name,
            module=payload.case.module,
            started_at=payload.case.started_at,
            ended_at=payload.case.ended_at,
            duration_ms=payload.case.duration_ms,
            result=payload.case.result,
            report_file_path=stored_file.relative_path,
            report_filename=stored_file.filename,
            report_content_type=stored_file.content_type,
            report_size_bytes=stored_file.size_bytes,
            error_type=payload.case.error_type,
            error_message=payload.case.error_message,
        )
        self._session.add(case_report)
        self._session.flush()
        return case_report

    def count_case_reports(self, query: CaseReportListQuery) -> int:
        statement = select(TestCaseReport)
        statement = _apply_case_report_list_filters(statement, query)
        count_statement = select(func.count()).select_from(statement.subquery())
        return self._session.scalar(count_statement) or 0

    def list_case_reports(self, query: CaseReportListQuery) -> list[TestCaseReport]:
        statement = select(TestCaseReport)
        statement = _apply_case_report_list_filters(statement, query)
        statement = statement.order_by(
            TestCaseReport.started_at.desc(),
            TestCaseReport.case_report_id.desc(),
        )
        statement = statement.offset(query.offset).limit(query.page_size)
        return list(self._session.scalars(statement).all())

    def count_failure_cases(self, query: FailureCaseListQuery) -> int:
        statement = select(TestCaseReport)
        statement = _apply_failure_case_list_filters(statement, query)
        count_statement = select(func.count()).select_from(statement.subquery())
        return self._session.scalar(count_statement) or 0

    def list_failure_cases(self, query: FailureCaseListQuery) -> list[TestCaseReport]:
        statement = select(TestCaseReport)
        statement = _apply_failure_case_list_filters(statement, query)
        statement = statement.order_by(
            TestCaseReport.started_at.desc(),
            TestCaseReport.case_report_id.desc(),
        )
        statement = statement.offset(query.offset).limit(query.page_size)
        return list(self._session.scalars(statement).all())
