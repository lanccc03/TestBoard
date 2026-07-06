from datetime import date, datetime

from pydantic import BaseModel


class StatsRange(BaseModel):
    started_at_from: datetime
    started_at_to: datetime


class StatsCounts(BaseModel):
    total: int
    passed: int
    failed: int
    error: int
    skipped: int
    blocked: int
    failure_count: int
    pass_rate: float | None


class StatsByDateItem(StatsCounts):
    date: date


class StatsByOwnerItem(StatsCounts):
    runner_owner: str


class StatsByRunnerItem(StatsCounts):
    runner_id: str
    runner_name: str | None
    runner_owner: str


class StatsByCaseItem(StatsCounts):
    case_id: str
    case_name: str
    module: str | None


class StatsByDateResponse(BaseModel):
    generated_at: datetime
    range: StatsRange
    items: list[StatsByDateItem]


class StatsByOwnerResponse(BaseModel):
    generated_at: datetime
    range: StatsRange
    items: list[StatsByOwnerItem]


class StatsByRunnerResponse(BaseModel):
    generated_at: datetime
    range: StatsRange
    items: list[StatsByRunnerItem]


class StatsByCaseResponse(BaseModel):
    generated_at: datetime
    range: StatsRange
    items: list[StatsByCaseItem]
