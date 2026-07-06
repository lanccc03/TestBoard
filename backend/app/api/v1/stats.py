from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.stats import (
    StatsByCaseResponse,
    StatsByDateResponse,
    StatsByOwnerResponse,
    StatsByRunnerResponse,
)
from app.services.stats_summary import StatsSummaryService

router = APIRouter(prefix="/api/v1", tags=["stats"])


def _validate_time_range(
    started_at_from: datetime | None,
    started_at_to: datetime | None,
) -> None:
    if (
        started_at_from is not None
        and started_at_to is not None
        and started_at_from >= started_at_to
    ):
        raise HTTPException(
            status_code=422,
            detail="started_at_from must be less than started_at_to",
        )


@router.get("/stats/by-date", response_model=StatsByDateResponse)
def get_stats_by_date(
    db: Annotated[Session, Depends(get_db)],
    started_at_from: Annotated[datetime | None, Query()] = None,
    started_at_to: Annotated[datetime | None, Query()] = None,
) -> StatsByDateResponse:
    _validate_time_range(started_at_from, started_at_to)
    return StatsSummaryService(db).get_by_date(
        started_at_from=started_at_from,
        started_at_to=started_at_to,
    )


@router.get("/stats/by-owner", response_model=StatsByOwnerResponse)
def get_stats_by_owner(
    db: Annotated[Session, Depends(get_db)],
    started_at_from: Annotated[datetime | None, Query()] = None,
    started_at_to: Annotated[datetime | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> StatsByOwnerResponse:
    _validate_time_range(started_at_from, started_at_to)
    return StatsSummaryService(db).get_by_owner(
        started_at_from=started_at_from,
        started_at_to=started_at_to,
        limit=limit,
    )


@router.get("/stats/by-runner", response_model=StatsByRunnerResponse)
def get_stats_by_runner(
    db: Annotated[Session, Depends(get_db)],
    started_at_from: Annotated[datetime | None, Query()] = None,
    started_at_to: Annotated[datetime | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> StatsByRunnerResponse:
    _validate_time_range(started_at_from, started_at_to)
    return StatsSummaryService(db).get_by_runner(
        started_at_from=started_at_from,
        started_at_to=started_at_to,
        limit=limit,
    )


@router.get("/stats/by-case", response_model=StatsByCaseResponse)
def get_stats_by_case(
    db: Annotated[Session, Depends(get_db)],
    started_at_from: Annotated[datetime | None, Query()] = None,
    started_at_to: Annotated[datetime | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> StatsByCaseResponse:
    _validate_time_range(started_at_from, started_at_to)
    return StatsSummaryService(db).get_by_case(
        started_at_from=started_at_from,
        started_at_to=started_at_to,
        limit=limit,
    )
