from typing import Literal, Self
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

CaseResult = Literal["passed", "failed", "skipped", "blocked", "error"]
ImportStatus = Literal["imported", "duplicate"]


class TestReportRunner(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    runner_id: str = Field(min_length=1, max_length=128)
    runner_name: str | None = Field(default=None, max_length=255)
    runner_owner: str = Field(min_length=1, max_length=128)
    ip: str | None = Field(default=None, max_length=64)


class TestReportCase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    case_id: str = Field(min_length=1, max_length=255)
    case_name: str = Field(min_length=1, max_length=512)
    module: str | None = Field(default=None, max_length=255)
    started_at: AwareDatetime
    ended_at: AwareDatetime
    duration_ms: int | None = Field(default=None, ge=0)
    result: CaseResult
    error_type: str | None = Field(default=None, max_length=128)
    error_message: str | None = Field(default=None, max_length=4096)

    @model_validator(mode="after")
    def validate_time_range(self) -> Self:
        if self.ended_at < self.started_at:
            raise ValueError("ended_at must be greater than or equal to started_at")
        return self


class TestReportRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    idempotency_key: str = Field(min_length=1, max_length=255)
    runner: TestReportRunner
    case: TestReportCase


class TestReportResponse(BaseModel):
    case_report_id: UUID
    report_url: str
    status: ImportStatus
    message: str
