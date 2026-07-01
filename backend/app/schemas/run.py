from datetime import datetime
from math import ceil
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

RunStatus = Literal["passed", "failed", "error"]


class RunListQuery(BaseModel):
    started_at_from: datetime | None = None
    started_at_to: datetime | None = None
    runner_owner: str | None = Field(default=None, min_length=1, max_length=128)
    runner_id: str | None = Field(default=None, min_length=1, max_length=128)
    status: RunStatus | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class RunListItem(BaseModel):
    run_id: UUID
    runner_id: str
    runner_owner: str
    started_at: datetime
    ended_at: datetime
    duration_ms: int | None
    status: RunStatus
    total_count: int
    failed_count: int
    pass_rate: float | None
    report_url: str | None


class RunListResponse(BaseModel):
    items: list[RunListItem]
    page: int
    page_size: int
    total: int
    total_pages: int

    @classmethod
    def from_items(
        cls,
        *,
        items: list[RunListItem],
        query: RunListQuery,
        total: int,
    ) -> "RunListResponse":
        return cls(
            items=items,
            page=query.page,
            page_size=query.page_size,
            total=total,
            total_pages=ceil(total / query.page_size) if total else 0,
        )
