from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.test_report import TestReportRequest, TestReportResponse
from app.services.report_file_storage import ReportFileStorage, ReportFileTooLargeError
from app.services.test_report_importer import TestReportImporter

router = APIRouter(prefix="/api/v1", tags=["test-reports"])


def verify_report_api_token(authorization: Annotated[str | None, Header()] = None) -> None:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid report API token",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if token != get_settings().report_api_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid report API token",
        )


def _parse_payload(payload: str) -> TestReportRequest:
    try:
        return TestReportRequest.model_validate_json(payload)
    except ValidationError as exc:
        errors = []
        for error in exc.errors():
            sanitized_error = dict(error)
            sanitized_error["loc"] = ("payload", *tuple(error.get("loc", ())))
            ctx = sanitized_error.get("ctx")
            if isinstance(ctx, dict):
                sanitized_error["ctx"] = {str(key): str(value) for key, value in ctx.items()}
            errors.append(sanitized_error)
        raise HTTPException(
            status_code=422,
            detail=errors,
        ) from exc


def _make_storage() -> ReportFileStorage:
    settings = get_settings()
    return ReportFileStorage(
        storage_dir=settings.report_storage_dir,
        max_upload_bytes=settings.report_max_upload_bytes,
    )


@router.post(
    "/test-reports",
    response_model=TestReportResponse,
    dependencies=[Depends(verify_report_api_token)],
)
async def create_test_report(
    payload: Annotated[str, Form()],
    report_file: Annotated[UploadFile, File()],
    db: Annotated[Session, Depends(get_db)],
) -> TestReportResponse:
    parsed_payload = _parse_payload(payload)
    storage = _make_storage()
    try:
        stored_file = await storage.save(report_file)
    except ReportFileTooLargeError as exc:
        raise HTTPException(
            status_code=413,
            detail="Report file is too large",
        ) from exc

    return TestReportImporter(db, storage).import_report(parsed_payload, stored_file)
