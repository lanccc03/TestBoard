from datetime import datetime
from math import ceil
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.test_report import CaseResult


class CaseReportListQuery(BaseModel):
    started_at_from: datetime | None = None
    started_at_to: datetime | None = None
    runner_owner: str | None = Field(default=None, min_length=1, max_length=128)
    runner_id: str | None = Field(default=None, min_length=1, max_length=128)
    result: CaseResult | None = None
    module: str | None = Field(default=None, min_length=1, max_length=255)
    query: str | None = Field(default=None, min_length=1, max_length=512)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class CaseReportListItem(BaseModel):
    case_report_id: UUID
    runner_id: str
    runner_owner: str
    case_id: str
    case_name: str
    module: str | None
    started_at: datetime
    ended_at: datetime
    duration_ms: int | None
    result: CaseResult
    report_url: str
    error_type: str | None
    error_message: str | None


class CaseReportListResponse(BaseModel):
    items: list[CaseReportListItem]
    page: int
    page_size: int
    total: int
    total_pages: int

    @classmethod
    def from_items(
        cls,
        *,
        items: list[CaseReportListItem],
        query: CaseReportListQuery,
        total: int,
    ) -> "CaseReportListResponse":
        return cls(
            items=items,
            page=query.page,
            page_size=query.page_size,
            total=total,
            total_pages=ceil(total / query.page_size) if total else 0,
        )
