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


def downgrade() -> None:
    op.drop_index("ix_test_case_reports_module", table_name="test_case_reports")
    op.drop_index("ix_test_case_reports_case_id", table_name="test_case_reports")
    op.drop_index("ix_test_case_reports_result", table_name="test_case_reports")
    op.drop_index("ix_test_case_reports_runner_id", table_name="test_case_reports")
    op.drop_index("ix_test_case_reports_runner_owner", table_name="test_case_reports")
    op.drop_index("ix_test_case_reports_started_at", table_name="test_case_reports")
    op.drop_index("ix_test_case_reports_idempotency_key", table_name="test_case_reports")
    op.drop_table("test_case_reports")

    op.drop_table("runners")
