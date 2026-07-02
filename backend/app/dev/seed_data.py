from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.schemas.test_report import (
    CaseResult,
    TestReportCase,
    TestReportRequest,
    TestReportRunner,
)
from app.services.report_file_storage import ReportFileStorage, StoredReportFile
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
    started_at: datetime,
    duration_ms: int = 1000,
    error_type: str | None = None,
    error_message: str | None = None,
) -> TestReportCase:
    return TestReportCase(
        case_id=case_id,
        case_name=case_name,
        module=module,
        started_at=started_at,
        ended_at=started_at + timedelta(milliseconds=duration_ms),
        duration_ms=duration_ms,
        result=result,
        error_type=error_type,
        error_message=error_message,
    )


def _report(
    *,
    idempotency_key: str,
    runner: TestReportRunner,
    test_case: TestReportCase,
) -> TestReportRequest:
    return TestReportRequest(
        idempotency_key=idempotency_key,
        runner=runner,
        case=test_case,
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
            test_case=_case(
                "DEV-LOGIN-001",
                "login with password",
                "login",
                "passed",
                started_at=base_time,
            ),
        ),
        _report(
            idempotency_key="dev-seed-checkout-fail",
            runner=runner_web_b,
            test_case=_case(
                "DEV-CHECKOUT-002",
                "coupon discount applies once",
                "checkout",
                "failed",
                started_at=base_time + timedelta(hours=1),
                error_type="AssertionError",
                error_message="expected discount 20, got 0",
            ),
        ),
        _report(
            idempotency_key="dev-seed-search-error",
            runner=runner_api,
            test_case=_case(
                "DEV-SEARCH-002",
                "index refresh completes",
                "search",
                "error",
                started_at=base_time + timedelta(hours=2),
                error_type="RuntimeError",
                error_message="search service timed out",
            ),
        ),
        _report(
            idempotency_key="dev-seed-api-pass",
            runner=runner_api,
            test_case=_case(
                "DEV-API-001",
                "create report endpoint accepts payload",
                "api",
                "passed",
                started_at=base_time + timedelta(days=1),
            ),
        ),
        _report(
            idempotency_key="dev-seed-mobile-fail",
            runner=runner_mobile,
            test_case=_case(
                "DEV-MOBILE-003",
                "offline banner is hidden after reconnect",
                "mobile",
                "failed",
                started_at=base_time + timedelta(days=1, hours=3),
                error_type="AssertionError",
                error_message="offline banner remained visible",
            ),
        ),
        _report(
            idempotency_key="dev-seed-empty-skipped",
            runner=runner_web_a,
            test_case=_case(
                "DEV-EMPTY-001",
                "feature flag disabled case",
                "empty",
                "skipped",
                started_at=base_time + timedelta(days=2),
            ),
        ),
        _report(
            idempotency_key="dev-seed-payment-blocked",
            runner=runner_web_b,
            test_case=_case(
                "DEV-PAYMENT-004",
                "payment provider sandbox is unavailable",
                "payment",
                "blocked",
                started_at=base_time + timedelta(days=2, hours=2),
                error_type="EnvironmentBlocked",
                error_message="payment provider sandbox is unavailable",
            ),
        ),
    ]


def _write_seed_report_file(
    storage: ReportFileStorage,
    report: TestReportRequest,
) -> StoredReportFile:
    relative_path = str(Path("seed") / f"{report.idempotency_key}-{uuid4().hex}.html")
    report_path = storage.resolve(relative_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    content = (
        "<html><body>"
        f"<h1>{report.case.case_id}</h1>"
        f"<p>{report.case.case_name}</p>"
        f"<p>{report.case.result}</p>"
        "</body></html>"
    ).encode()
    report_path.write_bytes(content)
    return StoredReportFile(
        relative_path=relative_path,
        filename=f"{report.idempotency_key}.html",
        content_type="text/html",
        size_bytes=len(content),
    )


def seed_dev_data(session: Session) -> SeedResult:
    imported = 0
    duplicates = 0
    settings = get_settings()
    storage = ReportFileStorage(
        storage_dir=settings.report_storage_dir,
        max_upload_bytes=settings.report_max_upload_bytes,
    )
    importer = TestReportImporter(session, storage)

    for report in build_dev_reports():
        stored_file = _write_seed_report_file(storage, report)
        response = importer.import_report(report, stored_file)
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
