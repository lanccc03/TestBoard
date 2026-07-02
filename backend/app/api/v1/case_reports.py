from datetime import datetime
from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.test_case_report import TestCaseReport
from app.repositories.test_case_reports import TestCaseReportRepository
from app.schemas.case_report import (
    CaseReportDetailResponse,
    CaseReportListItem,
    CaseReportListQuery,
    CaseReportListResponse,
    CaseReportRunnerInfo,
)
from app.schemas.test_report import CaseResult
from app.services.report_file_storage import ReportFileStorage

router = APIRouter(prefix="/api/v1", tags=["case-reports"])


def get_case_report_list_query(
    started_at_from: Annotated[datetime | None, Query()] = None,
    started_at_to: Annotated[datetime | None, Query()] = None,
    runner_owner: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
    runner_id: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
    result: Annotated[CaseResult | None, Query()] = None,
    module: Annotated[str | None, Query(min_length=1, max_length=255)] = None,
    query: Annotated[str | None, Query(min_length=1, max_length=512)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> CaseReportListQuery:
    if (
        started_at_from is not None
        and started_at_to is not None
        and started_at_from > started_at_to
    ):
        raise HTTPException(
            status_code=422,
            detail="started_at_from must be less than or equal to started_at_to",
        )

    return CaseReportListQuery(
        started_at_from=started_at_from,
        started_at_to=started_at_to,
        runner_owner=runner_owner,
        runner_id=runner_id,
        result=result,
        module=module,
        query=query,
        page=page,
        page_size=page_size,
    )


def _report_url(case_report_id: object) -> str:
    return f"/api/v1/case-reports/{case_report_id}/report"


def _to_list_item(case_report: TestCaseReport) -> CaseReportListItem:
    return CaseReportListItem(
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
        report_url=_report_url(case_report.case_report_id),
        error_type=case_report.error_type,
        error_message=case_report.error_message,
    )


def _to_detail_response(case_report: TestCaseReport) -> CaseReportDetailResponse:
    return CaseReportDetailResponse(
        case_report_id=case_report.case_report_id,
        runner=CaseReportRunnerInfo(
            runner_id=case_report.runner.runner_id,
            runner_name=case_report.runner.runner_name,
            runner_owner=case_report.runner.runner_owner,
            ip=case_report.runner.ip,
        ),
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
        report_filename=case_report.report_filename,
        report_content_type=case_report.report_content_type,
        report_size_bytes=case_report.report_size_bytes,
        created_at=case_report.created_at,
    )


def _make_storage() -> ReportFileStorage:
    settings = get_settings()
    return ReportFileStorage(
        storage_dir=settings.report_storage_dir,
        max_upload_bytes=settings.report_max_upload_bytes,
    )


@router.get("/case-reports", response_model=CaseReportListResponse)
def list_case_reports(
    query: Annotated[CaseReportListQuery, Depends(get_case_report_list_query)],
    db: Annotated[Session, Depends(get_db)],
) -> CaseReportListResponse:
    repository = TestCaseReportRepository(db)
    total = repository.count_case_reports(query)
    items = [_to_list_item(case_report) for case_report in repository.list_case_reports(query)]
    return CaseReportListResponse.from_items(items=items, query=query, total=total)


@router.get("/case-reports/{case_report_id}", response_model=CaseReportDetailResponse)
def get_case_report_detail(
    case_report_id: UUID,
    db: Annotated[Session, Depends(get_db)],
) -> CaseReportDetailResponse:
    case_report = TestCaseReportRepository(db).get(case_report_id)
    if case_report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case report not found",
        )

    return _to_detail_response(case_report)


@router.get("/case-reports/{case_report_id}/report")
def get_case_report_file(
    case_report_id: UUID,
    db: Annotated[Session, Depends(get_db)],
) -> FileResponse:
    case_report = TestCaseReportRepository(db).get(case_report_id)
    if case_report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case report not found",
        )

    report_path = _make_storage().resolve(case_report.report_file_path)
    if not report_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file not found",
        )

    return FileResponse(
        path=report_path,
        media_type=case_report.report_content_type,
        filename=case_report.report_filename,
    )
