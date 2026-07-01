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


def test_migration_creates_core_schema_and_enforces_idempotency_key() -> None:
    engine = _make_test_engine()
    config = _make_alembic_config(str(engine.url))

    try:
        command.downgrade(config, "base")
        command.upgrade(config, "head")

        inspector = inspect(engine)
        assert {"runners", "test_runs", "test_case_results"} <= set(inspector.get_table_names())

        test_run_indexes = {index["name"] for index in inspector.get_indexes("test_runs")}
        test_run_unique_constraints = {
            constraint["name"] for constraint in inspector.get_unique_constraints("test_runs")
        }
        case_result_indexes = {
            index["name"] for index in inspector.get_indexes("test_case_results")
        }

        assert "ix_test_runs_idempotency_key" in test_run_indexes
        assert "uq_test_runs_idempotency_key" in test_run_unique_constraints
        assert {
            "ix_test_case_results_run_id",
            "ix_test_case_results_case_id",
            "ix_test_case_results_result",
            "ix_test_case_results_module",
        } <= case_result_indexes

        run_id = uuid.uuid4()
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
                    INSERT INTO test_runs (
                        run_id, idempotency_key, runner_id, runner_owner, started_at,
                        ended_at, duration_ms, status, report_url, total, passed,
                        failed, skipped, blocked, error, created_at
                    )
                    VALUES (
                        :run_id, 'idem-1', 'runner-1', 'owner-1', now(), now(),
                        1000, 'passed', 'https://example.com/report', 1, 1, 0, 0, 0, 0, now()
                    )
                    """
                ),
                {"run_id": run_id},
            )
            connection.execute(
                text(
                    """
                    INSERT INTO test_case_results (
                        run_id, case_id, case_name, module, result, duration_ms,
                        error_type, error_message, log_url, screenshot_url, created_at
                    )
                    VALUES (
                        :run_id, 'case-1', 'Case 1', 'module-1', 'passed', 1000,
                        NULL, NULL, 'https://example.com/log',
                        'https://example.com/screenshot', now()
                    )
                    """
                ),
                {"run_id": run_id},
            )

        with pytest.raises(IntegrityError):
            with engine.begin() as connection:
                connection.execute(
                    text(
                        """
                        INSERT INTO test_runs (
                            run_id, idempotency_key, runner_id, runner_owner, started_at,
                            ended_at, duration_ms, status, report_url, total, passed,
                            failed, skipped, blocked, error, created_at
                        )
                        VALUES (
                            :run_id, 'idem-1', 'runner-1', 'owner-1', now(), now(),
                            1000, 'passed', NULL, 1, 1, 0, 0, 0, 0, now()
                        )
                        """
                    ),
                    {"run_id": uuid.uuid4()},
                )
    finally:
        command.downgrade(config, "base")
        engine.dispose()
