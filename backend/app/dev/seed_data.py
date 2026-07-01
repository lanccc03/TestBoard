from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.schemas.test_report import (
    CaseResult,
    RunStatus,
    TestReportCase,
    TestReportRequest,
    TestReportRun,
    TestReportRunner,
    TestReportSummary,
)
from app.services.test_report_importer import TestReportImporter


@dataclass(frozen=True)
class SeedResult:
    imported: int
    duplicates: int


def _aware(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _case(
    case_id: str,
    case_name: str,
    module: str,
    result: CaseResult,
    *,
    duration_ms: int | None = 1000,
    error_type: str | None = None,
    error_message: str | None = None,
) -> TestReportCase:
    return TestReportCase(
        case_id=case_id,
        case_name=case_name,
        module=module,
        result=result,
        duration_ms=duration_ms,
        error_type=error_type,
        error_message=error_message,
        log_url=f"https://logs.example.test/{case_id}",
        screenshot_url=f"https://screenshots.example.test/{case_id}"
        if result in {"failed", "error"}
        else None,
    )


def _summary(cases: list[TestReportCase]) -> TestReportSummary:
    return TestReportSummary(
        total_count=len(cases),
        passed_count=sum(test_case.result == "passed" for test_case in cases),
        failed_count=sum(test_case.result == "failed" for test_case in cases),
        skipped_count=sum(test_case.result == "skipped" for test_case in cases),
        blocked_count=sum(test_case.result == "blocked" for test_case in cases),
        error_count=sum(test_case.result == "error" for test_case in cases),
    )


def _report(
    *,
    idempotency_key: str,
    runner: TestReportRunner,
    started_at: datetime,
    status: RunStatus,
    cases: list[TestReportCase],
    report_url: str,
) -> TestReportRequest:
    return TestReportRequest(
        idempotency_key=idempotency_key,
        runner=runner,
        run=TestReportRun(
            started_at=started_at,
            ended_at=started_at + timedelta(minutes=12),
            duration_ms=720_000,
            status=status,
            report_url=report_url,
        ),
        summary=_summary(cases),
        cases=cases,
    )


def build_dev_reports() -> list[TestReportRequest]:
    base_time = _aware("2026-07-01T09:00:00+08:00")
    runner_web_a = TestReportRunner(
        runner_id="dev-runner-web-a",
        runner_name="Dev Web Runner A",
        runner_owner="alice",
        ip="127.0.0.10",
    )
    runner_web_b = TestReportRunner(
        runner_id="dev-runner-web-b",
        runner_name="Dev Web Runner B",
        runner_owner="bob",
        ip="127.0.0.11",
    )
    runner_api = TestReportRunner(
        runner_id="dev-runner-api",
        runner_name="Dev API Runner",
        runner_owner="carol",
        ip="127.0.0.12",
    )
    runner_mobile = TestReportRunner(
        runner_id="dev-runner-mobile",
        runner_name="Dev Mobile Runner",
        runner_owner="alice",
        ip="127.0.0.13",
    )

    return [
        _report(
            idempotency_key="dev-seed-login-pass",
            runner=runner_web_a,
            started_at=base_time,
            status="passed",
            cases=[
                _case("DEV-LOGIN-001", "login with password", "login", "passed"),
                _case("DEV-LOGIN-002", "login with remembered session", "login", "passed"),
                _case("DEV-LOGIN-003", "logout clears session", "login", "passed"),
                _case("DEV-LOGIN-004", "password reset link opens", "login", "passed"),
            ],
            report_url="https://reports.example.test/dev-seed-login-pass",
        ),
        _report(
            idempotency_key="dev-seed-checkout-fail",
            runner=runner_web_b,
            started_at=base_time + timedelta(hours=1),
            status="failed",
            cases=[
                _case("DEV-CHECKOUT-001", "cart totals are shown", "checkout", "passed"),
                _case(
                    "DEV-CHECKOUT-002",
                    "coupon discount applies once",
                    "checkout",
                    "failed",
                    error_type="AssertionError",
                    error_message="expected discount 20, got 0",
                ),
                _case("DEV-CHECKOUT-003", "card payment succeeds", "checkout", "passed"),
                _case("DEV-CHECKOUT-004", "invoice download is blocked", "checkout", "blocked"),
            ],
            report_url="https://reports.example.test/dev-seed-checkout-fail",
        ),
        _report(
            idempotency_key="dev-seed-search-error",
            runner=runner_api,
            started_at=base_time + timedelta(hours=2),
            status="error",
            cases=[
                _case("DEV-SEARCH-001", "keyword search returns matches", "search", "passed"),
                _case(
                    "DEV-SEARCH-002",
                    "index refresh completes",
                    "search",
                    "error",
                    error_type="RuntimeError",
                    error_message="search service timed out",
                ),
                _case("DEV-SEARCH-003", "facet filter is skipped", "search", "skipped"),
                _case("DEV-SEARCH-004", "empty query returns validation error", "search", "passed"),
            ],
            report_url="https://reports.example.test/dev-seed-search-error",
        ),
        _report(
            idempotency_key="dev-seed-api-pass",
            runner=runner_api,
            started_at=base_time + timedelta(days=1),
            status="passed",
            cases=[
                _case("DEV-API-001", "create run endpoint accepts payload", "api", "passed"),
                _case("DEV-API-002", "list runs endpoint paginates", "api", "passed"),
                _case("DEV-API-003", "duplicate idempotency key is stable", "api", "passed"),
                _case("DEV-API-004", "invalid report is rejected", "api", "passed"),
            ],
            report_url="https://reports.example.test/dev-seed-api-pass",
        ),
        _report(
            idempotency_key="dev-seed-mobile-fail",
            runner=runner_mobile,
            started_at=base_time + timedelta(days=1, hours=3),
            status="failed",
            cases=[
                _case("DEV-MOBILE-001", "app launches", "mobile", "passed"),
                _case("DEV-MOBILE-002", "profile page renders", "mobile", "passed"),
                _case(
                    "DEV-MOBILE-003",
                    "offline banner is hidden after reconnect",
                    "mobile",
                    "failed",
                    error_type="AssertionError",
                    error_message="offline banner remained visible",
                ),
                _case("DEV-MOBILE-004", "push settings are blocked", "mobile", "blocked"),
            ],
            report_url="https://reports.example.test/dev-seed-mobile-fail",
        ),
        _report(
            idempotency_key="dev-seed-empty-execution",
            runner=runner_web_a,
            started_at=base_time + timedelta(days=2),
            status="passed",
            cases=[
                _case("DEV-EMPTY-001", "feature flag disabled case", "empty", "skipped"),
                _case("DEV-EMPTY-002", "external dependency unavailable", "empty", "blocked"),
                _case("DEV-EMPTY-003", "manual precondition missing", "empty", "skipped"),
                _case("DEV-EMPTY-004", "environment maintenance window", "empty", "blocked"),
            ],
            report_url="https://reports.example.test/dev-seed-empty-execution",
        ),
    ]


def seed_dev_data(session: Session) -> SeedResult:
    imported = 0
    duplicates = 0
    importer = TestReportImporter(session)

    for report in build_dev_reports():
        response = importer.import_report(report)
        if response.status == "imported":
            imported += 1
        else:
            duplicates += 1

    return SeedResult(imported=imported, duplicates=duplicates)


def main() -> None:
    with SessionLocal() as session:
        result = seed_dev_data(session)
    print(f"Seeded development data: imported={result.imported}, duplicates={result.duplicates}")


if __name__ == "__main__":
    main()
