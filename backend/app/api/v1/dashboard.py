from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_summary import DashboardSummaryService

router = APIRouter(prefix="/api/v1", tags=["dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Annotated[Session, Depends(get_db)],
) -> DashboardSummaryResponse:
    return DashboardSummaryService(db).get_summary()
