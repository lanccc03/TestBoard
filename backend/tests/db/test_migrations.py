import os
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from alembic import command


def _make_alembic_config(database_url: str) -> Config:
    backend_dir = Path(__file__).resolve().parents[2]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    config.attributes["database_url"] = database_url
    return config


def _make_test_engine() -> Engine:
    database_url = os.environ.get("TEST_DATABASE_URL")
    if database_url is None:
        pytest.skip("TEST_DATABASE_URL is not set")
    database_name = database_url.rsplit("/", maxsplit=1)[-1].split("?", maxsplit=1)[0]
    if "test" not in database_name.lower():
        pytest.skip("TEST_DATABASE_URL database name must include 'test'")
    return create_engine(database_url, pool_pre_ping=True)


def test_migration_creates_case_report_schema_and_enforces_idempotency_key() -> None:
    engine = _make_test_engine()
    config = _make_alembic_config(str(engine.url))

    try:
        command.downgrade(config, "base")
        command.upgrade(config, "head")

        inspector = inspect(engine)
        assert {"runners", "test_case_reports"} <= set(inspector.get_table_names())
        assert "test_runs" not in inspector.get_table_names()
        assert "test_case_results" not in inspector.get_table_names()

        case_report_indexes = {
            index["name"] for index in inspector.get_indexes("test_case_reports")
        }
        case_report_unique_constraints = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints("test_case_reports")
        }

        assert "ix_test_case_reports_idempotency_key" in case_report_indexes
        assert "uq_test_case_reports_idempotency_key" in case_report_unique_constraints
        assert {
            "ix_test_case_reports_started_at",
            "ix_test_case_reports_runner_owner",
            "ix_test_case_reports_runner_id",
            "ix_test_case_reports_result",
            "ix_test_case_reports_case_id",
            "ix_test_case_reports_module",
        } <= case_report_indexes

        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO runners (
                        runner_id, runner_name, runner_owner, ip, created_at, updated_at
                    )
                    VALUES (
                        'runner-1', 'Runner 1', 'owner-1', '127.0.0.1', now(), now()
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO test_case_reports (
                        case_report_id, idempotency_key, runner_id, runner_owner,
                        case_id, case_name, module, started_at, ended_at, duration_ms,
                        result, report_file_path, report_filename, report_content_type,
                        report_size_bytes, error_type, error_message, created_at
                    )
                    VALUES (
                        :case_report_id, 'idem-1', 'runner-1', 'owner-1',
                        'case-1', 'Case 1', 'module-1', now(), now(), 1000,
                        'passed', '2026/07/report.html', 'report.html', 'text/html',
                        100, NULL, NULL, now()
                    )
                    """
                ),
                {"case_report_id": uuid.uuid4()},
            )

        with pytest.raises(IntegrityError):
            with engine.begin() as connection:
                connection.execute(
                    text(
                        """
                        INSERT INTO test_case_reports (
                            case_report_id, idempotency_key, runner_id, runner_owner,
                            case_id, case_name, module, started_at, ended_at, duration_ms,
                            result, report_file_path, report_filename, report_content_type,
                            report_size_bytes, error_type, error_message, created_at
                        )
                        VALUES (
                            :case_report_id, 'idem-1', 'runner-1', 'owner-1',
                            'case-2', 'Case 2', 'module-1', now(), now(), 1000,
                            'passed', '2026/07/report-2.html', 'report-2.html', 'text/html',
                            100, NULL, NULL, now()
                        )
                        """
                    ),
                    {"case_report_id": uuid.uuid4()},
                )
    finally:
        command.downgrade(config, "base")
        engine.dispose()
