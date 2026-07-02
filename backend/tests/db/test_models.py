from typing import cast

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, String, UniqueConstraint

import app.models  # noqa: F401
from app.db.session import Base


def _type_length(column_name: str, table_name: str) -> int | None:
    column_type = Base.metadata.tables[table_name].c[column_name].type
    return cast(String, column_type).length


def test_core_tables_are_registered() -> None:
    assert {"runners", "test_case_reports"} <= set(Base.metadata.tables)
    assert "test_runs" not in Base.metadata.tables
    assert "test_case_results" not in Base.metadata.tables


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


def test_test_case_reports_table_columns_constraints_and_indexes() -> None:
    table = Base.metadata.tables["test_case_reports"]

    assert set(table.columns.keys()) == {
        "case_report_id",
        "idempotency_key",
        "runner_id",
        "runner_owner",
        "case_id",
        "case_name",
        "module",
        "started_at",
        "ended_at",
        "duration_ms",
        "result",
        "report_file_path",
        "report_filename",
        "report_content_type",
        "report_size_bytes",
        "error_type",
        "error_message",
        "created_at",
    }
    assert table.c.case_report_id.primary_key
    assert _type_length("idempotency_key", "test_case_reports") == 255
    assert _type_length("runner_id", "test_case_reports") == 128
    assert _type_length("runner_owner", "test_case_reports") == 128
    assert _type_length("case_id", "test_case_reports") == 255
    assert _type_length("case_name", "test_case_reports") == 512
    assert _type_length("module", "test_case_reports") == 255
    assert _type_length("result", "test_case_reports") == 16
    assert _type_length("report_file_path", "test_case_reports") == 2048
    assert _type_length("report_filename", "test_case_reports") == 255
    assert _type_length("report_content_type", "test_case_reports") == 255
    assert _type_length("error_type", "test_case_reports") == 128
    assert _type_length("error_message", "test_case_reports") == 4096

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

    assert "uq_test_case_reports_idempotency_key" in unique_constraints
    assert "ck_test_case_reports_result" in check_constraints
    assert "ck_test_case_reports_duration_ms_non_negative" in check_constraints
    assert "ck_test_case_reports_report_size_bytes_non_negative" in check_constraints
    assert "fk_test_case_reports_runner_id_runners" in foreign_keys
    assert {
        "ix_test_case_reports_idempotency_key",
        "ix_test_case_reports_started_at",
        "ix_test_case_reports_runner_owner",
        "ix_test_case_reports_runner_id",
        "ix_test_case_reports_result",
        "ix_test_case_reports_case_id",
        "ix_test_case_reports_module",
    } <= index_names
