from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.runners import RunnerRepository
from app.repositories.test_case_reports import TestCaseReportRepository
from app.schemas.test_report import TestReportRequest, TestReportResponse
from app.services.report_file_storage import ReportFileStorage, StoredReportFile


class TestReportImporter:
    def __init__(self, session: Session, storage: ReportFileStorage) -> None:
        self._session = session
        self._storage = storage
        self._runners = RunnerRepository(session)
        self._case_reports = TestCaseReportRepository(session)

    def import_report(
        self,
        payload: TestReportRequest,
        stored_file: StoredReportFile,
    ) -> TestReportResponse:
        existing_report = self._case_reports.get_by_idempotency_key(payload.idempotency_key)
        if existing_report is not None:
            self._storage.delete(stored_file.relative_path)
            return TestReportResponse(
                case_report_id=existing_report.case_report_id,
                report_url=self._report_url(existing_report.case_report_id),
                status="duplicate",
                message="test report already imported",
            )

        try:
            self._runners.upsert(payload.runner)
            case_report = self._case_reports.create(payload, stored_file)
            self._session.commit()
            self._session.refresh(case_report)
        except IntegrityError:
            self._session.rollback()
            self._storage.delete(stored_file.relative_path)
            existing_report = self._case_reports.get_by_idempotency_key(payload.idempotency_key)
            if existing_report is None:
                raise
            return TestReportResponse(
                case_report_id=existing_report.case_report_id,
                report_url=self._report_url(existing_report.case_report_id),
                status="duplicate",
                message="test report already imported",
            )
        except Exception:
            self._session.rollback()
            self._storage.delete(stored_file.relative_path)
            raise

        return TestReportResponse(
            case_report_id=case_report.case_report_id,
            report_url=self._report_url(case_report.case_report_id),
            status="imported",
            message="test report imported",
        )

    @staticmethod
    def _report_url(case_report_id: object) -> str:
        return f"/api/v1/case-reports/{case_report_id}/report"
