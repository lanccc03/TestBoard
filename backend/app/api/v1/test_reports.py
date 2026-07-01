from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.test_report import TestReportRequest, TestReportResponse
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


@router.post(
    "/test-reports",
    response_model=TestReportResponse,
    dependencies=[Depends(verify_report_api_token)],
)
def create_test_report(
    payload: TestReportRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TestReportResponse:
    return TestReportImporter(db).import_report(payload)
