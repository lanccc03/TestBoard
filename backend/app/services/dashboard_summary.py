from collections import defaultdict
from datetime import datetime, timedelta
from typing import cast
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.runner import Runner
from app.models.test_case_report import TestCaseReport
from app.schemas.dashboard import (
    DashboardOwnerSummary,
    DashboardRecentFailure,
    DashboardRecentRunner,
    DashboardSummaryResponse,
    DashboardTodaySummary,
)
from app.schemas.test_report import CaseResult
from app.services.stats_summary import ResultCounts, count_results

SHANGHAI = ZoneInfo("Asia/Shanghai")
FAILURE_RESULTS = ("failed", "error")
DASHBOARD_LIMIT = 5


def _report_url(case_report_id: object) -> str:
    return f"/api/v1/case-reports/{case_report_id}/report"


def _pass_rate(passed: int, total: int) -> float | None:
    if total == 0:
        return None

    return passed / total


class DashboardSummaryService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_summary(self) -> DashboardSummaryResponse:
        now = datetime.now(tz=SHANGHAI)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        return DashboardSummaryResponse(
            generated_at=now,
            today_start=today_start,
            today_end=today_end,
            today=self._get_today_summary(today_start=today_start, today_end=today_end),
            owner_summaries=self._get_owner_summaries(
                today_start=today_start,
                today_end=today_end,
            ),
            recent_runners=self._get_recent_runners(),
            recent_failures=self._get_recent_failures(),
        )

    def _get_today_summary(
        self,
        *,
        today_start: datetime,
        today_end: datetime,
    ) -> DashboardTodaySummary:
        statement = select(TestCaseReport).where(
            TestCaseReport.started_at >= today_start,
            TestCaseReport.started_at < today_end,
        )
        counts = count_results(list(self._session.scalars(statement).all()))

        return DashboardTodaySummary(
            total=counts.total,
            passed=counts.passed,
            failed=counts.failure_count,
            pass_rate=counts.pass_rate,
        )

    def _get_owner_summaries(
        self,
        *,
        today_start: datetime,
        today_end: datetime,
    ) -> list[DashboardOwnerSummary]:
        statement = select(TestCaseReport).where(
            TestCaseReport.started_at >= today_start,
            TestCaseReport.started_at < today_end,
        )
        grouped: defaultdict[str, ResultCounts] = defaultdict(ResultCounts)
        for report in self._session.scalars(statement).all():
            grouped[report.runner_owner].add_result(report.result)

        summaries: list[DashboardOwnerSummary] = []
        top_groups = sorted(grouped.items(), key=lambda item: (-item[1].total, item[0]))[
            :DASHBOARD_LIMIT
        ]
        for runner_owner, counts in top_groups:
            summaries.append(
                DashboardOwnerSummary(
                    runner_owner=runner_owner,
                    total=counts.total,
                    passed=counts.passed,
                    failed=counts.failure_count,
                    pass_rate=counts.pass_rate,
                )
            )

        return summaries

    def _get_recent_runners(self) -> list[DashboardRecentRunner]:
        row_number = (
            func.row_number()
            .over(
                partition_by=TestCaseReport.runner_id,
                order_by=(
                    TestCaseReport.created_at.desc(),
                    TestCaseReport.started_at.desc(),
                    TestCaseReport.case_report_id.desc(),
                ),
            )
            .label("row_number")
        )
        latest_report_subquery = select(
            TestCaseReport.case_report_id.label("case_report_id"), row_number
        ).subquery()
        statement = (
            select(TestCaseReport, Runner)
            .join(
                latest_report_subquery,
                TestCaseReport.case_report_id == latest_report_subquery.c.case_report_id,
            )
            .join(Runner, Runner.runner_id == TestCaseReport.runner_id)
            .where(latest_report_subquery.c.row_number == 1)
            .order_by(
                TestCaseReport.created_at.desc(),
                TestCaseReport.started_at.desc(),
                TestCaseReport.case_report_id.desc(),
            )
            .limit(DASHBOARD_LIMIT)
        )

        return [
            DashboardRecentRunner(
                runner_id=case_report.runner_id,
                runner_name=runner.runner_name,
                runner_owner=case_report.runner_owner,
                ip=runner.ip,
                last_result=cast(CaseResult, case_report.result),
                last_reported_at=case_report.started_at,
                case_report_id=case_report.case_report_id,
                case_id=case_report.case_id,
                case_name=case_report.case_name,
            )
            for case_report, runner in self._session.execute(statement).all()
        ]

    def _get_recent_failures(self) -> list[DashboardRecentFailure]:
        statement = (
            select(TestCaseReport)
            .where(TestCaseReport.result.in_(FAILURE_RESULTS))
            .order_by(
                TestCaseReport.started_at.desc(),
                TestCaseReport.case_report_id.desc(),
            )
            .limit(DASHBOARD_LIMIT)
        )

        return [
            DashboardRecentFailure(
                case_report_id=case_report.case_report_id,
                runner_id=case_report.runner_id,
                runner_owner=case_report.runner_owner,
                case_id=case_report.case_id,
                case_name=case_report.case_name,
                module=case_report.module,
                started_at=case_report.started_at,
                ended_at=case_report.ended_at,
                duration_ms=case_report.duration_ms,
                result=cast(CaseResult, case_report.result),
                error_type=case_report.error_type,
                error_message=case_report.error_message,
                report_url=_report_url(case_report.case_report_id),
            )
            for case_report in self._session.scalars(statement).all()
        ]
