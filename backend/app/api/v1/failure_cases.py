from datetime import datetime
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.test_case_report import TestCaseReport
from app.repositories.test_case_reports import TestCaseReportRepository
from app.schemas.failure_case import (
    FailureCaseListItem,
    FailureCaseListQuery,
    FailureCaseListResponse,
)
from app.schemas.test_report import CaseResult

router = APIRouter(prefix="/api/v1", tags=["failure-cases"])


def get_failure_case_list_query(
    started_at_from: Annotated[datetime | None, Query()] = None,
    started_at_to: Annotated[datetime | None, Query()] = None,
    runner_owner: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
    runner_id: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
    module: Annotated[str | None, Query(min_length=1, max_length=255)] = None,
    case_id: Annotated[str | None, Query(min_length=1, max_length=255)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> FailureCaseListQuery:
    if (
        started_at_from is not None
        and started_at_to is not None
        and started_at_from > started_at_to
    ):
        raise HTTPException(
            status_code=422,
            detail="started_at_from must be less than or equal to started_at_to",
        )

    return FailureCaseListQuery(
        started_at_from=started_at_from,
        started_at_to=started_at_to,
        runner_owner=runner_owner,
        runner_id=runner_id,
        module=module,
        case_id=case_id,
        page=page,
        page_size=page_size,
    )


def _report_url(case_report_id: object) -> str:
    return f"/api/v1/case-reports/{case_report_id}/report"


def _to_list_item(case_report: TestCaseReport) -> FailureCaseListItem:
    return FailureCaseListItem(
        case_report_id=case_report.case_report_id,
        runner_id=case_report.runner_id,
        runner_owner=case_report.runner_owner,
        case_id=case_report.case_id,
        case_name=case_report.case_name,
        module=case_report.module,
        started_at=case_report.started_at,
        ended_at=case_report.ended_at,
        duration_ms=case_report.duration_ms,
        result=cast(CaseResult, case_report.result),
        error_type=case_report.error_type,
        error_message=case_report.error_message,
        report_url=_report_url(case_report.case_report_id),
    )


@router.get("/cases/failures", response_model=FailureCaseListResponse)
def list_failure_cases(
    query: Annotated[FailureCaseListQuery, Depends(get_failure_case_list_query)],
    db: Annotated[Session, Depends(get_db)],
) -> FailureCaseListResponse:
    repository = TestCaseReportRepository(db)
    total = repository.count_failure_cases(query)
    items = [_to_list_item(case_report) for case_report in repository.list_failure_cases(query)]
    return FailureCaseListResponse.from_items(items=items, query=query, total=total)
