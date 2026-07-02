"""Sync existing local databases to case report schema.

Revision ID: 0002_sync_case_report_schema
Revises: 0001_initial_schema
Create Date: 2026-07-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_sync_case_report_schema"
down_revision: str | Sequence[str] | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _create_test_case_reports_table() -> None:
    op.create_table(
        "test_case_reports",
        sa.Column("case_report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("runner_id", sa.String(length=128), nullable=False),
        sa.Column("runner_owner", sa.String(length=128), nullable=False),
        sa.Column("case_id", sa.String(length=255), nullable=False),
        sa.Column("case_name", sa.String(length=512), nullable=False),
        sa.Column("module", sa.String(length=255), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("result", sa.String(length=16), nullable=False),
        sa.Column("report_file_path", sa.String(length=2048), nullable=False),
        sa.Column("report_filename", sa.String(length=255), nullable=False),
        sa.Column("report_content_type", sa.String(length=255), nullable=False),
        sa.Column("report_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("error_type", sa.String(length=128), nullable=True),
        sa.Column("error_message", sa.String(length=4096), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "result IN ('passed', 'failed', 'skipped', 'blocked', 'error')",
            name="ck_test_case_reports_result",
        ),
        sa.CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_test_case_reports_duration_ms_non_negative",
        ),
        sa.CheckConstraint(
            "report_size_bytes >= 0",
            name="ck_test_case_reports_report_size_bytes_non_negative",
        ),
        sa.ForeignKeyConstraint(
            ["runner_id"],
            ["runners.runner_id"],
            name="fk_test_case_reports_runner_id_runners",
        ),
        sa.PrimaryKeyConstraint("case_report_id"),
        sa.UniqueConstraint(
            "idempotency_key",
            name="uq_test_case_reports_idempotency_key",
        ),
    )
    op.create_index(
        "ix_test_case_reports_idempotency_key",
        "test_case_reports",
        ["idempotency_key"],
    )
    op.create_index("ix_test_case_reports_started_at", "test_case_reports", ["started_at"])
    op.create_index(
        "ix_test_case_reports_runner_owner",
        "test_case_reports",
        ["runner_owner"],
    )
    op.create_index("ix_test_case_reports_runner_id", "test_case_reports", ["runner_id"])
    op.create_index("ix_test_case_reports_result", "test_case_reports", ["result"])
    op.create_index("ix_test_case_reports_case_id", "test_case_reports", ["case_id"])
    op.create_index("ix_test_case_reports_module", "test_case_reports", ["module"])


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    table_names = set(inspector.get_table_names())

    if "test_case_reports" not in table_names:
        _create_test_case_reports_table()

    if "test_case_results" in table_names:
        op.drop_index("ix_test_case_results_run_id", table_name="test_case_results")
        op.drop_index("ix_test_case_results_result", table_name="test_case_results")
        op.drop_index("ix_test_case_results_module", table_name="test_case_results")
        op.drop_index("ix_test_case_results_case_id", table_name="test_case_results")
        op.drop_table("test_case_results")

    if "test_runs" in table_names:
        op.drop_index("ix_test_runs_status", table_name="test_runs")
        op.drop_index("ix_test_runs_started_at", table_name="test_runs")
        op.drop_index("ix_test_runs_runner_owner", table_name="test_runs")
        op.drop_index("ix_test_runs_runner_id", table_name="test_runs")
        op.drop_index("ix_test_runs_idempotency_key", table_name="test_runs")
        op.drop_table("test_runs")


def downgrade() -> None:
    # Current 0001 creates the case report schema directly. Keep downgrade to 0001
    # consistent with that schema; downgrade to base is handled by 0001's downgrade.
    pass
