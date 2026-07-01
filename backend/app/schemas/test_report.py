from collections import Counter
from typing import Literal, Self
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

RunStatus = Literal["passed", "failed", "error"]
CaseResult = Literal["passed", "failed", "skipped", "blocked", "error"]
ImportStatus = Literal["imported", "duplicate"]


class TestReportRunner(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    runner_id: str = Field(min_length=1, max_length=128)
    runner_name: str | None = Field(default=None, max_length=255)
    runner_owner: str = Field(min_length=1, max_length=128)
    ip: str | None = Field(default=None, max_length=64)


class TestReportRun(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    started_at: AwareDatetime
    ended_at: AwareDatetime
    duration_ms: int | None = Field(default=None, ge=0)
    status: RunStatus
    report_url: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def validate_time_range(self) -> Self:
        if self.ended_at < self.started_at:
            raise ValueError("ended_at must be greater than or equal to started_at")
        return self


class TestReportSummary(BaseModel):
    total_count: int = Field(ge=0)
    passed_count: int = Field(ge=0)
    failed_count: int = Field(ge=0)
    skipped_count: int = Field(ge=0)
    blocked_count: int = Field(ge=0)
    error_count: int = Field(ge=0)


class TestReportCase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    case_id: str = Field(min_length=1, max_length=255)
    case_name: str = Field(min_length=1, max_length=512)
    module: str | None = Field(default=None, max_length=255)
    result: CaseResult
    duration_ms: int | None = Field(default=None, ge=0)
    error_type: str | None = Field(default=None, max_length=128)
    error_message: str | None = Field(default=None, max_length=4096)
    log_url: str | None = Field(default=None, max_length=2048)
    screenshot_url: str | None = Field(default=None, max_length=2048)


class TestReportRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    idempotency_key: str = Field(min_length=1, max_length=255)
    runner: TestReportRunner
    run: TestReportRun
    summary: TestReportSummary
    cases: list[TestReportCase]

    @model_validator(mode="after")
    def validate_summary_matches_cases(self) -> Self:
        result_counts = Counter(test_case.result for test_case in self.cases)
        expected_counts: dict[CaseResult, int] = {
            "passed": self.summary.passed_count,
            "failed": self.summary.failed_count,
            "skipped": self.summary.skipped_count,
            "blocked": self.summary.blocked_count,
            "error": self.summary.error_count,
        }

        if self.summary.total_count != len(self.cases):
            raise ValueError("summary.total_count must match number of cases")

        for result, expected_count in expected_counts.items():
            if result_counts[result] != expected_count:
                raise ValueError("summary counts must match case results")

        return self


class TestReportResponse(BaseModel):
    run_id: UUID
    status: ImportStatus
    message: str
