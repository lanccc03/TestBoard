from datetime import datetime
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.test_run import TestRun
from app.repositories.test_runs import TestRunRepository
from app.schemas.run import RunListItem, RunListQuery, RunListResponse, RunStatus

router = APIRouter(prefix="/api/v1", tags=["runs"])


def get_run_list_query(
    started_at_from: Annotated[datetime | None, Query()] = None,
    started_at_to: Annotated[datetime | None, Query()] = None,
    runner_owner: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
    runner_id: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
    status_filter: Annotated[RunStatus | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> RunListQuery:
    if (
        started_at_from is not None
        and started_at_to is not None
        and started_at_from > started_at_to
    ):
        raise HTTPException(
            status_code=422,
            detail="started_at_from must be less than or equal to started_at_to",
        )

    return RunListQuery(
        started_at_from=started_at_from,
        started_at_to=started_at_to,
        runner_owner=runner_owner,
        runner_id=runner_id,
        status=status_filter,
        page=page,
        page_size=page_size,
    )


def _calculate_pass_rate(test_run: TestRun) -> float | None:
    executed_count = test_run.passed + test_run.failed + test_run.error
    if executed_count == 0:
        return None
    return test_run.passed / executed_count


def _to_list_item(test_run: TestRun) -> RunListItem:
    return RunListItem(
        run_id=test_run.run_id,
        runner_id=test_run.runner_id,
        runner_owner=test_run.runner_owner,
        started_at=test_run.started_at,
        ended_at=test_run.ended_at,
        duration_ms=test_run.duration_ms,
        status=cast(RunStatus, test_run.status),
        total_count=test_run.total,
        failed_count=test_run.failed,
        pass_rate=_calculate_pass_rate(test_run),
        report_url=test_run.report_url,
    )


@router.get("/runs", response_model=RunListResponse)
def list_runs(
    query: Annotated[RunListQuery, Depends(get_run_list_query)],
    db: Annotated[Session, Depends(get_db)],
) -> RunListResponse:
    repository = TestRunRepository(db)
    total = repository.count_runs(query)
    items = [_to_list_item(test_run) for test_run in repository.list_runs(query)]
    return RunListResponse.from_items(items=items, query=query, total=total)
