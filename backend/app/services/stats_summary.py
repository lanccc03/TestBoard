from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import TypeVar
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.runner import Runner
from app.models.test_case_report import TestCaseReport
from app.schemas.stats import (
    StatsByCaseItem,
    StatsByCaseResponse,
    StatsByDateItem,
    StatsByDateResponse,
    StatsByOwnerItem,
    StatsByOwnerResponse,
    StatsByRunnerItem,
    StatsByRunnerResponse,
    StatsCounts,
    StatsRange,
)

SHANGHAI = ZoneInfo("Asia/Shanghai")
RESULTS = ("passed", "failed", "error", "skipped", "blocked")

KeyT = TypeVar("KeyT")


@dataclass
class ResultCounts:
    total: int = 0
    passed: int = 0
    failed: int = 0
    error: int = 0
    skipped: int = 0
    blocked: int = 0

    @property
    def failure_count(self) -> int:
        return self.failed + self.error

    @property
    def pass_rate(self) -> float | None:
        denominator = self.passed + self.failed + self.error
        if denominator == 0:
            return None
        return self.passed / denominator

    def add_result(self, result: str) -> None:
        self.total += 1
        if result in RESULTS:
            setattr(self, result, getattr(self, result) + 1)

    def to_schema(self) -> StatsCounts:
        return StatsCounts(
            total=self.total,
            passed=self.passed,
            failed=self.failed,
            error=self.error,
            skipped=self.skipped,
            blocked=self.blocked,
            failure_count=self.failure_count,
            pass_rate=self.pass_rate,
        )


@dataclass(frozen=True)
class ResolvedStatsRange:
    started_at_from: datetime
    started_at_to: datetime

    def to_schema(self) -> StatsRange:
        return StatsRange(
            started_at_from=self.started_at_from,
            started_at_to=self.started_at_to,
        )


@dataclass
class GroupedCounts[KeyT]:
    key: KeyT
    counts: ResultCounts


def default_stats_range(now: datetime | None = None) -> ResolvedStatsRange:
    current = now.astimezone(SHANGHAI) if now is not None else datetime.now(tz=SHANGHAI)
    today_start = current.replace(hour=0, minute=0, second=0, microsecond=0)
    return ResolvedStatsRange(
        started_at_from=today_start - timedelta(days=6),
        started_at_to=today_start + timedelta(days=1),
    )


def resolve_stats_range(
    *,
    started_at_from: datetime | None,
    started_at_to: datetime | None,
) -> ResolvedStatsRange:
    default_range = default_stats_range()
    return ResolvedStatsRange(
        started_at_from=started_at_from or default_range.started_at_from,
        started_at_to=started_at_to or default_range.started_at_to,
    )


def count_results(reports: list[TestCaseReport]) -> ResultCounts:
    counts = ResultCounts()
    for report in reports:
        counts.add_result(report.result)
    return counts


def _as_shanghai(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=SHANGHAI)
    return value.astimezone(SHANGHAI)


def _date_range(range_: ResolvedStatsRange) -> list[date]:
    start_day = _as_shanghai(range_.started_at_from).date()
    end = _as_shanghai(range_.started_at_to)
    end_day_exclusive = end.date()
    if end.timetz().replace(tzinfo=None) != time.min:
        end_day_exclusive += timedelta(days=1)

    days: list[date] = []
    current = start_day
    while current < end_day_exclusive:
        days.append(current)
        current += timedelta(days=1)
    return days


