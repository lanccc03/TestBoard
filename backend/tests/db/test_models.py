from typing import cast

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, String, UniqueConstraint

import app.models  # noqa: F401
from app.db.session import Base


def _type_length(column_name: str, table_name: str) -> int | None:
    column_type = Base.metadata.tables[table_name].c[column_name].type
    return cast(String, column_type).length


def test_core_tables_are_registered() -> None:
    assert {"runners", "test_runs", "test_case_results"} <= set(Base.metadata.tables)


def test_runners_table_columns_and_constraints() -> None:
    table = Base.metadata.tables["runners"]

    assert set(table.columns.keys()) == {
        "runner_id",
        "runner_name",
        "runner_owner",
        "ip",
        "created_at",
        "updated_at",
    }
    assert table.c.runner_id.primary_key
    assert _type_length("runner_id", "runners") == 128
    assert _type_length("runner_name", "runners") == 255
    assert _type_length("runner_owner", "runners") == 128
    assert _type_length("ip", "runners") == 64
    assert not table.c.runner_owner.nullable


def test_test_runs_table_columns_constraints_and_indexes() -> None:
    table = Base.metadata.tables["test_runs"]

    assert set(table.columns.keys()) == {
        "run_id",
        "idempotency_key",
        "runner_id",
        "runner_owner",
        "started_at",
        "ended_at",
        "duration_ms",
        "status",
        "report_url",
        "total",
        "passed",
        "failed",
        "skipped",
        "blocked",
        "error",
        "created_at",
    }
    assert _type_length("idempotency_key", "test_runs") == 255
    assert _type_length("runner_id", "test_runs") == 128
    assert _type_length("runner_owner", "test_runs") == 128
    assert _type_length("status", "test_runs") == 16
    assert _type_length("report_url", "test_runs") == 2048
    assert not table.c.total.nullable
    assert not table.c.passed.nullable
    assert not table.c.failed.nullable
    assert not table.c.skipped.nullable
    assert not table.c.blocked.nullable
    assert not table.c.error.nullable

    unique_constraints = {
        constraint.name
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    check_constraints = {
        constraint.name
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
    }
    foreign_keys = {
        constraint.name
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    }
    index_names = {index.name for index in table.indexes}

    assert "uq_test_runs_idempotency_key" in unique_constraints
    assert "ck_test_runs_status" in check_constraints
    assert "ck_test_runs_duration_ms_non_negative" in check_constraints
    assert "ck_test_runs_summary_counts_non_negative" in check_constraints
    assert "fk_test_runs_runner_id_runners" in foreign_keys
    assert {
        "ix_test_runs_idempotency_key",
        "ix_test_runs_started_at",
        "ix_test_runs_runner_owner",
        "ix_test_runs_runner_id",
        "ix_test_runs_status",
    } <= index_names


def test_test_case_results_table_columns_constraints_and_indexes() -> None:
    table = Base.metadata.tables["test_case_results"]

    assert set(table.columns.keys()) == {
        "id",
        "run_id",
        "case_id",
        "case_name",
        "module",
        "result",
        "duration_ms",
        "error_type",
        "error_message",
        "log_url",
        "screenshot_url",
        "created_at",
    }
    assert _type_length("case_id", "test_case_results") == 255
    assert _type_length("case_name", "test_case_results") == 512
    assert _type_length("module", "test_case_results") == 255
    assert _type_length("result", "test_case_results") == 16
    assert _type_length("error_type", "test_case_results") == 128
    assert _type_length("error_message", "test_case_results") == 4096
    assert _type_length("log_url", "test_case_results") == 2048
    assert _type_length("screenshot_url", "test_case_results") == 2048

    check_constraints = {
        constraint.name
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
    }
    foreign_keys = {
        constraint.name
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    }
    index_names = {index.name for index in table.indexes}

    assert "ck_test_case_results_result" in check_constraints
    assert "ck_test_case_results_duration_ms_non_negative" in check_constraints
    assert "fk_test_case_results_run_id_test_runs" in foreign_keys
    assert {
        "ix_test_case_results_run_id",
        "ix_test_case_results_case_id",
        "ix_test_case_results_result",
        "ix_test_case_results_module",
    } <= index_names
