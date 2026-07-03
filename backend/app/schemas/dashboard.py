from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.test_report import CaseResult


class DashboardTodaySummary(BaseModel):
    total: int
    passed: int
    failed: int
    pass_rate: float | None


class DashboardOwnerSummary(BaseModel):
    runner_owner: str
    total: int
    passed: int
    failed: int
    pass_rate: float | None


class DashboardRecentRunner(BaseModel):
    runner_id: str
    runner_name: str | None
    runner_owner: str
    ip: str | None
    last_result: CaseResult
    last_reported_at: datetime
    case_report_id: UUID
    case_id: str
    case_name: str


class DashboardRecentFailure(BaseModel):
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
    error_type: str | None
    error_message: str | None
    report_url: str


class DashboardSummaryResponse(BaseModel):
    generated_at: datetime
    today_start: datetime
    today_end: datetime
    today: DashboardTodaySummary
    owner_summaries: list[DashboardOwnerSummary]
    recent_runners: list[DashboardRecentRunner]
    recent_failures: list[DashboardRecentFailure]