class StatsSummaryService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_date(
        self,
        *,
        started_at_from: datetime | None = None,
        started_at_to: datetime | None = None,
    ) -> StatsByDateResponse:
        range_ = resolve_stats_range(
            started_at_from=started_at_from,
            started_at_to=started_at_to,
        )
        generated_at = datetime.now(tz=SHANGHAI)
        buckets = {day: ResultCounts() for day in _date_range(range_)}
        for report in self._list_reports(range_):
            day = _as_shanghai(report.started_at).date()
            if day in buckets:
                buckets[day].add_result(report.result)

        return StatsByDateResponse(
            generated_at=generated_at,
            range=range_.to_schema(),
            items=[
                StatsByDateItem(date=day, **counts.to_schema().model_dump())
                for day, counts in buckets.items()
            ],
        )

    def get_by_owner(
        self,
        *,
        started_at_from: datetime | None = None,
        started_at_to: datetime | None = None,
        limit: int = 10,
    ) -> StatsByOwnerResponse:
        range_ = resolve_stats_range(
            started_at_from=started_at_from,
            started_at_to=started_at_to,
        )
        grouped: defaultdict[str, ResultCounts] = defaultdict(ResultCounts)
        for report in self._list_reports(range_):
            grouped[report.runner_owner].add_result(report.result)

        items = [
            StatsByOwnerItem(runner_owner=owner, **counts.to_schema().model_dump())
            for owner, counts in self._top_groups(grouped, limit=limit)
        ]
        return StatsByOwnerResponse(
            generated_at=datetime.now(tz=SHANGHAI),
            range=range_.to_schema(),
            items=items,
        )

    def get_by_runner(
        self,
        *,
        started_at_from: datetime | None = None,
        started_at_to: datetime | None = None,
        limit: int = 10,
    ) -> StatsByRunnerResponse:
        range_ = resolve_stats_range(
            started_at_from=started_at_from,
            started_at_to=started_at_to,
        )
        grouped: dict[str, GroupedCounts[Runner]] = {}
        for report, runner in self._list_reports_with_runner(range_):
            if report.runner_id not in grouped:
                grouped[report.runner_id] = GroupedCounts(key=runner, counts=ResultCounts())
            grouped[report.runner_id].counts.add_result(report.result)

        top_groups = sorted(
            grouped.values(),
            key=lambda item: (-item.counts.total, item.key.runner_id),
        )[:limit]
        return StatsByRunnerResponse(
            generated_at=datetime.now(tz=SHANGHAI),
            range=range_.to_schema(),
            items=[
                StatsByRunnerItem(
                    runner_id=item.key.runner_id,
                    runner_name=item.key.runner_name,
                    runner_owner=item.key.runner_owner,
                    **item.counts.to_schema().model_dump(),
                )
                for item in top_groups
            ],
        )

    def get_by_case(
        self,
        *,
        started_at_from: datetime | None = None,
        started_at_to: datetime | None = None,
        limit: int = 10,
    ) -> StatsByCaseResponse:
        range_ = resolve_stats_range(
            started_at_from=started_at_from,
            started_at_to=started_at_to,
        )
        grouped: defaultdict[tuple[str, str, str | None], ResultCounts] = defaultdict(ResultCounts)
        for report in self._list_reports(range_):
            grouped[(report.case_id, report.case_name, report.module)].add_result(report.result)

        items = [
            StatsByCaseItem(
                case_id=case_key[0],
                case_name=case_key[1],
                module=case_key[2],
                **counts.to_schema().model_dump(),
            )
            for case_key, counts in self._top_groups(grouped, limit=limit)
        ]
        return StatsByCaseResponse(
            generated_at=datetime.now(tz=SHANGHAI),
            range=range_.to_schema(),
            items=items,
        )

    def _list_reports(self, range_: ResolvedStatsRange) -> list[TestCaseReport]:
        statement = (
            select(TestCaseReport)
            .where(TestCaseReport.started_at >= range_.started_at_from)
            .where(TestCaseReport.started_at < range_.started_at_to)
            .order_by(TestCaseReport.started_at.asc(), TestCaseReport.case_report_id.asc())
        )
        return list(self._session.scalars(statement).all())

    def _list_reports_with_runner(
        self,
        range_: ResolvedStatsRange,
    ) -> list[tuple[TestCaseReport, Runner]]:
        statement = (
            select(TestCaseReport, Runner)
            .join(Runner, Runner.runner_id == TestCaseReport.runner_id)
            .where(TestCaseReport.started_at >= range_.started_at_from)
            .where(TestCaseReport.started_at < range_.started_at_to)
            .order_by(TestCaseReport.started_at.asc(), TestCaseReport.case_report_id.asc())
        )
        return [(report, runner) for report, runner in self._session.execute(statement).all()]

    @staticmethod
    def _top_groups(
        grouped: dict[KeyT, ResultCounts],
        *,
        limit: int,
    ) -> list[tuple[KeyT, ResultCounts]]:
        return sorted(grouped.items(), key=lambda item: (-item[1].total, item[0]))[:limit]
