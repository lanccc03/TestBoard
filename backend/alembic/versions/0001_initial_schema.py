"""Initial core schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "runners",
        sa.Column("runner_id", sa.String(length=128), nullable=False),
        sa.Column("runner_name", sa.String(length=255), nullable=True),
        sa.Column("runner_owner", sa.String(length=128), nullable=False),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("runner_id"),
    )

    op.create_table(
        "test_runs",
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("runner_id", sa.String(length=128), nullable=False),
        sa.Column("runner_owner", sa.String(length=128), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("report_url", sa.String(length=2048), nullable=True),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("passed", sa.Integer(), nullable=False),
        sa.Column("failed", sa.Integer(), nullable=False),
        sa.Column("skipped", sa.Integer(), nullable=False),
        sa.Column("blocked", sa.Integer(), nullable=False),
        sa.Column("error", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_test_runs_duration_ms_non_negative",
        ),
        sa.CheckConstraint(
            "status IN ('passed', 'failed', 'error')",
            name="ck_test_runs_status",
        ),
        sa.CheckConstraint(
            "total >= 0 AND passed >= 0 AND failed >= 0 "
            "AND skipped >= 0 AND blocked >= 0 AND error >= 0",
            name="ck_test_runs_summary_counts_non_negative",
        ),
        sa.ForeignKeyConstraint(
            ["runner_id"],
            ["runners.runner_id"],
            name="fk_test_runs_runner_id_runners",
        ),
        sa.PrimaryKeyConstraint("run_id"),
        sa.UniqueConstraint("idempotency_key", name="uq_test_runs_idempotency_key"),
    )
    op.create_index("ix_test_runs_idempotency_key", "test_runs", ["idempotency_key"])
    op.create_index("ix_test_runs_runner_id", "test_runs", ["runner_id"])
    op.create_index("ix_test_runs_runner_owner", "test_runs", ["runner_owner"])
    op.create_index("ix_test_runs_started_at", "test_runs", ["started_at"])
    op.create_index("ix_test_runs_status", "test_runs", ["status"])

    op.create_table(
        "test_case_results",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("case_id", sa.String(length=255), nullable=False),
        sa.Column("case_name", sa.String(length=512), nullable=False),
        sa.Column("module", sa.String(length=255), nullable=True),
        sa.Column("result", sa.String(length=16), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_type", sa.String(length=128), nullable=True),
        sa.Column("error_message", sa.String(length=4096), nullable=True),
        sa.Column("log_url", sa.String(length=2048), nullable=True),
        sa.Column("screenshot_url", sa.String(length=2048), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_test_case_results_duration_ms_non_negative",
        ),
        sa.CheckConstraint(
            "result IN ('passed', 'failed', 'skipped', 'blocked', 'error')",
            name="ck_test_case_results_result",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["test_runs.run_id"],
            name="fk_test_case_results_run_id_test_runs",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_test_case_results_case_id", "test_case_results", ["case_id"])
    op.create_index("ix_test_case_results_module", "test_case_results", ["module"])
    op.create_index("ix_test_case_results_result", "test_case_results", ["result"])
    op.create_index("ix_test_case_results_run_id", "test_case_results", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_test_case_results_run_id", table_name="test_case_results")
    op.drop_index("ix_test_case_results_result", table_name="test_case_results")
    op.drop_index("ix_test_case_results_module", table_name="test_case_results")
    op.drop_index("ix_test_case_results_case_id", table_name="test_case_results")
    op.drop_table("test_case_results")

    op.drop_index("ix_test_runs_status", table_name="test_runs")
    op.drop_index("ix_test_runs_started_at", table_name="test_runs")
    op.drop_index("ix_test_runs_runner_owner", table_name="test_runs")
    op.drop_index("ix_test_runs_runner_id", table_name="test_runs")
    op.drop_index("ix_test_runs_idempotency_key", table_name="test_runs")
    op.drop_table("test_runs")

    op.drop_table("runners")
